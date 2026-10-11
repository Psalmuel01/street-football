import * as THREE from 'three';
import { prepareCharacterAsset, createCharacter, animateCharacter, characterMotionSource } from '../src/game/character';
import { steer, accelerate } from '../src/game/simulation/Movement';
import { evaluateAnimation } from '../src/game/animation/AnimationGraph';
await prepareCharacterAsset();
const rig=createCharacter('#e1bb45',3),scene=new THREE.Scene();
scene.background=new THREE.Color('#b9b9a9');scene.add(rig.root);
scene.add(new THREE.HemisphereLight('#edf2df','#655c44',2));
const light=new THREE.DirectionalLight('#fff0d0',3);light.position.set(-3,8,4);scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshStandardMaterial({color:'#8b917d',roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
const grid=new THREE.GridHelper(400,400,'#747b67','#7d846f');grid.position.y=.001;scene.add(grid);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,500);
const body={vx:0,vy:0,facingX:1,facingY:0};let elapsed=0,stride=0,previous=performance.now();
const stages=[
 {end:5,label:'Idle → walk',x:1,y:0,speed:1.4},
 {end:10,label:'Walk → jog',x:1,y:0,speed:3},
 {end:16,label:'Jog → sprint',x:1,y:0,speed:9},
 {end:22,label:'90° left cut',x:0,y:-1,speed:7},
 {end:28,label:'90° right cut',x:1,y:0,speed:7},
 {end:35,label:'180° sprint reversal',x:-1,y:0,speed:9},
 {end:41,label:'Brake to idle',x:0,y:0,speed:0},
 {end:48,label:'Idle → sprint',x:1,y:0,speed:9},
 {end:54,label:'Low-speed turns',x:0,y:1,speed:2},
 {end:60,label:'Stop and restart',x:-1,y:0,speed:4},
];
document.querySelector('#restart')!.addEventListener('click',()=>{elapsed=0;stride=0;body.vx=body.vy=0;body.facingX=1;body.facingY=0;rig.root.position.set(0,0,0);});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});renderer.setSize(innerWidth,innerHeight);
function frame(now:number){const dt=Math.min(1/30,(now-previous)/1000);previous=now;elapsed=Math.min(60,elapsed+dt);const stage=stages.find(s=>elapsed<s.end)??{label:'Study complete · review before acceptance',x:0,y:0,speed:0};
 const turnAngle=Math.atan2(Math.sin(Math.atan2(stage.y,stage.x)-Math.atan2(body.facingY,body.facingX)),Math.cos(Math.atan2(stage.y,stage.x)-Math.atan2(body.facingY,body.facingX)));
 const desiredSpeed=elapsed>=54&&elapsed<57?0:stage.speed;
 const direction=steer(body,stage.x,stage.y,dt);accelerate(body,direction.x*desiredSpeed,direction.y*desiredSpeed,dt);
 const speed=Math.hypot(body.vx,body.vy);rig.root.position.x+=body.vx*dt;rig.root.position.z+=body.vy*dt;rig.root.rotation.y=Math.atan2(body.facingX,body.facingY);
 stride=(stride+speed*dt/(1.1+Math.min(1,speed/8)*1.3))%1;
 animateCharacter(rig,elapsed,speed,0,false,null,stride,{...body,receive:0,recovery:0});
 const focus=rig.root.position.clone();camera.position.copy(focus).add(new THREE.Vector3(4.2,2.6,5.7));camera.lookAt(focus.x,1,focus.z);
 const state=evaluateAnimation(speed,null,turnAngle,desiredSpeed===0).state;
 document.querySelector('#label')!.textContent=`${elapsed.toFixed(1)} / 60 s · ${stage.label}`;
 document.querySelector('#metrics')!.textContent=`${characterMotionSource} · ${state} · ${speed.toFixed(2)} m/s · spine ${(rig.bones.spine.rotation.x*180/Math.PI).toFixed(1)}° · plant ${rig.footPlants?.stance.map(s=>s?'■':'□').join(' ')}`;
 renderer.render(scene,camera);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
