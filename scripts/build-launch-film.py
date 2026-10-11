from pathlib import Path
from PIL import Image, ImageDraw
import subprocess,json,re,math,random,wave,array
import imageio_ffmpeg
R=Path(__file__).resolve().parent.parent;D=R/'artifacts/launch-video';S=D/'source';F=imageio_ffmpeg.get_ffmpeg_exe();B=60/112
clips=json.loads((S/'capture.json').read_text())|json.loads((S/'cinematic.json').read_text())
def run(args):
 p=subprocess.run([F,'-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,text=True)
 if p.returncode:raise RuntimeError(p.stderr[-4000:])
def duration(p):
 r=subprocess.run([F,'-i',str(p)],capture_output=True,text=True);m=re.search(r'Duration: (\d+):(\d+):([\d.]+)',r.stderr);return int(m[1])*3600+int(m[2])*60+float(m[3])
# Keep every image rooted in the current renderer. No cover or promotional artwork.
shots=[('street',8,'LAGOS.','THE GROUND IS CALLING',0,4.3),('boots',4,'','',0,2.14),('captain',4,'LAGOS|STREET FOOTBALL','OUR GROUND. OUR PEOPLE.',0,2.14),('play',8,'5V5. ALL PRIDE.','ACTUAL GAMEPLAY',0,4.28),('communities',4,'REP YOUR AREA.','FOUR COMMUNITIES',0,0),('squad',4,'BUILD YOUR FIVE.','YOUR COLOURS. YOUR PEOPLE.',0,0),('crowd',4,'YOUR PEOPLE|DEY WATCH.','',0,2.14),('night',8,'WHEN THE|LIGHTS COME ON.','THE STREET PLAYS ON.',0,4.28),('play',8,'ONE MORE CHANCE.','KEYBOARD / GAMEPAD / TOUCH',2.4,4.27),('goal',8,'','',0,3.4),('crowd',4,'FOR THE AREA.','',0,2.14),('goal',8,'RUN IT BACK.','REPLAY / SLOW MOTION',1.1,2.1),('captain',4,'WHO RUN|LAGOS?','',.5,2.14),('end',16,'LAGOS|STREET FOOTBALL','OUR GROUND. OUR PEOPLE. OUR GAME.',0,0)]
# Original designed transitions/impact sounds, mixed with the shipped music and callouts.
sr=48000;total=sum(s[1]*B for s in shots);samples=array.array('f',[0])*int((total+1)*sr);random.seed(42)
def hit(at,length,kind):
 for n in range(int(length*sr)):
  t=n/sr;env=(1-t/length)**2
  if kind=='kick':v=.4*math.sin(2*math.pi*(80*t-45*t*t))*math.exp(-t*16)+random.uniform(-.10,.10)*math.exp(-t*45)
  elif kind=='horn':v=.07*(math.sin(2*math.pi*280*t)+math.sin(2*math.pi*350*t))*min(1,t*15)*env
  elif kind=='whistle':v=.13*math.sin(2*math.pi*2400*t+2*math.sin(t*40))*min(1,t*30)*env
  else:v=random.uniform(-.15,.15)*math.sin(math.pi*t/length)**2
  idx=int(at*sr)+n
  if idx<len(samples):samples[idx]+=v
cursor=0
for i,s in enumerate(shots):
 if i:hit(max(0,cursor-.13),.23,'whoosh')
 if i in [2,3,8,9,12,13]:hit(cursor,.3,'kick')
 cursor+=s[1]*B
hit(.2,.6,'horn');hit(2.7,.3,'horn')
hit(27.857+.65,.22,'kick');hit(31.3,.6,'whistle')
with wave.open(str(S/'sound-design.wav'),'wb') as w:
 w.setparams((1,2,sr,0,'NONE','not compressed'));w.writeframes(array.array('h',(int(max(-1,min(1,v))*32767) for v in samples)).tobytes())
for vertical in [False,True]:
 W,H=(1080,1920) if vertical else (1920,1080);tag='9x16' if vertical else '16x9';outputs=[]
 def txt(content,size,y,color='e7f5d5',delay=0,center=False,body=False):
  file=S/f'text-{tag}-{len(list(S.glob("text-*.txt")))}.txt';file.write_text(content)
  ft=R/'public/assets/fonts'/('sora-600.ttf' if body else 'teko-600.ttf');x='(w-text_w)/2' if center else '80+100*exp(-10*max(0,t-'+str(delay)+'))'
  return f"drawtext=fontfile='{ft}':textfile='{file}':fontsize={size}:fontcolor=0x{color}:x='{x}':y='{y}+45*exp(-12*max(0,t-{delay}))':alpha='min(1,max(0,(t-{delay})*7))':shadowcolor=black@0.45:shadowx=2:shadowy=3"
 for i,(name,beats,title,sub,start,take) in enumerate(shots):
  sec=round(beats*B*30)/30;filters=[];inputs=[]
  if name=='end':
   inputs=['-loop','1','-i',S/'night.png'];filters=[f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}', 'gblur=sigma=12','eq=brightness=-0.27:saturation=0.65'];
  elif name in clips:
   c=clips[name];begin=max(0,duration(c['path'])-c['seconds'])+start;take=min(take,c['seconds']-start);
   if name=='goal':begin,take=(5.6,1.8) if i==9 else (10.0,1.5)
   inputs=['-ss',begin,'-t',take,'-i',c['path']];filters=[f'setpts={sec/take}*(PTS-STARTPTS)',f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}']
  else:
   inputs=['-loop','1','-i',S/f'{name}.png'];filters=[f'scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x0d2825',f"zoompan=z='1+0.0003*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps=30"]
  if name!='end':
   filters += [f'drawbox=x=0:y=0:w=iw:h={95 if not vertical else 120}:color=0x08251f@0.78:t=fill',txt('LAGOS / STREET FOOTBALL',22,35,body=True)]
   if title:filters += [f'drawbox=x=0:y={H-430 if not vertical else H-470}:w=iw:h=470:color=0x08251f@0.38:t=fill']
   for j,line in enumerate(title.split('|') if title else []):
    if i in [2,12]:
     if j==0:filters.append('drawbox=x=0:y=0:w=iw:h=ih:color=0x08251f@0.30:t=fill')
     filters.append(txt(line,(200 if j==0 else 130) if not vertical else (180 if j==0 else 100),H*.30+j*190,'d5f76b',j*.18,True))
    else:filters.append(txt(line,112 if not vertical else 108,H-((390 if '|' in title else 290) if not vertical else 390)+j*110,'d5f76b',j*.12))
   if sub:filters.append(txt(sub,23 if not vertical else 26,H-88,'9fe1c6',.24,body=True))
   # Fast mint cut on the downbeat, not a dissolve/slideshow transition.
   if i in [2,3,6,8,12]:filters.append('drawbox=x=0:y=0:w=iw:h=ih:color=0xd5f76b:t=fill:enable=lt(t\\,0.034)')
  else:
   filters += [txt('LAGOS',210 if vertical else 180,H*.24,'d5f76b',0,True),txt('STREET FOOTBALL',57 if vertical else 64,H*.24+190,'e7f5d5',.15,True),txt('OUR GROUND. OUR PEOPLE.',30,H*.51,'9fe1c6',.4,True,True),txt('OUR GAME.',40,H*.51+58,'e7f5d5',.6,True),txt('PLAY NOW',94,H*.68,'d5f76b',.8,True),txt('street-football.quikdb.net',48 if vertical else 70,H*.68+130,'ffffff',1,True,True)]
  filters += ['fps=30','setsar=1','format=yuv420p'];out=S/f'film-{tag}-{i:02}.mp4';run([*inputs,'-vf',','.join(filters),'-t',sec,'-an','-c:v','libx264','-preset','fast','-crf','19',out]);outputs.append(out);print(tag,i,name,flush=True)
 concat=S/f'film-{tag}.txt';concat.write_text(''.join(f"file '{p}'\n" for p in outputs));silent=S/f'film-{tag}-silent.mp4';run(['-f','concat','-safe','0','-i',concat,'-c','copy',silent])
 voices=json.loads((R/'public/assets/audio/voices/native/manifest.json').read_text())['clips'];voiceInputs=[]
 for key in ['atmosphere-1','pass-1','goal-1']:voiceInputs+=['-i',R/'public'/voices[key]['url'].lstrip('/')]
 audio="[1:a]atrim=0:50,asetpts=PTS-STARTPTS,volume=0.7,afade=t=in:d=1,afade=t=out:st=46:d=3[m];[2:a]volume=0.7[s];[3:a]volume=1.25,adelay=600:all=1[a];[4:a]volume=1.2,adelay=24000:all=1[b];[5:a]volume=1.4,adelay=29900:all=1[c];[m][s][a][b][c]amix=inputs=5:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=8[out]"
 final=D/f'launch-film-{tag}.mp4';run(['-i',silent,'-ss','8','-i',R/'public/assets/audio/music/menu/mainland-sunshine.m4a','-i',S/'sound-design.wav',*voiceInputs,'-filter_complex',audio,'-map','0:v','-map','[out]','-t',duration(silent),'-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-movflags','+faststart',final]);print('FINAL',final,flush=True)
 # A dedicated 18-second social teaser, with its own held CTA ending.
 picks=[(0,2.1),(6.43,2.14),(23.57,2.14),(28.6,2.14),(38.57,2.14),(42,7.34)]
 teaserParts=[]
 for j,(start,length) in enumerate(picks):
  p=S/f'teaser-{tag}-{j}.mp4';run(['-ss',start,'-i',final,'-t',length,'-an','-c:v','libx264','-preset','fast','-crf','19',p]);teaserParts.append(p)
 lst=S/f'teaser-{tag}.txt';lst.write_text(''.join(f"file '{p}'\n" for p in teaserParts));run(['-f','concat','-safe','0','-i',lst,'-ss','8','-i',R/'public/assets/audio/music/menu/mainland-sunshine.m4a','-map','0:v','-map','1:a','-af','afade=t=out:st=16:d=2,loudnorm=I=-16:TP=-1.5:LRA=8','-t','18','-c:v','copy','-c:a','aac','-ar','48000','-ac','2','-b:a','192k','-movflags','+faststart',D/f'teaser-{tag}.mp4'])
