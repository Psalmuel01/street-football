import * as THREE from 'three';
import type {Conditions} from '../content/conditions';
export class Atmosphere {
  lamps:THREE.SpotLight[]=[];
  bulbs:THREE.Mesh[]=[];
  rain:THREE.LineSegments;
  time=0;condition:Conditions='golden';
  constructor(scene:THREE.Scene){
    for(const x of [-26,26])for(const z of [-20,20]){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,9,8),new THREE.MeshStandardMaterial({color:'#465756',metalness:.4,roughness:.6}));pole.position.set(x,4.5,z);scene.add(pole);
      const bulb=new THREE.Mesh(new THREE.BoxGeometry(1.6,.3,.65),new THREE.MeshStandardMaterial({color:'#dddac1',emissive:'#ffefc8',emissiveIntensity:.2}));bulb.position.set(x,9,z);bulb.rotation.x=z>0?-.4:.4;scene.add(bulb);this.bulbs.push(bulb);
      const lamp=new THREE.SpotLight('#e9f0ff',0,70,.95,.8,1.3);lamp.position.set(x,9,z);lamp.target.position.set(x*.3,0,0);scene.add(lamp,lamp.target);this.lamps.push(lamp);
    }
    const points=[];for(let i=0;i<240;i++){const x=((i*19.37)%64)-32,y=(i*3.17)%16,z=((i*13.13)%42)-21;points.push(x,y,z,x-.13,y-.55,z);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.rain=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#cbdfdf',transparent:true,opacity:.26}));this.rain.visible=false;scene.add(this.rain);
    // Painted, original neighbourhood mural panels along the boundary.
    for(const z of [-19.59,19.59]){
      const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const c=canvas.getContext('2d')!;
      c.fillStyle='#237b78';c.fillRect(0,0,1024,128);
      for(let i=0;i<14;i++){c.fillStyle=['#e4ab38','#cb6953','#689693','#314e69'][i%4];c.beginPath();c.moveTo(i*82-50,128);c.lineTo(i*82+30,0);c.lineTo(i*82+130,128);c.fill();}
      c.fillStyle='#fff1d3';c.font='bold 66px sans-serif';c.textAlign='center';c.fillText('OUR GROUND. OUR PEOPLE.',512,86);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(27,1),new THREE.MeshStandardMaterial({map:texture,roughness:.95}));panel.position.set(z<0?16:-15,.62,z);if(z>0)panel.rotation.y=Math.PI;scene.add(panel);
    }
    // Suspended neighbourhood bunting adds movement and colour beyond the touchline.
    for(let i=0;i<28;i++){
      const x=-32+i*2.3,y=5.8-Math.sin(i/27*Math.PI)*.5;
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([x,y,-22,x+.8,y,-22,x+.4,y-.75,-22],3));geometry.computeVertexNormals();
      scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:['#ebba4c','#4ba6a1','#d27760','#ccc39d'][i%4],side:THREE.DoubleSide,roughness:.9})));
    }
  }
  set(condition:Conditions){this.condition=condition;this.rain.visible=condition==='rain';this.lamps.forEach(l=>l.intensity=condition==='night'?110:condition==='rain'?18:0);this.bulbs.forEach(b=>(b.material as THREE.MeshStandardMaterial).emissiveIntensity=condition==='night'?5:.2);}
  update(dt:number,paused:boolean){if(paused||this.condition!=='rain')return;this.time+=dt;const p=this.rain.geometry.attributes.position;for(let i=0;i<p.count;i+=2){let y=p.getY(i)-dt*12;if(y<0)y=16;p.setY(i,y);p.setY(i+1,y-.55);}p.needsUpdate=true;}
}
