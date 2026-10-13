import * as THREE from 'three';
import {grounds,type Ground} from '../content/grounds';
/** Each venue owns its surroundings; yard buildings are hidden outside Surulere. */
export class Venues{
 readonly root=new THREE.Group();
 private variants=new Map<Ground,THREE.Group>();
 constructor(scene:THREE.Scene){
  scene.add(this.root);
  for(const id of Object.keys(grounds) as Ground[]){
   const group=new THREE.Group();this.variants.set(id,group);this.root.add(group);
   const box=(x:number,y:number,z:number,w:number,h:number,d:number,colour:string)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:colour,roughness:.86}));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
   };
   const sign=(text:string,x:number,y:number,z:number,w:number,colour:string)=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=colour;ctx.fillRect(0,0,1024,128);ctx.fillStyle='#fff8dd';ctx.textAlign='center';ctx.font='bold 64px sans-serif';ctx.fillText(text,512,88);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,w/8),new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);group.add(mesh);
   };
   if(id==='marina'){
    // Open water replaces the neighbourhood road and its entire skyline.
    const water=box(0,.035,-61,150,.08,77,'#377e8b');(water.material as THREE.MeshStandardMaterial).roughness=.3;
    for(let i=0;i<20;i++)box(-68+(i*17)%136,.085,-30-i*2.8,7,.015,.055,'#83b5b6');
    box(0,.25,-24,68,.5,4,'#b9ac89');
    for(let x=-30;x<=30;x+=5){box(x,1.2,-25,.12,2,.12,'#ddd5b2');box(x,.25,-34,1,1.4,1,'#6a776f');}
    box(-19,.35,-34,6,.5,16,'#94765a');
    for(let i=0;i<3;i++){const x=-35+i*27;box(x,.65,-43,8,1.1,3,'#ebe6d0');box(x,1.65,-43,3,1.1,2.5,i%2?'#b95442':'#337186');box(x,4.2,-43,.09,7,.09,'#e0d8bc');}
    for(let i=0;i<5;i++){const x=-26+i*13;box(x,1.8,26,11,3.6,4,i%2?'#3d8192':'#b96243');for(let j=0;j<14;j++)box(x-5+j*.75,1.8,28.05,.05,3.4,.06,'#d2ab79');}
    for(const x of [-39,39]){box(x,6,22,.65,12,.65,'#b79a49');box(x-5,12,22,11,.5,.6,'#b79a49');box(x-9,8.8,22,.07,6,.07,'#575f5b');}
    sign('MARINA FIVE · WATERFRONT',0,2.3,-23,24,'#236974');
   }else if(id==='arena'){
    // A continuous bowl, seats, roofline and tall towers replace street scenery.
    for(const z of [-26,26]){
     for(let level=0;level<6;level++)box(0,.65+level*.65,z+Math.sign(z)*level*1.6,68,.5,1.6,'#68746c');
     box(0,8,z+Math.sign(z)*4,73,.35,12,'#344744');
     for(let i=0;i<9;i++)box(-32+i*8,4,z+Math.sign(z)*9,.3,8,.3,'#82978b');
     for(let i=0;i<8;i++)box(-28+i*8,5.4,z+Math.sign(z)*8,7,1.3,.12,i%2?'#daa849':'#287862');
    }
    for(const x of [-37,37]){box(x,2.5,0,5,5,48,'#53655b');box(x,8.1,0,9,.35,60,'#344744');}
    const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.34,.65),new THREE.MeshStandardMaterial({color:'#d7ae58',roughness:.8}),384),dummy=new THREE.Object3D();let index=0;
    for(const z of [-26,26])for(let row=0;row<6;row++)for(let col=0;col<32;col++){dummy.position.set(-31+col*2,.99+row*.65,z+Math.sign(z)*row*1.6);dummy.updateMatrix();seats.setMatrixAt(index++,dummy.matrix);}group.add(seats);
    for(const x of [-35,35])for(const z of [-24,24]){
     box(x,8,z,.4,16,.4,'#718379');const light=box(x,16,z,3,.7,.7,'#e8e8cd');(light.material as THREE.MeshStandardMaterial).emissive.set('#ffefb4');(light.material as THREE.MeshStandardMaterial).emissiveIntensity=1.2;
    }
    sign('LAGOS MATCHDAY ARENA',0,6.2,-32,31,'#173e31');sign('HOME OF THE AREA CUP',0,1.6,-23,24,'#a18437');
   }else{
    for(const x of [-33,33]){box(x,.65,0,1.1,1.3,12,'#b4865e');box(x,1.4,0,1.3,.16,12,'#dec69f');}
   }
  }this.set('surulere');
 }
 set(id:Ground){for(const [key,group] of this.variants)group.visible=key===id;}
}
