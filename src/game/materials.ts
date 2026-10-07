import * as THREE from 'three';
let fabric:THREE.CanvasTexture|undefined,skin:THREE.CanvasTexture|undefined,hair:THREE.CanvasTexture|undefined;
function grain(kind:'fabric'|'skin'|'hair'){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
 c.fillStyle=kind==='hair'?'#797979':'#eeeeee';c.fillRect(0,0,256,256);let seed=51;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 if(kind==='fabric'){
   for(let y=0;y<256;y+=3){c.strokeStyle=y%2?'#dedede':'#ededed';c.lineWidth=1;c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();}
   for(let x=0;x<256;x+=3){c.fillStyle='#dedede';c.fillRect(x,0,1,256);}
   for(let i=0;i<7;i++){const x=25+i*34;c.fillStyle='#aaa2';c.fillRect(x,0,2,256);}
 } else for(let i=0;i<(kind==='hair'?9000:16000);i++){const shade=Math.floor((kind==='hair'?60:208)+random()*(kind==='hair'?150:47));c.fillStyle=`rgb(${shade},${shade},${shade})`;const r=kind==='hair'?1+random()*2:.4+random()*.7;c.beginPath();c.arc(random()*256,random()*256,r,0,Math.PI*2);c.fill();}
 const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function detailedMaterial(m:THREE.MeshStandardMaterial){
 if(m.name==='kit'||m.name==='shorts'||m.name==='socks'){fabric??=grain('fabric');m.map=fabric;m.bumpMap=fabric;m.bumpScale=.0015;m.roughness=.82;}
 if(m.name==='skin'){skin??=grain('skin');m.map=skin;m.bumpMap=skin;m.bumpScale=.0006;m.roughness=.76;}
 if(m.name==='hair'){hair??=grain('hair');m.map=hair;m.bumpMap=hair;m.bumpScale=.003;m.roughness=.98;}
}
