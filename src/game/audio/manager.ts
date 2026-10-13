import {ReactionDirector,type MatchMoment} from '../reactions';
import {busDefaults,musicPack,musicUrl,radioTracks,sceneGain,type Bus,type MusicScene} from './catalogue';

type Deck={element:HTMLAudioElement;gain:GainNode;source:MediaElementAudioSourceNode};
/** One persistent mixer. Route transitions change arrangements, never recreate the audio graph. */
export class AudioManager {
 context?:AudioContext;
 readonly levels={...busDefaults};
 readonly buses={} as Record<Bus,GainNode>;
 effects=true;voices=false;error='';
 private director=new ReactionDirector();
 scene:MusicScene='menu';community=0;private ground='surulere';
 setGround(ground:string){this.ground=ground;}
 private wanted=false;private inMatch=false;private active=false;
 private decks:Deck[]=[];private current=0;private track='';private trackIndex=0;
 private crowd?:GainNode;private ambience?:GainNode;private speaker?:StereoPannerNode;private speakerFilter?:BiquadFilterNode;
 private noise?:AudioBuffer;private voiceSource?:AudioBufferSourceNode;private priority=0;private request=0;private lastVoiceEvent='';
 private buffers=new Map<string,Promise<AudioBuffer>>();private lastVoice=-100;private lastVariants=new Map<string,number>();
 private stepPhase=0;
 private atmosphereTime=0;private stepTime=0;private trafficTime=0;private duckUntil=0;private mixTime=0;
 onChange:()=>void=()=>{};
 get music(){return this.decks[this.current]?.element;}
 get playing(){return this.wanted&&this.context?.state==='running'&&!!this.music&&!this.music.paused;}
 get title(){return [...radioTracks,...musicPack.menu,...musicPack.ambient,...musicPack.results].find(t=>t.id===this.track)?.title??'Lagos Street Radio';}
 get volume(){return this.levels.music;}set volume(v:number){this.setBus('music',v);}
 get effectsVolume(){return this.levels.sfx;}set effectsVolume(v:number){this.setBus('sfx',v);}
 get voiceVolume(){return this.levels.commentary;}set voiceVolume(v:number){this.setBus('commentary',v);}
 constructor(){
  try{const saved=JSON.parse(localStorage.getItem('lagos-audio-buses')||'{}');for(const bus of Object.keys(this.levels) as Bus[])if(typeof saved[bus]==='number')this.levels[bus]=Math.max(0,Math.min(1,saved[bus]));this.effects=localStorage.getItem('lagos-effects')!=='off';this.voices=false;}catch{}
  document.addEventListener('visibilitychange',()=>this.syncPlayback());
 }
 private hostPaused=false;private matchPaused=false;
 setMatchPaused(paused:boolean){if(paused&&!this.matchPaused)this.stopReactions();this.matchPaused=paused;}
 setHostPaused(paused:boolean){if(paused)this.stopReactions();this.hostPaused=paused;this.syncPlayback();}
 private syncPlayback(){
  if(this.hostPaused||document.hidden){this.stopReactions();this.request++;this.voiceSource?.stop();this.voiceSource=undefined;this.priority=0;void this.context?.suspend().catch(()=>{});this.decks.forEach(d=>d.element.pause());}
  else if(this.context){void this.context.resume().then(()=>{if(this.hostPaused||document.hidden){this.syncPlayback();return;}if(this.wanted)void this.music?.play().catch(()=>{});}).catch(()=>{});}
 }
 async unlock(){
  if(this.hostPaused||document.hidden)return;
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
 async play(){await this.unlock();this.wanted=true;this.applyLevels();this.error='';try{await this.arrange();try{localStorage.setItem('lagos-music-enabled','on');}catch{}}catch{this.wanted=false;this.applyLevels();this.error='Tap music to enable audio.';}this.onChange();}
 async toggle(){if(this.wanted){this.wanted=false;this.applyLevels();this.fadeDecks();try{localStorage.setItem('lagos-music-enabled','off');}catch{}}else await this.play();this.onChange();}
 async firstInteraction(){try{if(localStorage.getItem('lagos-music-enabled')==='off')return;}catch{}if(!this.wanted)await this.play();}
 setVolume(value:number){this.setBus('music',value);}
 setBus(bus:Bus,value:number){this.levels[bus]=Math.max(0,Math.min(1,value));this.applyLevels();try{localStorage.setItem('lagos-audio-buses',JSON.stringify(this.levels));}catch{}this.onChange();}
 private applyLevels(){if(!this.context)return;for(const bus of Object.keys(this.levels) as Bus[]){let value=this.levels[bus];if(bus==='music'&&!this.wanted)value=0;if(bus==='sfx'&&!this.effects)value=0;if((bus==='commentary'||bus==='players')&&!this.voices)value=0;this.buses[bus].gain.setTargetAtTime(value,this.context.currentTime,.04);}}
 setEffects(enabled:boolean){this.effects=enabled;this.applyLevels();try{localStorage.setItem('lagos-effects',enabled?'on':'off');}catch{}this.onChange();}
 setVoices(enabled:boolean){enabled=false;this.voices=false;if(!enabled){this.request++;this.voiceSource?.stop();}this.applyLevels();try{localStorage.setItem('lagos-voices',enabled?'on':'off');}catch{}this.onChange();}
 setMatchActive(active:boolean){if(!active)this.stopReactions();const entering=active&&!this.inMatch;this.inMatch=active;if(entering)this.director.reset();if(entering||(!active&&!['fulltime','late-winner'].includes(this.lastVoiceEvent))){this.request++;this.voiceSource?.stop();this.voiceSource=undefined;this.priority=0;}if(!active)this.active=false;this.setScene(active?'intro':'menu');}
 setScene(scene:MusicScene){if(scene===this.scene)return;this.scene=scene;if(this.wanted)void this.arrange().catch(()=>{this.error='Music track unavailable.';this.onChange();});}
 setCommunity(value:number){this.community=value;this.ui();}
 private async arrange(){
  if(!this.context||!this.wanted||this.hostPaused||document.hidden)return;
  const menu=this.scene==='menu'||this.scene==='selection'||this.scene==='intro';
  const result=this.scene==='win'||this.scene==='loss'||this.scene==='draw';
  const item=menu?radioTracks[this.trackIndex%radioTracks.length]:result?musicPack.results.find(t=>t.id===this.scene)!:radioTracks[this.community%radioTracks.length];
  if(this.track===item.id&&!this.music?.paused){this.music!.loop=!menu;return;}
  if(this.track===item.id){await this.music!.play();if(this.hostPaused||document.hidden){this.syncPlayback();return;}this.mix();return;}
  this.track=item.id;const next=1-this.current,deck=this.decks[next],old=this.decks[this.current];this.current=next;
  deck.element.src='url' in item?item.url:musicUrl('results',item.id);deck.element.loop=!menu;
  await deck.element.play();if(this.hostPaused||document.hidden){this.syncPlayback();return;}if(this.decks[this.current]!==deck)return;
  const t=this.context.currentTime;old.gain.gain.cancelScheduledValues(t);old.gain.gain.setTargetAtTime(0,t,.35);deck.gain.gain.cancelScheduledValues(t);deck.gain.gain.setTargetAtTime(sceneGain[this.scene],t,.35);
  const oldUrl=old.element.src;setTimeout(()=>{if(this.decks[this.current]!==old&&old.element.src===oldUrl)old.element.pause();},2000);this.onChange();
 }
 private fadeDecks(){if(!this.context)return;const t=this.context.currentTime;this.decks.forEach(d=>d.gain.gain.setTargetAtTime(0,t,.15));setTimeout(()=>{if(!this.wanted)this.decks.forEach(d=>d.element.pause());},700);}
 private mix(x=0,y=0){if(!this.context)return;const t=this.context.currentTime,diegetic=this.scene==='gameplay'||this.scene==='replay',distance=Math.hypot(x+12,y+19);
  const proximity=diegetic?.3+.7/(1+distance/12):1;
  this.decks[this.current]?.gain.gain.setTargetAtTime((this.wanted?sceneGain[this.scene]:0)*proximity*(t<this.duckUntil?.4:1),t,.22);
  this.speaker?.pan.setTargetAtTime(diegetic?Math.max(-.8,Math.min(.8,(-12-x)/25)):0,t,.3);this.speakerFilter?.frequency.setTargetAtTime(diegetic?2200:18000,t,.3);
 }
 update(dt:number,playing:boolean,speed:number,wet=false,x=0,y=0,stride?:number){
  if(!this.context)return;this.active=this.inMatch&&playing;this.mixTime+=dt;if(this.mixTime>.05){this.mixTime=0;this.mix(x,y);}
  this.crowd?.gain.setTargetAtTime(this.inMatch?(playing?(this.ground==='arena'?.20:this.ground==='marina'?.08:.14):.05):0,this.context.currentTime,.5);this.ambience?.gain.setTargetAtTime(this.active?.025:0,this.context.currentTime,.6);
  if(!this.active)return;this.atmosphereTime+=dt;this.stepTime+=dt;this.trafficTime+=dt;
  if(this.atmosphereTime>22)this.atmosphereTime=0;
  if(this.trafficTime>19){this.trafficTime=0;if(this.ground==='surulere')this.horn();}
  const phase=stride===undefined?undefined:Math.floor(stride*2);
  const step=phase===undefined?this.stepTime>Math.max(.18,.55-speed*.033):phase!==this.stepPhase;
  if(this.effects&&speed>1&&step){this.stepTime=0;this.impact(wet?210:110,wet?.06:.035,.09,'sfx');}if(phase!==undefined)this.stepPhase=phase;
 }
 private load(url:string){let pending=this.buffers.get(url);if(!pending){pending=fetch(url).then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer();}).then(b=>this.context!.decodeAudioData(b)).catch(e=>{this.buffers.delete(url);throw e;});this.buffers.set(url,pending);}return pending;}
 async previewCallout(){await this.unlock();await this.recordedCrowd('goal',true);}
 private impact(frequency:number,volume:number,duration:number,bus:Bus='sfx'){
  if(!this.context||!this.noise)return;const ctx=this.context,t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(45,t+duration);gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain).connect(this.buses[bus]);osc.start();osc.stop(t+duration);
  const noise=ctx.createBufferSource(),ng=ctx.createGain();noise.buffer=this.noise;ng.gain.setValueAtTime(volume*1.5,t);ng.gain.exponentialRampToValueAtTime(.0001,t+duration*.7);noise.connect(ng).connect(this.buses[bus]);noise.start();noise.stop(t+duration);
 }
 private horn(){if(!this.context)return;for(const hz of [330,415]){const osc=this.context.createOscillator(),gain=this.context.createGain(),pan=this.context.createStereoPanner(),t=this.context.currentTime;osc.type='triangle';osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.025,t+.05);gain.gain.exponentialRampToValueAtTime(.0001,t+.45);pan.pan.value=-.65;osc.connect(gain).connect(pan).connect(this.buses.environment);osc.start();osc.stop(t+.5);}}
 ui(){if(this.context)this.impact(560,.025,.045,'ui');}
 private stings=new Set<AudioBufferSourceNode>();
 private async sting(kind:'intro'|'goal'){
  if(!this.context||!this.wanted||this.hostPaused||document.hidden)return;const scene=this.scene,generation=this.reactionGeneration;
  try{const buffer=await this.load(musicUrl(kind==='intro'?'intro':'champion',kind==='intro'?musicPack.intro[this.community%2].id:'ground-owner'));if(!this.context||!this.wanted||scene!==this.scene||generation!==this.reactionGeneration||this.hostPaused||this.matchPaused||document.hidden)return;
   const source=this.context.createBufferSource(),gain=this.context.createGain(),t=this.context.currentTime;source.buffer=buffer;gain.gain.setValueAtTime(.5,t);gain.gain.setTargetAtTime(.0001,t+(kind==='intro'?2:1),.35);source.connect(gain).connect(this.buses.music);this.stings.add(source);source.onended=()=>{this.stings.delete(source);source.disconnect();gain.disconnect();};source.start();source.stop(t+4);this.duckUntil=t+3;
  }catch{}
 }
 react(moment:MatchMoment){if(this.director.accept(moment))this.cue(moment.kind);}
 private reactionSources=new Set<AudioBufferSourceNode>();
 private reactionGeneration=0;private lastReaction=-100;
 private async recordedCrowd(event:string,preview=false){
  if(!this.context||this.hostPaused||this.matchPaused||document.hidden||(!preview&&!this.inMatch))return;
  const positive=['goal','late-winner','late-lead','big-save','nutmeg','save'].includes(event);
  const near=['post','miss','near-goal','hard-tackle'].includes(event);
  if(!positive&&!near)return;
  if(!preview&&this.context.currentTime-this.lastReaction<.65)return;this.lastReaction=this.context.currentTime;
  const generation=this.reactionGeneration, ctx=this.context;
  const play=async(name:string,volume:number,duration:number)=>{
   try{const buffer=await this.load(`/assets/audio/crowd/${name}.mp3`);
    if(generation!==this.reactionGeneration||this.hostPaused||this.matchPaused||document.hidden||(!preview&&!this.inMatch)||ctx.state!=='running')return;
    if(this.reactionSources.size>=6)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner(),t=ctx.currentTime;
    source.buffer=buffer;pan.pan.value=(Math.random()-.5)*.5;
    const length=Math.min(buffer.duration,duration),offset=buffer.duration>length?Math.random()*(buffer.duration-length):0;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.08);gain.gain.setValueAtTime(volume,t+Math.max(.09,length-.35));gain.gain.linearRampToValueAtTime(0,t+length);
    source.connect(gain).connect(pan).connect(this.buses.crowd);this.reactionSources.add(source);
    source.onended=()=>{this.reactionSources.delete(source);source.disconnect();gain.disconnect();pan.disconnect();};source.start(t,offset,length);
   }catch{/* Missing recordings stay silent, never fall back to synthetic speech. */}
  };
  if(near)await play('gasp',event==='near-goal'?.5:.28,1.6);
  else await Promise.all([play('applause',.32,event==='goal'?4:2.2),...(['goal','late-winner','late-lead'].includes(event)?[play('cheer',.38,4.5)]:[])]);
 }
 private stopReactions(){this.reactionGeneration++;for(const source of this.stings)source.stop();this.stings.clear();for(const source of this.reactionSources)source.stop();this.reactionSources.clear();}

 cue(event:string){
  if(this.hostPaused||this.matchPaused||document.hidden)return;
  if(!this.context||this.context.state!=='running'){void this.unlock().then(()=>{if(this.context?.state==='running')this.cue(event);}).catch(()=>{});return;}
  const ctx=this.context,t=ctx.currentTime;
  if(this.effects){if(event==='post')this.impact(880,.16,.32);if(event==='goal')this.impact(90,.12,.22);if(['pass','shot','tackle'].includes(event))this.impact(event==='shot'?160:110,event==='shot'?.3:.18,.16);
   if(['kickoff','fulltime','foul','penalty'].includes(event))for(let i=0;i<(event==='fulltime'?3:1);i++){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=2050;gain.gain.setValueAtTime(.0001,t+i*.22);gain.gain.linearRampToValueAtTime(.065,t+i*.22+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+i*.22+.18);osc.connect(gain).connect(this.buses.sfx);osc.start(t+i*.22);osc.stop(t+i*.22+.2);}}
  void this.recordedCrowd(event);

  if(event==='kickoff')void this.sting('intro');if(event==='goal')void this.sting('goal');
 }
}
