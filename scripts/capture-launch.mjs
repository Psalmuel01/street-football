import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const dir='artifacts/launch-video/source';const output={};
try{
const p=await b.newPage({viewport:{width:1920,height:1080}});await p.goto('http://localhost:5173/#/clubs');await p.waitForFunction(()=>!document.querySelector('#app').inert);await p.screenshot({path:`${dir}/communities.png`});await p.evaluate(()=>location.hash='/squad');await p.waitForTimeout(600);await p.screenshot({path:`${dir}/squad.png`});await p.close();
for(const scene of ['play','goal']){
const c=await b.newContext({viewport:{width:1920,height:1080},recordVideo:{dir,size:{width:1920,height:1080}}});const page=await c.newPage();await page.goto('http://localhost:5173/#/setup');await page.waitForFunction(()=>!document.querySelector('#app').inert);
await page.evaluate(async()=>{const u=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/simulation.ts')).name;const {Match}=await import(u),step=Match.prototype.step;Match.prototype.step=function(...args){window.trailerMatch=this;return step.apply(this,args);};});await page.locator('#play').click();await page.waitForTimeout(2000);await page.keyboard.press('Space');await page.waitForTimeout(900);
await page.addStyleTag({content:'#player-tag,#radar,.camera-tools,#commentary-caption,#touch,#training-panel{display:none!important}#scoreboard{opacity:.88}'});
await page.evaluate(scene=>{const m=window.trailerMatch;m.restartPending=false;m.state='PLAYING';m.owner=3;m.active=3;m.manualSelectionUntil=999;m.lock=0;m.passFlight=null;Object.assign(m.players[3],{x:scene==='goal'?23:-5,y:0,vx:0,vy:0,facingX:1,facingY:0,action:null,pendingKick:null,cooldown:0});Object.assign(m.ball,{x:m.players[3].x+.64,y:0,z:0,vx:0,vy:0,vz:0});if(scene==='goal'){Object.assign(m.players[5],{x:28,y:9});for(const q of m.players.slice(6))q.y=12;}},scene);
const begin=Date.now();
if(scene==='play'){await page.keyboard.down('ArrowRight');await page.waitForTimeout(1400);await page.keyboard.down('Shift');await page.waitForTimeout(900);await page.keyboard.up('Shift');await page.keyboard.press('KeyK');await page.waitForTimeout(1800);await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowUp');await page.waitForTimeout(1000);await page.keyboard.up('ArrowUp');await page.waitForTimeout(1400);}
else{await page.waitForTimeout(650);await page.keyboard.press('KeyJ');await page.waitForFunction(()=>window.trailerMatch.score[0]>0,{timeout:10000});await page.waitForTimeout(7200);}
const seconds=(Date.now()-begin)/1000;await page.screenshot({path:`${dir}/${scene}-last.png`});const video=page.video();await c.close();output[scene]={path:await video.path(),seconds};
}
await writeFile(`${dir}/capture.json`,JSON.stringify(output,null,2));console.log(output);
}finally{await b.close();}
