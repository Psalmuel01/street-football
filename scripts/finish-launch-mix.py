from pathlib import Path
import subprocess,json,imageio_ffmpeg
R=Path(__file__).resolve().parent.parent;D=R/'artifacts/launch-video';S=D/'source';F=imageio_ffmpeg.get_ffmpeg_exe();B=60/112;duration=49.3

def run(args):
 p=subprocess.run([F,'-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr[-4000:])
run(['-i',S/'film-effects-v2.wav','-i',S/'licensed/crowd-cheer.mp3','-i',S/'licensed/crowd-ambience.mp3','-filter_complex','[1:a]atrim=0:4.5,asetpts=PTS-STARTPTS,highpass=f=180,lowpass=f=7000,afade=t=in:d=0.08,afade=t=out:st=2.7:d=1.8,volume=0.45,adelay=30000:all=1[cheer];[2:a]atrim=0:7,asetpts=PTS-STARTPTS,lowpass=f=2500,afade=t=in:d=0.5,afade=t=out:st=5:d=2,volume=0.06[amb];[0:a][cheer][amb]amix=inputs=3:normalize=0,apad,atrim=0:49.3[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',D/'effects-stem.wav'])
filters='[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.9[m];[1:a]asplit=2[v][key];[2:a]asplit=2[fx][fk];[fk]volume=0.5[fkey];[key][fkey]amix=inputs=2:normalize=0,apad[duck];[m][duck]sidechaincompress=threshold=0.025:ratio=6:attack=8:release=320:makeup=1[bed];[bed][v][fx]amix=inputs=3:normalize=0:duration=first,atrim=0:49.3,loudnorm=I=-16:TP=-1.5:LRA=9,aformat=sample_rates=48000:channel_layouts=stereo[out]'
run(['-i',D/'our-ground-original-score.wav','-i',D/'commentary-stem.wav','-i',D/'effects-stem.wav','-filter_complex',filters,'-map','[out]','-c:a','pcm_s24le',D/'launch-mix-master.wav'])
voices=json.loads((R/'public/assets/audio/voices/native/manifest.json').read_text())['clips']
run(['-i',S/'teaser-score.wav','-i',R/'public'/voices['goal-1']['url'].lstrip('/'),'-i',S/'licensed/crowd-cheer.mp3','-filter_complex','[1:a]volume=1.0,adelay=7500:all=1,apad,atrim=0:17.143,asplit=2[v][key];[0:a][key]sidechaincompress=threshold=0.025:ratio=6:attack=8:release=320[m];[2:a]atrim=0:3,asetpts=PTS-STARTPTS,volume=0.25,afade=t=out:st=1.5:d=1.5,adelay=7800:all=1[c];[m][v][c]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=9[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',S/'teaser-master.wav'])
for tag in ['16x9','9x16']:
 for kind,audio,sec in [('launch-film',D/'launch-mix-master.wav',49.3),('teaser',S/'teaser-master.wav',32*B)]:
  p=D/f'{kind}-{tag}.mp4';temp=p.with_suffix('.new.mp4');run(['-i',p,'-i',audio,'-map','0:v','-map','1:a','-c:v','copy','-af','volume='+('0.88' if kind=='teaser' else '0.90'),'-c:a','aac','-ar','48000','-ac','2','-b:a','256k','-t',sec,'-metadata','comment=Crowd recording: Gregor Quendel, Free Crowd Cheering Sounds, CC BY 4.0; edited. Source: https://opengameart.org/content/free-crowd-cheering-sounds','-movflags','+faststart',temp]);temp.replace(p)
run(['-i',D/'our-ground-original-score.wav','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','aac','-ar','48000','-ac','2','-b:a','256k',D/'our-ground-original-score.m4a'])
print('Main films, teasers, original score and stems exported.')
