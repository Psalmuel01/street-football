"""Final override: export only commentary and effects, never a music stem."""
from pathlib import Path
import subprocess, json, shutil
import imageio_ffmpeg
R=Path(__file__).resolve().parent.parent;D=R/'artifacts/launch-video';S=D/'source';F=imageio_ffmpeg.get_ffmpeg_exe()
def run(args):subprocess.run([F,'-v','error','-y',*map(str,args)],check=True)
run(['-i',D/'commentary-stem.wav','-i',D/'effects-stem.wav','-filter_complex','[0:a][1:a]amix=inputs=2:normalize=0,alimiter=limit=0.8:level=false,apad,atrim=0:49.3[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',D/'launch-mix-master.wav'])
voice=json.loads((R/'public/assets/audio/voices/native/manifest.json').read_text())['clips']['goal-1']['url']
run(['-i',R/'public'/voice.lstrip('/'),'-i',S/'licensed/crowd-cheer.mp3','-filter_complex','[0:a]adelay=7500:all=1[v];[1:a]atrim=0:3,asetpts=PTS-STARTPTS,volume=0.25,afade=t=out:st=1.5:d=1.5,adelay=7800:all=1[c];[v][c]amix=inputs=2:normalize=0,alimiter=limit=0.8:level=false,apad,atrim=0:17.2[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',S/'teaser-master.wav'])
for tag in ['16x9','9x16']:
 for kind,stem,sec in [('launch-film',D/'launch-mix-master.wav',49.3),('teaser',S/'teaser-master.wav',17.2)]:
  original=D/f'{kind}-{tag}.mp4';out=D/f'{kind}-{tag}-no-music.mp4'
  run(['-i',original,'-i',stem,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','256k','-t',sec,'-movflags','+faststart',out]);shutil.copyfile(out,original)
  run(['-i',out,'-f','null','-']);print(out.name,flush=True)
p=D/'preview.html';s=p.read_text();a=s.find('<section><h2>Our Ground');b=s.find('</section>',a)
if a>=0:s=s[:a]+s[b+10:]
s=s.replace('Original game soundtrack','Commentary and match effects only — no background music')
for tag in ['16x9','9x16']:
 for kind in ['launch-film','teaser']:s=s.replace(f'{kind}-{tag}.mp4',f'{kind}-{tag}-no-music.mp4')
p.write_text(s)
