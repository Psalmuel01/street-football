import {chromium} from 'playwright';import {writeFile,readFile} from 'node:fs/promises';
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),out=JSON.parse(await readFile('artifacts/launch-video/source/cinematic.json','utf8'));const dir='artifacts/launch-video/source';
try{for(const shot of ['crowd']){
 const c=await b.newContext({viewport:{width:1920,height:1080},recordVideo:{dir,size:{width:1920,height:1080}}}),p=await c.newPage();await p.goto('http://localhost:5173/#/setup');await p.waitForFunction(()=>!document.querySelector('#app').inert);
 await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/renderer.ts')).name;const {PitchRenderer}=await import(url);const draw=PitchRenderer.prototype.draw;PitchRenderer.prototype.draw=function(...args){if(!this.trailerHook){this.trailerHook=true;const render=this.renderer.render.bind(this.renderer);this.renderer.render=(scene,camera)=>{const shot=window.cinematicShot;if(shot){const t=(performance.now()-window.shotStart)/1000;let pos,look;const player=this.players[3].position,ball=this.ball.position;
 if(shot==='street'){pos=[-18+t*.9,6.5,12-t*.35];look=[2,2,-24];}
 if(shot==='boots'){pos=[player.x+2.5-t*.12,.48,player.z+2.6];look=[ball.x,.35,ball.z];}
 if(shot==='captain'){pos=[player.x+3.8-t*.2,1.55,player.z+4.5-t*.15];look=[player.x,1.25,player.z];}
 if(shot==='crowd'){const q=this.spectators[3].root.position;pos=[q.x+1-t*.2,1.6,q.z+4];look=[q.x,1.15,q.z];}
 if(shot==='night'){pos=[-22+t*1.1,8,18-t*.45];look=[0,1,-10];}
 camera.position.set(...pos);camera.lookAt(...look);this.ring.visible=false;this.receiverRing.visible=false;}
 render(scene,camera);};window.trailerRenderer=this;}return draw.apply(this,args);};});
 if(shot==='night')await p.locator('#conditions').selectOption('night');await p.locator('#play').click();await p.waitForTimeout(1800);
 await p.addStyleTag({content:'#court>*:not(canvas){display:none!important}#radar{display:none!important}'});
 await p.evaluate(shot=>{window.cinematicShot=shot;window.shotStart=performance.now();if(shot==='crowd'){window.trailerRenderer.spectators.forEach((r,i)=>{r.root.position.x=-30+Math.floor(i/2)*3.1;r.root.position.z=i%2?-21.2:21.3;});window.trailerRenderer.react('goal',3);}},shot);
 await p.waitForTimeout(4500);await p.screenshot({path:`${dir}/${shot}.png`});const video=p.video();await c.close();out[shot]={path:await video.path(),seconds:4.5};console.log(shot);
}await writeFile(`${dir}/cinematic.json`,JSON.stringify(out,null,2));}finally{await b.close();}
