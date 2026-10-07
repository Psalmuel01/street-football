import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCharacter, animateCharacter, type CharacterRig } from './character';

/** Ambient activity stays outside the playable court and freezes with a paused match. */
export class StreetLife {
  time = 0;
  walkers: CharacterRig[] = [];
  vehicles: THREE.Group[] = [];
  constructor(scene: THREE.Scene) {
    const box = (parent: THREE.Object3D, x:number,y:number,z:number,w:number,h:number,d:number,color:string,round=false) => {
      const mesh = new THREE.Mesh(round ? new RoundedBoxGeometry(w,h,d,2,.12) : new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.8}));
      mesh.position.set(x,y,z); mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
    };
    box(scene,0,-.02,-29,115,.12,8,'#64645d');
    for(const z of [-22.6,-34]) box(scene,0,.03,z,115,.25,1.5,'#b8ad95');
    for(let x=-54;x<55;x+=7) box(scene,x,.05,-29,2,.02,.12,'#d2cbb5');
    for(let i=0;i<3;i++) {
      const vehicle=new THREE.Group();const yellow=i!==1;
      box(vehicle,0,1.25,0,yellow?5.4:4.5,yellow?2.1:1.4,2.15,yellow?'#d9a629':'#a9b2a3',true);
      box(vehicle,0,1.05,1.085,5.1,.14,.025,'#2b302c');
      box(vehicle,0,1.05,-1.085,5.1,.14,.025,'#2b302c');
      for(const side of [-1,1]) {
        for(let j=0;j<4;j++)box(vehicle,-1.75+j*1.08,1.83,side*1.09,.9,.67,.025,'#365054');
        box(vehicle,2.2,1.2,side*1.18,.2,.23,.2,'#26302c');
      }
      box(vehicle,2.71,1.82,0,.025,.75,1.75,'#38555a');
      box(vehicle,2.73,.91,0,.03,.35,1,'#303933');
      for(const z of [-.78,.78]) box(vehicle,2.73,1.12,z,.04,.25,.32,'#fff0bc');
      box(vehicle,2.78,.56,0,.15,.2,2.2,'#8d9288');
      for(const x of [-1.65,1.65]) for(const z of [-1.08,1.08]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.47,.47,.25,16),new THREE.MeshStandardMaterial({color:'#252924',roughness:.95}));
        wheel.rotation.x=Math.PI/2;wheel.position.set(x,.47,z);vehicle.add(wheel);
        const hub=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.27,12),new THREE.MeshStandardMaterial({color:'#9b9e94',metalness:.6,roughness:.45}));hub.rotation.x=Math.PI/2;hub.position.copy(wheel.position);vehicle.add(hub);
      }
      scene.add(vehicle);this.vehicles.push(vehicle);
    }
    for(let i=0;i<8;i++) {
      const rig=createCharacter(['#c99865','#738c8e','#e3d6b2','#8e665f'][i%4],i+11,false);
      rig.root.scale.multiplyScalar(.96);scene.add(rig.root);this.walkers.push(rig);
    }
    // Vendor canopies and produce crates on the far pavement.
    for(const x of [-29,5,23]) {
      box(scene,x,1,-34,2.4,1,1.1,'#796448');
      box(scene,x,2,-34,.06,4,.06,'#625e4b');
      const canopy=new THREE.Mesh(new THREE.ConeGeometry(2.1,.65,8),new THREE.MeshStandardMaterial({color:x===5?'#7e9b7a':'#c78153',roughness:.9}));canopy.position.set(x,3.6,-34);scene.add(canopy);
      for(let j=0;j<12;j++) {
        const fruit=new THREE.Mesh(new THREE.SphereGeometry(.14,6,5),new THREE.MeshStandardMaterial({color:j%2?'#c5a846':'#829445'}));fruit.position.set(x-.85+(j%6)*.32,1.61,-34+Math.floor(j/6)*.3);scene.add(fruit);
      }
    }
  }
  update(dt:number,paused:boolean) {
    if(!paused)this.time+=dt;
    this.vehicles.forEach((v,i)=>{const direction=i===1?-1:1;v.position.set((((this.time*(3+i*.35)+i*37)%125)-62.5)*direction,0,i===1?-31:-27.3);v.rotation.y=i===1?Math.PI:0;});
    this.walkers.forEach((rig,i)=>{const direction=i%2?1:-1;rig.root.position.set((((this.time*(.8+i*.03)+i*13)%100)-50)*direction,0,i%3===0?-34:-22.3);rig.root.rotation.y=direction*Math.PI/2;animateCharacter(rig,this.time,1.1,i,false,undefined,this.time*1.15+i);});
  }
}
