from pathlib import Path
import subprocess,json,re,math,random,wave,array
import imageio_ffmpeg
R=Path(__file__).resolve().parent.parent;D=R/'artifacts/launch-video';S=D/'source';F=imageio_ffmpeg.get_ffmpeg_exe();B=60/112
beats=[8,4,4,8,4,4,4,8,8,8,4,8,4,16]
def run(args):
 p=subprocess.run([F,'-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr[-3500:])
def duration(p):
 r=subprocess.run([F,'-i',str(p)],capture_output=True,text=True);m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',r.stderr);return int(m[1])*3600+int(m[2])*60+float(m[3])
# Exact musical cut points rounded cumulatively to the nearest video frame.
ends=[0];count=0
for n in beats:count+=n;ends.append(round(count*B*30)/30)
(D/'music-cue-sheet.json').write_text(json.dumps({'title':'Our Ground','bpm':112,'beat_seconds':B,'cut_times':ends,'kick':55*B,'goal':56*B,'crowd':60*B,'cta':76*B},indent=2))
sr=48000;total=ends[-1];samples=array.array('f',[0])*int((total+1)*sr);random.seed(851)
def add(at,length,kind,level=1):
 for n in range(int(length*sr)):
  t=n/sr;env=(1-t/length)**2
  if kind=='kick':v=.5*math.sin(2*math.pi*(92*t-60*t*t))*math.exp(-t*19)+random.uniform(-.15,.15)*math.exp(-t*60)
  elif kind=='horn':v=.09*(math.sin(2*math.pi*280*t)+math.sin(2*math.pi*350*t))*min(1,t*15)*env
  elif kind=='whistle':v=.1*math.sin(2*math.pi*2400*t+2*math.sin(t*40))*min(1,t*30)*env
  elif kind=='scuff':v=random.uniform(-.11,.11)*env
  elif kind=='impact':v=.3*math.sin(2*math.pi*55*t)*math.exp(-t*9)+random.uniform(-.2,.2)*math.exp(-t*18)
  else:v=random.uniform(-.10,.10)*math.sin(math.pi*t/length)**2
  idx=int(at*sr)+n
  if idx<len(samples):samples[idx]+=v*level
for beat in [8,12,16,24,28,32,36,44,52,60,64,72,76]:add(max(0,beat*B-.11),.19,'whoosh',.65)
for beat in [16,44,55]:add(beat*B,.25,'kick')
for beat in [56,76]:add(beat*B,.6,'impact')
for beat in [17,18.5,20,21.5,45,46.5,48,49.5]:add(beat*B,.09,'scuff',.7)
add(.2,.6,'horn',.7);add(2.7,.3,'horn',.5);add(59.75*B,.42,'whistle',.6)
# Low, filtered engine bed; no claim that synthesized ambience is a field recording.
for n in range(int(8*sr)):
 t=n/sr;samples[n]+=.012*(math.sin(2*math.pi*48*t)+.3*math.sin(2*math.pi*97*t))*(math.sin(math.pi*t/8)**2)
with wave.open(str(S/'film-effects-v2.wav'),'wb') as w:w.setparams((1,2,sr,0,'NONE','not compressed'));w.writeframes(array.array('h',(int(max(-1,min(1,v))*32767) for v in samples)).tobytes())
voices=json.loads((R/'public/assets/audio/voices/native/manifest.json').read_text())['clips'];inputs=[]
for key in ['atmosphere-1','pass-1','goal-1']:inputs+=['-i',R/'public'/voices[key]['url'].lstrip('/')]
# Separate dialogue/effects stems and let their actual envelopes drive the music duck.
run(['-i',S/'film-effects-v2.wav',*inputs,'-filter_complex',f'[1:a]adelay=600:all=1,volume=1.0[a];[2:a]adelay={round(45*B*1000)}:all=1,volume=1.0[b];[3:a]adelay={round(56*B*1000)}:all=1,volume=1.2[c];[a][b][c]amix=inputs=3:duration=longest:normalize=0,apad,atrim=0:{total},aformat=sample_rates=48000:channel_layouts=stereo[v]','-map','[v]','-c:a','pcm_s24le',D/'commentary-stem.wav'])
run(['-i',D/'our-ground-original-score.wav','-i',D/'commentary-stem.wav','-i',S/'film-effects-v2.wav','-filter_complex',f'[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.9[m];[1:a]asplit=2[v][key];[2:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[fx][fk];[fk]volume=0.4[fkey];[key][fkey]amix=inputs=2:normalize=0,apad[duck];[m][duck]sidechaincompress=threshold=0.025:ratio=6:attack=8:release=320:makeup=1[bed];[bed][v][fx]amix=inputs=3:normalize=0:duration=first,atrim=0:{total},loudnorm=I=-16:TP=-1.5:LRA=9,aformat=sample_rates=48000:channel_layouts=stereo[out]','-map','[out]','-c:a','pcm_s24le',D/'launch-mix-master.wav'])
for tag in ['16x9','9x16']:
 parts=[]
 for i in range(len(beats)):
  p=S/f'film-{tag}-{i:02}.mp4';sec=ends[i+1]-ends[i];out=S/f'beat-{tag}-{i:02}.mp4';old=duration(p)
  run(['-i',p,'-vf',f'setpts={sec/old}*(PTS-STARTPTS),fps=30,tpad=stop_mode=clone:stop_duration=0.15,trim=duration={sec},setsar=1','-an','-c:v','libx264','-preset','fast','-crf','18',out]);parts.append(out)
 lst=S/f'beat-{tag}.txt';lst.write_text(''.join(f"file '{p}'\n" for p in parts));run(['-f','concat','-safe','0','-i',lst,'-i',D/'launch-mix-master.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','256k','-t',total,'-movflags','+faststart',D/f'launch-film-{tag}.mp4']);print('Music-led main',tag,flush=True)
 # Teaser keeps a compact build -> strike -> resolution, also cut to the beat.
 picks=[(0,4),(12,4),(44,4),(54,4),(60,2),(72,2),(80,12)];teaser=[]
 for j,(start,length) in enumerate(picks):
  p=S/f'music-teaser-{tag}-{j}.mp4';run(['-ss',start*B,'-i',D/f'launch-film-{tag}.mp4','-t',length*B,'-an','-c:v','libx264','-preset','fast','-crf','18',p]);teaser.append(p)
 tl=S/f'music-teaser-{tag}.txt';tl.write_text(''.join(f"file '{p}'\n" for p in teaser))
 # Use the energetic passage followed by the score's actual final cadence.
 run(['-i',D/'our-ground-original-score.wav','-filter_complex',f'[0:a]asplit=2[a][b];[a]atrim=start={12*B}:end={32*B},asetpts=PTS-STARTPTS[x];[b]atrim=start={80*B}:end={92*B},asetpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=9[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',S/'teaser-score.wav'])
 run(['-f','concat','-safe','0','-i',tl,'-i',S/'teaser-score.wav','-map','0:v','-map','1:a','-t',32*B,'-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','256k','-movflags','+faststart',D/f'teaser-{tag}.mp4']);print('Music-led teaser',tag,flush=True)
