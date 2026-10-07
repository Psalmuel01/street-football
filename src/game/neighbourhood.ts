import * as THREE from 'three';
/** Shared geometry and instanced street details; no simulation authority. */
export class Neighbourhood {
 dust:THREE.Points; ages=new Float32Array(64); cursor=0; private time=0;
 constructor(scene:THREE.Scene){
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshStandardMaterial({color:'#7f7157',roughness:1});
  const parts:{p:number[];s:number[]}[]=[];
  const add=(x:number,y:number,z:number,w:number,h:number,d:number)=>parts.push({p:[x,y,z],s:[w,h,d]});
  for(let i=0;i<9;i++){
   const x=-36+i*9,h=5+((i*7)%5)*1.6;
   add(x,h*.62,-35.2,7,.18,2);add(x,h*.62+.65,-34.4,7,.08,.08);
   for(let j=0;j<12;j++)add(x-3.3+j*.6,h*.62+.35,-34.4,.045,.65,.045);
   for(const dx of [-3,3])add(x+dx,h*.62-.6,-35.2,.12,1.2,1.5);
   if(i%2===0){
    const tank=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,1.6,16),new THREE.MeshStandardMaterial({color:'#343a35',roughness:.83}));tank.position.set(x,h+2,-40);scene.add(tank);
    for(const dx of [-.7,.7])for(const dz of [-.7,.7])add(x+dx,h+.6,-40+dz,.09,1.4,.09);
   }
   // Repaired corrugated roofs and stepped parapets break the box silhouettes.
   for(let j=0;j<22;j++)add(x-4+j*.38,h+.15,-40,.045,.09,8);
   add(x,h+.25,-44,8,.45,.17);
  }
  for(const x of [-25,-6,17,29]){add(x,.48,-21.8,3,.15,.7);for(const dx of [-1.1,1.1])add(x+dx,.24,-21.8,.12,.48,.55);}
  const instanced=new THREE.InstancedMesh(boxGeometry,material,parts.length),dummy=new THREE.Object3D();parts.forEach((v,i)=>{dummy.position.fromArray(v.p);dummy.scale.fromArray(v.s);dummy.updateMatrix();instanced.setMatrixAt(i,dummy.matrix);});instanced.castShadow=true;instanced.receiveShadow=true;scene.add(instanced);
  // The audible kiosk speaker lives at the same coordinates as the positional mix.
  const cabinet=new THREE.Mesh(boxGeometry,new THREE.MeshStandardMaterial({color:'#242923',roughness:.8}));cabinet.position.set(-12,.75,-19);cabinet.scale.set(.75,1.5,.5);cabinet.castShadow=true;scene.add(cabinet);
  for(const y of [.45,1.02]){const cone=new THREE.Mesh(new THREE.CylinderGeometry(.25,.23,.045,20),new THREE.MeshStandardMaterial({color:'#111713',roughness:.95}));cone.rotation.x=Math.PI/2;cone.position.set(-12,y,-18.73);scene.add(cone);}
  const radio=document.createElement('canvas');radio.width=512;radio.height=96;const rc=radio.getContext('2d')!;rc.fillStyle='#d9b75d';rc.fillRect(0,0,512,96);rc.fillStyle='#193126';rc.font='bold 36px sans-serif';rc.fillText('AREA RADIO • 106',32,61);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.45),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(radio),roughness:1}));label.position.set(-12,1.9,-18.7);scene.add(label);
  // Layered skyline beyond the near shops.
  for(let i=0;i<18;i++){const mesh=new THREE.Mesh(boxGeometry,new THREE.MeshStandardMaterial({color:i%2?'#8b8a7d':'#a28d76',roughness:1}));mesh.position.set(-70+i*8,5+(i*7%9)*.5,-63-(i%3)*5);mesh.scale.set(6,mesh.position.y*2,7);scene.add(mesh);}
  const wirePoints:THREE.Vector3[]=[];
  for(let x=-32;x<=32;x+=.7){for(const y of [1.2,2.1,3,3.9]){wirePoints.push(new THREE.Vector3(x,y,-19.8),new THREE.Vector3(x+.7,y+.9,-19.8),new THREE.Vector3(x,y+.9,-19.8),new THREE.Vector3(x+.7,y,-19.8));}}
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wirePoints),new THREE.LineBasicMaterial({color:'#525b51',transparent:true,opacity:.48})));
  const positions=new Float32Array(64*3);positions.fill(-100);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  this.dust=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#d3b78b',size:.12,transparent:true,opacity:.34,depthWrite:false}));scene.add(this.dust);
 }
 update(dt:number,players:{x:number;y:number;vx:number;vy:number;stride:number}[],paused:boolean,wet:boolean){
  if(paused)return;this.time+=dt;const attr=this.dust.geometry.attributes.position as THREE.BufferAttribute;
  for(let i=0;i<64;i++){if(this.ages[i]>0){this.ages[i]-=dt;attr.setY(i,attr.getY(i)+dt*.28);if(this.ages[i]<=0)attr.setY(i,-100);}}
  if(!wet&&this.time>.09){this.time=0;for(const p of players)if(Math.hypot(p.vx,p.vy)>4){const i=this.cursor++%64;this.ages[i]=.4;attr.setXYZ(i,p.x-Math.sin(p.stride*6.28)*.15,.13,p.y);}}
  attr.needsUpdate=true;
 }
}
