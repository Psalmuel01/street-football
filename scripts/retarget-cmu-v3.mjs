import * as T from 'three';
import {readFileSync,writeFileSync} from 'node:fs';
const D=Math.PI/180;
const layout=[['pelvis','',0,.96,0],['spine','pelvis',0,.18,0],['chest','spine',0,.27,0],['neck','chest',0,.2,0],['head','neck',0,.11,0],['armL','chest',-.255,.105,0],['elbowL','armL',0,-.285,0],['handL','elbowL',0,-.245,0],['armR','chest',.255,.105,0],['elbowR','armR',0,-.285,0],['handR','elbowR',0,-.245,0],['legL','pelvis',-.105,-.005,0],['kneeL','legL',0,-.44,0],['footL','kneeL',0,-.425,.025],['legR','pelvis',.105,-.005,0],['kneeR','legR',0,-.44,0],['footR','kneeR',0,-.425,.025]];
function read(subject){const asf=readFileSync(`tools/motion-review/cmu-source/${subject}.asf`,'utf8'),amc=readFileSync(`tools/motion-review/cmu-source/${subject}_01.amc`,'utf8');const bones={};
 for(const block of asf.split(':bonedata')[1].split(':hierarchy')[0].split(/\bbegin\b/).slice(1)){const field=name=>block.match(new RegExp(`\\b${name}\\s+([^\\r\\n]+)`))?.[1].trim();const name=field('name');const axis=field('axis').split(/\s+/).slice(0,3).map(Number);bones[name]={direction:new T.Vector3(...field('direction').split(/\s+/).map(Number)),length:Number(field('length')),axis:new T.Quaternion().setFromEuler(new T.Euler(...axis.map(v=>v*D),'ZYX')),dof:(field('dof')||'').split(/\s+/).filter(Boolean)};}
 const hierarchy=asf.split(':hierarchy')[1].split(/\r?\n/).map(s=>s.trim().split(/\s+/)).filter(s=>bones[s[0]]||s[0]==='root');const frames=[];let frame;
 for(const line of amc.split(/\r?\n/)){if(/^\d+$/.test(line.trim())){frame={};frames.push(frame);}else if(frame){const [name,...values]=line.trim().split(/\s+/);if(name==='root'||bones[name])frame[name]=values.map(Number);}}
 return {bones,hierarchy,frames};}
const mapping={spine:'lowerback',chest:'upperback',neck:'lowerneck',head:'head',armL:'lhumerus',elbowL:'lradius',handL:'lhand',armR:'rhumerus',elbowR:'rradius',handR:'rhand',legL:'lfemur',kneeL:'ltibia',footL:'lfoot',legR:'rfemur',kneeR:'rtibia',footR:'rfoot'};
function pose(source,frame){const root=frame.root;const orientation=new T.Quaternion().setFromEuler(new T.Euler(root[3]*D,root[4]*D,root[5]*D,'ZYX'));const world={root:orientation},directions={};
 for(const [parent,...children] of source.hierarchy)for(const name of children){const b=source.bones[name],values=frame[name]||[],angles=[0,0,0];b.dof.forEach((d,i)=>angles['xyz'.indexOf(d[1])]=values[i]||0);const rotation=new T.Quaternion().setFromEuler(new T.Euler(...angles.map(v=>v*D),'ZYX'));world[name]=world[parent].clone().multiply(b.axis).multiply(rotation).multiply(b.axis.clone().invert());directions[name]=b.direction.clone().applyQuaternion(world[name]);directions[name].x*=-1;}
 const rotations={},global={},positions={};
 // Simulation owns yaw/travel. Captured pelvis pitch/roll retains human weight transfer.
 const pelvis=new T.Quaternion(orientation.x,-orientation.y,-orientation.z,orientation.w);const e=new T.Euler().setFromQuaternion(pelvis,'YXZ');e.y=0;global.pelvis=new T.Quaternion().setFromEuler(e);rotations.pelvis=global.pelvis.toArray();positions.pelvis=new T.Vector3(0,0,0);
 for(const [name,parent,x,y,z] of layout.slice(1)){const dir=directions[mapping[name]];const axis=name.startsWith('foot')?new T.Vector3(0,0,1):['spine','chest','neck','head'].includes(name)?new T.Vector3(0,1,0):new T.Vector3(0,-1,0);global[name]=new T.Quaternion().setFromUnitVectors(axis,dir.clone().normalize());rotations[name]=global[parent].clone().invert().multiply(global[name]).toArray();positions[name]=new T.Vector3(x,y,z).applyQuaternion(global[parent]).add(positions[parent]);}
 // Preserve captured root height; a single cycle calibration follows below.
 const low=Math.min(positions.footL.y,positions.footR.y);const scale=.865/(source.bones.lfemur.length+source.bones.ltibia.length);return {rotations,position:[0,root[1]*scale,0],footLow:low};}
function loop(source,start,minLength,maxLength){let best={error:Infinity,length:minLength};const a=pose(source,source.frames[start]);
 for(let length=minLength;length<=maxLength&&start+length<source.frames.length;length++){const b=pose(source,source.frames[start+length]);let error=0;for(const name of ['legL','legR','kneeL','kneeR','armL','armR'])error+=new T.Quaternion(...a.rotations[name]).angleTo(new T.Quaternion(...b.rotations[name]))**2;error+=Math.abs(a.position[1]-b.position[1])*5;if(error<best.error)best={error,length};}
 const duration=best.length/120,times=[],poses=[];for(let i=0;i<=best.length;i+=2){times.push(i/120);poses.push(pose(source,source.frames[start+i]));}if(times.at(-1)<duration){times.push(duration);poses.push(pose(source,source.frames[start+best.length]));}
 // A single ground calibration retains the actor's vertical excursion and airborne stride.
 const groundBias=.09-Math.min(...poses.map(p=>p.position[1]+p.footLow));
 for(const pose of poses)pose.position[1]+=groundBias;
 // A brief seam blend closes the sampled capture into an in-place cycle, not a generated gait.
 for(let i=0;i<poses.length;i++){const f=Math.max(0,(times[i]/duration-.85)/.15);if(!f)continue;for(const [name]of layout){const q=new T.Quaternion(...poses[i].rotations[name]).slerp(new T.Quaternion(...poses[0].rotations[name]),f);poses[i].rotations[name]=q.toArray();}poses[i].position[1]+=(poses[0].position[1]-poses[i].position[1])*f;}
 const tracks=layout.map(([name])=>({name:`${name}.quaternion`,type:'quaternion',times,values:poses.flatMap(p=>p.rotations[name])}));tracks.push({name:'pelvis.position',type:'vector',times,values:poses.flatMap(p=>p.position)});
 return {duration,tracks,seamError:best.error,frames:[start,start+best.length]};}
const walk=loop(read('35'),80,95,155),run=loop(read('09'),8,55,105);
const clips=[{name:'walk',...walk},{name:'run',...run},{name:'sprint',...run,duration:run.duration*.8,tracks:run.tracks.map(t=>({...t,times:t.times.map(v=>v*.8)}))}];
writeFileSync('src/game/assets/cmu-gaits.json',JSON.stringify({source:'https://mocap.cs.cmu.edu/',author:'CMU Graphics Lab',license:'Free inclusion in commercial products; no direct resale of motion data',reviewStatus:'local-evaluation',clips}));
console.log(clips.map(({name,duration,seamError,frames})=>({name,duration,seamError,frames})));
