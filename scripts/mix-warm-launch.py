from pathlib import Path
import subprocess,imageio_ffmpeg,json,shutil
R=Path(__file__).resolve().parent.parent;D=R/'artifacts/launch-video';S=D/'source';F=imageio_ffmpeg.get_ffmpeg_exe()
def run(args):subprocess.run([F,'-v','error','-y',*map(str,args)],check=True)
run(['-i',D/'mainland-glow.wav','-i',D/'commentary-stem.wav','-filter_complex','[0:a]loudnorm=I=-22:TP=-4:LRA=10,aformat=sample_rates=48000:channel_layouts=stereo[m];[1:a]asplit=2[v][key];[m][key]sidechaincompress=threshold=0.025:ratio=5:attack=20:release=450[bed];[bed][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-17:TP=-3:LRA=10[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',D/'warm-mix-master.wav'])
voice=json.loads((R/'public/assets/audio/voices/native/manifest.json').read_text())['clips']['goal-1']['url']
run(['-i',D/'mainland-glow.wav','-i',R/'public'/voice.lstrip('/'),'-filter_complex','[0:a]asplit=2[a][b];[a]atrim=start=8.571:end=19.286,asetpts=PTS-STARTPTS[x];[b]atrim=start=42.857:end=49.3,asetpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=0:a=1,loudnorm=I=-22:TP=-4:LRA=10[m];[1:a]adelay=7500:all=1,apad,atrim=0:17.2,asplit=2[v][key];[m][key]sidechaincompress=threshold=0.025:ratio=5:attack=20:release=450[bed];[bed][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-17:TP=-3:LRA=10[out]','-map','[out]','-ar','48000','-ac','2','-c:a','pcm_s24le',S/'warm-teaser.wav'])
for tag in ['16x9','9x16']:
 for kind,audio in [('launch-film',D/'warm-mix-master.wav'),('teaser',S/'warm-teaser.wav')]:
  source=D/f'{kind}-{tag}-no-music.mp4';out=D/f'{kind}-{tag}-warm.mp4';run(['-i',source,'-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','256k','-shortest','-movflags','+faststart',out]);run(['-i',out,'-f','null','-']);shutil.copyfile(out,D/f'{kind}-{tag}.mp4');print(out.name,flush=True)
run(['-i',D/'mainland-glow.wav','-af','loudnorm=I=-18:TP=-3:LRA=10','-ar','48000','-ac','2','-c:a','aac','-b:a','256k',D/'mainland-glow.m4a'])
p=D/'preview.html';s=p.read_text().replace('-no-music.mp4','-warm.mp4').replace('Commentary and match effects only — no background music','Mainland Glow — warm melodic score, no percussion or metallic effects');p.write_text(s)
