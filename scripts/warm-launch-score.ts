/** Original percussion-free cue: Mainland Glow. No sampled melodies or artist imitation. */
export {encodeWave} from './launch-score';
export async function renderSoundtrack(){
 const rate=48000,length=49.3,ctx=new OfflineAudioContext(2,Math.ceil(length*rate),rate),master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination);
 const delay=ctx.createDelay(1);delay.delayTime.value=.402;const wet=ctx.createGain(),feedback=ctx.createGain();wet.gain.value=.12;feedback.gain.value=.19;delay.connect(wet).connect(master);delay.connect(feedback).connect(delay);
 const midi=(n:number)=>440*2**((n-69)/12),beat=60/112;
 function note(t:number,n:number,d:number,g:number,pan=0,pad=false){
  const env=ctx.createGain(),filter=ctx.createBiquadFilter(),stereo=ctx.createStereoPanner();filter.type='lowpass';filter.frequency.value=pad?850:1250;filter.Q.value=.3;stereo.pan.value=pan;
  env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(g,t+(pad?.32:.055));env.gain.setTargetAtTime(g*.58,t+.3,.2);env.gain.setTargetAtTime(.00001,t+d, pad?.4:.18);
  filter.connect(env).connect(stereo);stereo.connect(master);if(n>55)stereo.connect(delay);
  for(const [multiple,volume] of [[1,1],[2,.12]]){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=midi(n)*multiple;gain.gain.value=volume;osc.connect(gain).connect(filter);osc.start(t);osc.stop(Math.min(length,t+d+2));}
 }
 const chords=[[49,56,59,63],[45,52,56,59],[52,59,63,66],[47,54,59,63]];
 for(let bar=0;bar<23;bar++){
  const t=bar*4*beat,c=chords[Math.floor(bar/2)%4],lift=bar<4?.65:bar<12?.82:bar<17?1:.72;
  if(bar===22){[49,56,59,63,68].forEach((n,i)=>note(t+i*.025,n,1.0,.038,-.25+i*.12,true));note(t,37,1.1,.14);break;}
  c.forEach((n,i)=>note(t+i*.018,n,beat*3.6,.033*lift,-.5+i*.3,true));
  note(t,c[0]-12,beat*1.2,.12*lift);if(bar>3)note(t+beat*2.5,c[0]-12,beat*.8,.09*lift);
  const pattern=bar%2?[1,2.75]:[.5,1.75,3.25];pattern.forEach((b,i)=>note(t+b*beat,c[(i+1)%4]+12,beat*.5,.047*lift,i%2?.35:-.25));
  if(bar>=4&&bar%4===0)[[0,68],[1.5,71],[2.75,75]].forEach(([b,n])=>note(t+b*beat,n,beat*.9,.038,.15));
 }
 master.gain.setValueAtTime(.65,46);master.gain.linearRampToValueAtTime(0,49.3);
 const audio=await ctx.startRendering(),channels=[audio.getChannelData(0),audio.getChannelData(1)];let peak=0;for(const channel of channels)for(const v of channel)peak=Math.max(peak,Math.abs(v));return {channels,sampleRate:rate,duration:length,peak};
}
