import {ReactionDirector,type MatchMoment} from '../reactions';
import {callouts,captions} from '../../content/commentary';
import {busDefaults,musicPack,musicUrl,radioTracks,sceneGain,type Bus,type MusicScene} from './catalogue';

type Deck={element:HTMLAudioElement;gain:GainNode;source:MediaElementAudioSourceNode};
/** One persistent mixer. Route transitions change arrangements, never recreate the audio graph. */
export class AudioManager {
 context?:AudioContext;
 readonly levels={...busDefaults};
 readonly buses={} as Record<Bus,GainNode>;
 effects=true;voices=true;error='';
 voiceStatus='Native commentary awaiting export';private nativeClips:Record<string,{url:string}>={};private nativeReady:Promise<void>;private director=new ReactionDirector();
 scene:MusicScene='menu';community=0;
 private wanted=false;private inMatch=false;private active=false;
 private decks:Deck[]=[];private current=0;private track='';private trackIndex=0;
 private crowd?:GainNode;private ambience?:GainNode;private speaker?:StereoPannerNode;private speakerFilter?:BiquadFilterNode;
 private noise?:AudioBuffer;private voiceSource?:AudioBufferSourceNode;private priority=0;private request=0;private lastVoiceEvent='';
 private buffers=new Map<string,Promise<AudioBuffer>>();private lastVoice=-100;private lastVariants=new Map<string,number>();
 private atmosphereTime=0;private stepTime=0;private trafficTime=0;private duckUntil=0;private mixTime=0;
 onChange:()=>void=()=>{};onCaption:(text:string)=>void=()=>{};
 get music(){return this.decks[this.current]?.element;}
 get playing(){return this.wanted&&this.context?.state==='running'&&!!this.music&&!this.music.paused;}
 get title(){return [...radioTracks,...musicPack.menu,...musicPack.ambient,...musicPack.results].find(t=>t.id===this.track)?.title??'Lagos Street Radio';}
 get volume(){return this.levels.music;}set volume(v:number){this.setBus('music',v);}
 get effectsVolume(){return this.levels.sfx;}set effectsVolume(v:number){this.setBus('sfx',v);}
 get voiceVolume(){return this.levels.commentary;}set voiceVolume(v:number){this.setBus('commentary',v);}
 constructor(){
  this.nativeReady=fetch('/assets/audio/voices/native/manifest.json').then(r=>r.json()).then(manifest=>{this.nativeClips=manifest.clips??{};const count=Object.keys(this.nativeClips).length,total=Object.keys(captions).length;this.voiceStatus=count===total?'Nigerian Pidgin · Spitch':count?`Native commentary · ${count}/${total} clips`:'Native commentary awaiting export';this.onChange();}).catch(()=>{});
  try{const saved=JSON.parse(localStorage.getItem('lagos-audio-buses')||'{}');for(const bus of Object.keys(this.levels) as Bus[])if(typeof saved[bus]==='number')this.levels[bus]=Math.max(0,Math.min(1,saved[bus]));this.effects=localStorage.getItem('lagos-effects')!=='off';this.voices=localStorage.getItem('lagos-voices')!=='off';}catch{}
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.request++;this.voiceSource?.stop();this.voiceSource=undefined;this.priority=0;void this.context?.suspend();this.decks.forEach(d=>d.element.pause());}else if(this.context){void this.context.resume();if(this.wanted)void this.music?.play().catch(()=>{});}});
 }
 async unlock(){
  if(!this.context){
   const ctx=this.context=new AudioContext();
   for(const bus of Object.keys(this.levels) as Bus[]){const gain=this.buses[bus]=ctx.createGain();gain.gain.value=this.levels[bus];}
   const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-5;limiter.knee.value=4;limiter.ratio.value=12;
   this.buses.master.connect(limiter).connect(ctx.destination);
   for(const bus of Object.keys(this.levels) as Bus[])if(bus!=='master')this.buses[bus].connect(this.buses.master);
   this.speaker=ctx.createStereoPanner();this.speakerFilter=ctx.createBiquadFilter();this.speakerFilter.type='lowpass';this.speakerFilter.frequency.value=18000;this.speakerFilter.connect(this.speaker).connect(this.buses.music);
   for(let i=0;i<2;i++){const element=new Audio();element.preload='auto';element.loop=true;const source=ctx.createMediaElementSource(element),gain=ctx.createGain();gain.gain.value=0;source.connect(gain).connect(this.speakerFilter);this.decks.push({element,source,gain});element.onended=()=>{if(this.decks[this.current].element===element&&this.wanted){this.trackIndex=(this.trackIndex+1)%radioTracks.length;void this.arrange();}};}
   this.noise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const data=this.noise.getChannelData(0);let prior=0;for(let i=0;i<data.length;i++){prior=(prior+(Math.random()*2-1)*.035)/1.035;data[i]=prior*3;}
   const chatter=ctx.createBufferSource(),filter=ctx.createBiquadFilter();chatter.buffer=this.noise;chatter.loop=true;filter.type='bandpass';filter.frequency.value=700;this.crowd=ctx.createGain();this.crowd.gain.value=0;chatter.connect(filter).connect(this.crowd).connect(this.buses.crowd);chatter.start();
   const generator=ctx.createOscillator();generator.type='triangle';generator.frequency.value=51;this.ambience=ctx.createGain();this.ambience.gain.value=0;generator.connect(this.ambience).connect(this.buses.environment);generator.start();
   this.applyLevels();
  }
  if(this.context.state==='suspended')await this.context.resume();
 }
 async play(){await this.unlock();this.wanted=true;this.applyLevels();this.error='';try{await this.arrange();localStorage.setItem('lagos-music-enabled','on');}catch{this.wanted=false;this.applyLevels();this.error='Tap music to enable audio.';}this.onChange();}
 async toggle(){if(this.wanted){this.wanted=false;this.applyLevels();this.fadeDecks();try{localStorage.setItem('lagos-music-enabled','off');}catch{}}else await this.play();this.onChange();}
 async firstInteraction(){try{if(localStorage.getItem('lagos-music-enabled')==='off')return;}catch{}if(!this.wanted)await this.play();}
 setVolume(value:number){this.setBus('music',value);}
 setBus(bus:Bus,value:number){this.levels[bus]=Math.max(0,Math.min(1,value));this.applyLevels();try{localStorage.setItem('lagos-audio-buses',JSON.stringify(this.levels));}catch{}this.onChange();}
 private applyLevels(){if(!this.context)return;for(const bus of Object.keys(this.levels) as Bus[]){let value=this.levels[bus];if(bus==='music'&&!this.wanted)value=0;if(bus==='sfx'&&!this.effects)value=0;if((bus==='commentary'||bus==='players')&&!this.voices)value=0;this.buses[bus].gain.setTargetAtTime(value,this.context.currentTime,.04);}}
 setEffects(enabled:boolean){this.effects=enabled;this.applyLevels();try{localStorage.setItem('lagos-effects',enabled?'on':'off');}catch{}this.onChange();}
 setVoices(enabled:boolean){this.voices=enabled;if(!enabled){this.request++;this.voiceSource?.stop();}this.applyLevels();try{localStorage.setItem('lagos-voices',enabled?'on':'off');}catch{}this.onChange();}
 setMatchActive(active:boolean){const entering=active&&!this.inMatch;this.inMatch=active;if(entering)this.director.reset();if(entering||(!active&&!['fulltime','late-winner'].includes(this.lastVoiceEvent))){this.request++;this.voiceSource?.stop();this.voiceSource=undefined;this.priority=0;}if(!active)this.active=false;this.setScene(active?'intro':'menu');}
 setScene(scene:MusicScene){if(scene===this.scene)return;this.scene=scene;if(this.wanted)void this.arrange().catch(()=>{this.error='Music track unavailable.';this.onChange();});}
 setCommunity(value:number){this.community=value;this.ui();}
 private async arrange(){
  if(!this.context||!this.wanted)return;
  const menu=this.scene==='menu'||this.scene==='selection'||this.scene==='intro';
  const result=this.scene==='win'||this.scene==='loss'||this.scene==='draw';
  const item=menu?radioTracks[this.trackIndex%radioTracks.length]:result?musicPack.results.find(t=>t.id===this.scene)!:radioTracks[this.community%radioTracks.length];
  if(this.track===item.id&&!this.music?.paused){this.music!.loop=!menu;return;}
  if(this.track===item.id){await this.music!.play();this.mix();return;}
  this.track=item.id;const next=1-this.current,deck=this.decks[next],old=this.decks[this.current];this.current=next;
  deck.element.src='url' in item?item.url:musicUrl('results',item.id);deck.element.loop=!menu;
  await deck.element.play();if(this.decks[this.current]!==deck)return;
  const t=this.context.currentTime;old.gain.gain.cancelScheduledValues(t);old.gain.gain.setTargetAtTime(0,t,.35);deck.gain.gain.cancelScheduledValues(t);deck.gain.gain.setTargetAtTime(sceneGain[this.scene],t,.35);
  const oldUrl=old.element.src;setTimeout(()=>{if(this.decks[this.current]!==old&&old.element.src===oldUrl)old.element.pause();},2000);this.onChange();
 }
 private fadeDecks(){if(!this.context)return;const t=this.context.currentTime;this.decks.forEach(d=>d.gain.gain.setTargetAtTime(0,t,.15));setTimeout(()=>{if(!this.wanted)this.decks.forEach(d=>d.element.pause());},700);}
 private mix(x=0,y=0){if(!this.context)return;const t=this.context.currentTime,diegetic=this.scene==='gameplay'||this.scene==='replay',distance=Math.hypot(x+12,y+19);
  const proximity=diegetic?.3+.7/(1+distance/12):1;
  this.decks[this.current]?.gain.gain.setTargetAtTime((this.wanted?sceneGain[this.scene]:0)*proximity*(t<this.duckUntil?.4:1),t,.22);
  this.speaker?.pan.setTargetAtTime(diegetic?Math.max(-.8,Math.min(.8,(-12-x)/25)):0,t,.3);this.speakerFilter?.frequency.setTargetAtTime(diegetic?2200:18000,t,.3);
 }
 update(dt:number,playing:boolean,speed:number,wet=false,x=0,y=0){
  if(!this.context)return;this.active=this.inMatch&&playing;this.mixTime+=dt;if(this.mixTime>.05){this.mixTime=0;this.mix(x,y);}
  this.crowd?.gain.setTargetAtTime(this.inMatch?(playing?.20:.08):0,this.context.currentTime,.5);this.ambience?.gain.setTargetAtTime(this.active?.025:0,this.context.currentTime,.6);
  if(!this.active)return;this.atmosphereTime+=dt;this.stepTime+=dt;this.trafficTime+=dt;
  if(this.atmosphereTime>22){this.atmosphereTime=0;void this.speak('atmosphere');}
  if(this.trafficTime>19){this.trafficTime=0;this.horn();}
  if(this.effects&&speed>1&&this.stepTime>Math.max(.18,.55-speed*.033)){this.stepTime=0;this.impact(wet?210:110,wet?.08:.035,.09,'sfx');}
 }
 private load(url:string){let pending=this.buffers.get(url);if(!pending){pending=fetch(url).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer();}).then(b=>this.context!.decodeAudioData(b)).catch(e=>{this.buffers.delete(url);throw e;});this.buffers.set(url,pending);}return pending;}
 async previewCallout(){await this.unlock();await this.speak('kickoff',true);}
 private async speak(event:string,preview=false){
  if(!this.voices||!this.context||(!preview&&!this.inMatch&&!['fulltime','late-winner'].includes(event)))return;
  const priority=['goal','fulltime','late-winner','late-lead','foul','penalty'].includes(event)?3:['kickoff','substitution','save','big-save','near-goal','miss','nutmeg','free-kick','hard-tackle'].includes(event)?2:1,now=this.context.currentTime;
  if(priority<this.priority||(priority===1&&(this.voiceSource||now-this.lastVoice<7)))return;
  const variants=callouts[event];if(!variants)return;const index=this.director.choose(event,variants.length);
  const name=variants[index],request=++this.request;this.priority=priority;this.lastVoice=now;this.lastVoiceEvent=event;
  try{await this.nativeReady;if(request!==this.request)return;this.onCaption(captions[name]);const clip=this.nativeClips[name];if(!clip){this.priority=0;return;}const buffer=await this.load(clip.url);if(request!==this.request||!this.voices||document.hidden)return;this.voiceSource?.stop();const source=this.context.createBufferSource();source.buffer=buffer;
   const bus:Bus=['pass','shot','tackle','skill'].includes(event)?'players':event==='atmosphere'?'crowd':'commentary';source.connect(this.buses[bus]);this.voiceSource=source;this.duckUntil=this.context.currentTime+buffer.duration+.25;
   source.onended=()=>{if(this.voiceSource===source){this.voiceSource=undefined;this.priority=0;}};source.start();this.onCaption(captions[name]);
  }catch{if(request===this.request){this.priority=0;this.onCaption(captions[name]);}}
 }
 private impact(frequency:number,volume:number,duration:number,bus:Bus='sfx'){
  if(!this.context||!this.noise)return;const ctx=this.context,t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(45,t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain).connect(this.buses[bus]);osc.start();osc.stop(t+duration);
  const noise=ctx.createBufferSource(),ng=ctx.createGain();noise.buffer=this.noise;ng.gain.setValueAtTime(volume*1.5,t);ng.gain.exponentialRampToValueAtTime(.0001,t+duration*.7);noise.connect(ng).connect(this.buses[bus]);noise.start();noise.stop(t+duration);
 }
 private horn(){if(!this.context)return;for(const hz of [330,415]){const osc=this.context.createOscillator(),gain=this.context.createGain(),pan=this.context.createStereoPanner(),t=this.context.currentTime;osc.type='triangle';osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.025,t+.05);gain.gain.exponentialRampToValueAtTime(.0001,t+.45);pan.pan.value=-.65;osc.connect(gain).connect(pan).connect(this.buses.environment);osc.start();osc.stop(t+.5);}}
 ui(){if(this.context)this.impact(560,.025,.045,'ui');}
 private async sting(kind:'intro'|'goal'){
  if(!this.context||!this.wanted)return;const scene=this.scene;
  try{const buffer=await this.load(musicUrl(kind==='intro'?'intro':'champion',kind==='intro'?musicPack.intro[this.community%2].id:'ground-owner'));if(!this.context||!this.wanted||scene!==this.scene)return;
   const source=this.context.createBufferSource(),gain=this.context.createGain(),t=this.context.currentTime;source.buffer=buffer;gain.gain.setValueAtTime(.5,t);gain.gain.setTargetAtTime(.0001,t+(kind==='intro'?2:1),.35);source.connect(gain).connect(this.buses.music);source.start();source.stop(t+4);this.duckUntil=t+3;
  }catch{}
 }
 react(moment:MatchMoment){if(this.director.accept(moment))this.cue(moment.kind);}
 private crowdReaction(event:string){
  if(!this.context||!this.noise||!this.inMatch)return;
  const ctx=this.context,t=ctx.currentTime,positive=['goal','late-lead','late-winner','big-save','nutmeg'].includes(event),negative=['miss','near-goal','foul'].includes(event);
  if(!positive&&!negative&&event!=='hard-tackle'&&event!=='close-match')return;
  const duration=event==='goal'||event==='late-winner'?3.2:1.3,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),pan=ctx.createStereoPanner();source.buffer=this.noise;source.loop=true;
  filter.type='bandpass';filter.Q.value=.7;filter.frequency.setValueAtTime(positive?500:750,t);filter.frequency.exponentialRampToValueAtTime(positive?1300:250,t+duration);
  pan.pan.value=(Math.random()-.5)*.7;gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(positive?.65:.32,t+.14);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
  source.connect(filter).connect(gain).connect(pan).connect(this.buses.crowd);source.start();source.stop(t+duration);
  if(positive)for(let i=0;i<9;i++){const delay=.1+Math.random()*1.3;setTimeout(()=>{if(this.inMatch)this.impact(650+Math.random()*300,.06,.04,'crowd');},delay*1000);}
 }
 cue(event:string){
  if(!this.context||this.context.state!=='running'){void this.unlock().then(()=>this.cue(event));return;}
  const ctx=this.context,t=ctx.currentTime;
  if(this.effects){if(['pass','shot','tackle'].includes(event))this.impact(event==='shot'?160:110,event==='shot'?.3:.18,.16);
   if(['kickoff','fulltime','foul','penalty'].includes(event))for(let i=0;i<(event==='fulltime'?3:1);i++){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=2050;gain.gain.setValueAtTime(.0001,t+i*.22);gain.gain.linearRampToValueAtTime(.065,t+i*.22+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+i*.22+.18);osc.connect(gain).connect(this.buses.sfx);osc.start(t+i*.22);osc.stop(t+i*.22+.2);}}
  this.crowdReaction(event);
  if(event==='goal'||event==='save')for(let i=0;i<14;i++)setTimeout(()=>{if(this.inMatch)this.impact(300+Math.random()*100,.07,.055,'crowd');},i*100);
  if(event==='kickoff')void this.sting('intro');if(event==='goal')void this.sting('goal');void this.speak(event);
 }
}
