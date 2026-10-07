import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{
 const page=await browser.newPage();await page.goto('http://localhost:5173');
 await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const C=await import('/src/game/character.ts');await C.prepareCharacterAsset();
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setSize(320,380);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#eff5ff','#887b5a',2.2));const key=new THREE.DirectionalLight('#fff0d5',3);key.position.set(-2,4,5);scene.add(key);const rim=new THREE.DirectionalLight('#91d7cf',2);rim.position.set(3,2,-3);scene.add(rim);
  const camera=new THREE.PerspectiveCamera(27,320/380,.1,20);camera.position.set(.16,1.47,2.75);camera.lookAt(0,1.26,0);
  window.renderPortrait=(color,index,number)=>{const rig=C.createCharacter(color,index,true,number);rig.root.rotation.y=-.1;scene.add(rig.root);C.animateCharacter(rig,0,0,0);renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');scene.remove(rig.root);C.disposeCharacter(rig);return url;};
 });
 await mkdir('public/assets/portraits',{recursive:true});
 const colors=['#f4c64b','#5cc5b5','#e8815d','#b5a3dc'];
 for(let team=0;team<4;team++)for(let i=0;i<9;i++){
  const data=await page.evaluate(([color,i])=>window.renderPortrait(i===0||i===8?'#cc765b':color,i,i===0?1:i===8?20:i+6),[colors[team],i]);await writeFile(`public/assets/portraits/${team}-${i}.png`,Buffer.from(data.split(',')[1],'base64'));
 }
 console.log('36 original in-game character portraits rendered.');
}finally{await browser.close();}
