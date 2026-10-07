/** Original composition: Lagos After Hours. No samples, recordings or borrowed melodies. */
export const soundtrack = {title:'Lagos After Hours',bpm:106,bars:16,beatsPerBar:4};
const midi=(note:number)=>440*2**((note-69)/12);
export async function renderSoundtrack(options:{bpm?:number;bars?:number;seed?:number;variant?:number}={}){
 const composition={...soundtrack,...options},variant=options.variant??0;
 const rate=44100,beat=60/composition.bpm,step=beat/4,length=beat*4*composition.bars;
 // One extra bar captures tails, then folds them into the loop's start.
 const ctx=new OfflineAudioContext(2,Math.ceil((length+beat*4)*rate),rate);
 const master=ctx.createGain();master.gain.value=.8;
 const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=3;compressor.attack.value=.006;compressor.release.value=.12;master.connect(compressor).connect(ctx.destination);
 const delay=ctx.createDelay(1);delay.delayTime.value=beat*.75;const feedback=ctx.createGain();feedback.gain.value=.21;const echoTone=ctx.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=1800;const wet=ctx.createGain();wet.gain.value=.17;delay.connect(echoTone).connect(feedback).connect(delay);echoTone.connect(wet).connect(master);
 let seed=options.seed??260105;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const noiseBuffer=ctx.createBuffer(1,rate,rate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=random()*2-1;
 function tone(t:number,hz:number,duration:number,gain:number,type:OscillatorType='sine',pan=0,bend=0){const osc=ctx.createOscillator(),env=ctx.createGain(),position=ctx.createStereoPanner();osc.type=type;osc.frequency.setValueAtTime(hz,t);if(bend)osc.frequency.exponentialRampToValueAtTime(bend,t+.07);env.gain.setValueAtTime(.00001,t);env.gain.linearRampToValueAtTime(gain,t+.004);env.gain.exponentialRampToValueAtTime(.00001,t+duration);position.pan.value=pan;osc.connect(env).connect(position).connect(master);osc.start(t);osc.stop(t+duration+.01);}
 function noise(t:number,duration:number,gain:number,hz:number,pan:number){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),env=ctx.createGain(),position=ctx.createStereoPanner();source.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=hz;env.gain.setValueAtTime(gain,t);env.gain.exponentialRampToValueAtTime(.00001,t+duration);position.pan.value=pan;source.connect(filter).connect(env).connect(position).connect(master);source.start(t,random()*.3,duration);}
 function pluck(t:number,note:number,gain:number,pan:number){const envelope=ctx.createGain(),filter=ctx.createBiquadFilter(),position=ctx.createStereoPanner();filter.type='lowpass';filter.frequency.setValueAtTime(4800,t);filter.frequency.exponentialRampToValueAtTime(950,t+.32);envelope.gain.setValueAtTime(.00001,t);envelope.gain.linearRampToValueAtTime(gain,t+.005);envelope.gain.exponentialRampToValueAtTime(.00001,t+.45);position.pan.value=pan;filter.connect(envelope).connect(position);position.connect(master);position.connect(delay);for(const [harmonic,volume]of [[1,1],[2,.24],[3,.10]]){const osc=ctx.createOscillator(),level=ctx.createGain();osc.type=harmonic===1?'triangle':'sine';osc.frequency.value=midi(note)*harmonic;level.gain.value=volume;osc.connect(level).connect(filter);osc.start(t);osc.stop(t+.46);}}
 const progressions=[[[57,60,64,67],[53,57,60,64],[55,59,62,65],[52,55,59,62]],[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,69]],[[62,65,69,72],[58,62,65,69],[60,64,67,70],[57,60,64,67]],[[55,59,62,66],[52,55,59,62],[57,60,64,67],[50,54,57,60]]];
 const chords=progressions[variant%4];
 function guitar(t:number,note:number,gain:number,pan:number){
  const period=Math.round(rate/midi(note)),samples=Math.round(rate*.7),buffer=ctx.createBuffer(1,samples,rate),values=buffer.getChannelData(0);
  for(let i=0;i<period;i++)values[i]=(random()*2-1)*gain;
  for(let i=period;i<samples;i++)values[i]=.496*(values[i-period]+values[i-period+(i%period===period-1?0:1)]);
  const source=ctx.createBufferSource(),position=ctx.createStereoPanner();source.buffer=buffer;position.pan.value=pan;source.connect(position).connect(master);position.connect(delay);source.start(t);
 }
 for(let bar=0;bar<composition.bars;bar++){
  const base=bar*beat*4,chord=chords[Math.floor(bar/2)%4],light=bar%8===7,breakdown=bar%24>=16&&bar%24<20;
  for(let s=0;s<16;s++){
   const t=base+s*step+(s%2?.012:0),vel=s%2?.027:.050;
   noise(t,.04,vel,6200,s%2?.32:-.28); // brushed/shaken subdivision
   if((variant%2?[0,3,7,10,14]:[0,6,10,14]).includes(s)&&!(light&&s===14)&&!(breakdown&&s>0)){tone(t,135,.24,.62,'sine',0,48);noise(t,.013,.055,2400,0);}
   if(s===4||s===12){noise(t,.085,.17,1900,.10);tone(t,420,.052,.09,'triangle',.1);tone(t+.005,830,.022,.055,'sine',-.1);}
   if([2,5,9,11,15].includes(s)){tone(t+.008,s%3?230:330,.11,.085,'sine',s%2?-.36:.35,s%3?150:220);noise(t,.018,.026,2300,-.3);}
   if((bar%2===1)&&[3,10,14].includes(s)){tone(t,1150,.035,.045,'sine',.5);tone(t,1725,.025,.015,'sine',.5);}
  }
  for(const [s,offset,duration]of [[0,0,.30],[3,0,.19],[7,7,.22],[10,12,.25],[14,7,.17]])tone(base+s*step,chord[0]-24===0?55:midi(chord[0]-24+offset),duration,.18,'triangle');
  for(const s of [1,6,9,14])chord.forEach((note,i)=>guitar(base+s*step+i*.012,note,.18,-.35));
  if(variant>=2)for(const s of [3,7,11,14])tone(base+s*step,midi(chord[0]-12),.3,.1,"sine",.15,midi(chord[0]-24));
  // A sparse original call-and-response phrase; the second eight bars answer it.
  if(!breakdown&&bar%2===0){const notes=variant%2?[79,76,72,74]:bar%16<8?[76,79,76,74]:[72,76,79,76];[3,7,10,13].forEach((s,i)=>pluck(base+s*step,notes[i]+(bar%4===2?-2:0),.065,.30));}
  else [2,6,11].forEach((s,i)=>pluck(base+s*step,chord[[2,1,0][i]]+12,.060,.25));
  if(light){for(const s of [13,14,15])tone(base+s*step,180+(s-13)*45,.12,.1,'sine',-.25,120+(s-13)*30);}
 }
 const rendered=await ctx.startRendering(),frames=Math.round(length*rate);
 const channels=[new Float32Array(frames),new Float32Array(frames)];let peak=0;
 for(let c=0;c<2;c++){const source=rendered.getChannelData(c);channels[c].set(source.subarray(0,frames));for(let i=frames;i<source.length;i++)channels[c][i-frames]+=source[i];for(const v of channels[c])peak=Math.max(peak,Math.abs(v));}
 const gain=.88/Math.max(.88,peak);for(const channel of channels)for(let i=0;i<channel.length;i++)channel[i]*=gain;
 return {channels,sampleRate:rate,duration:length,peak:Math.min(.88,peak)};
}
export function encodeWave(channels:Float32Array[],sampleRate:number){const frames=channels[0].length,bytes=new ArrayBuffer(44+frames*channels.length*2),view=new DataView(bytes);const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels.length,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*channels.length*2,true);view.setUint16(32,channels.length*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,bytes.byteLength-44,true);let offset=44;for(let i=0;i<frames;i++)for(const channel of channels){view.setInt16(offset,Math.round(Math.max(-1,Math.min(1,channel[i]))*32767),true);offset+=2;}return new Uint8Array(bytes);}
