import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
await mkdir('artifacts/polish',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/polish/video',size:{width:1280,height:800}}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/#/setup');await page.waitForFunction(()=>!document.querySelector('#app').inert);
 const feet=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');const {createCharacter,animateCharacter}=await import('/src/game/character.ts');
  const rig=createCharacter('#f4c64b',1);let maxSlip=0,lockedFrames=0,minFoot=100;let previous=[null,null],anchors=[null,null];
  for(let frame=0;frame<360;frame++){
   const speed=5,time=frame/60,strideLength=1.1+Math.min(1,speed/8)*1.3;
   rig.root.position.z=time*speed;
   animateCharacter(rig,time,speed,0,false,null,(time*speed/strideLength)%1);
   rig.root.updateMatrixWorld(true);
   for(let i=0;i<2;i++){const foot=rig.bones[i?'footR':'footL'].getWorldPosition(new THREE.Vector3()),anchor=rig.footPlants.points[i];minFoot=Math.min(minFoot,foot.y);
    if(anchor&&anchors[i]&&anchor.distanceTo(anchors[i])<.0001&&previous[i]){maxSlip=Math.max(maxSlip,Math.hypot(foot.x-previous[i].x,foot.z-previous[i].z));lockedFrames++;}
    anchors[i]=anchor?.clone()??null;previous[i]=foot;
   }
  }
  return {maxSlip,lockedFrames,minFoot};
 });
 assert.ok(feet.lockedFrames>80);assert.ok(feet.maxSlip<.035,JSON.stringify(feet));assert.ok(feet.minFoot>0,JSON.stringify(feet));
 await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').filter(r=>r.name.includes('/src/game/simulation.ts')).at(-1).name;const {Match}=await import(url),step=Match.prototype.step;Match.prototype.step=function(dt,input){window.polishMatch=this;return step.call(this,dt,input);};});
 await page.locator('#play').click();await page.waitForURL('**/#/match');await page.waitForTimeout(1700);await page.keyboard.press('Space');await page.waitForTimeout(900);
 const setup=async(foul)=>page.evaluate(foul=>{const m=window.polishMatch;m.state='PLAYING';m.restartPending=false;m.setPiece=null;m.referee=null;m.lock=0;m.owner=8;m.active=3;m.passFlight=null;m.manualSelectionUntil=999;
  for(const p of m.players){Object.assign(p,{x:-24,y:p.team===0?-15:15,vx:0,vy:0,action:null,pendingKick:null,cooldown:10,recovery:0});}
  Object.assign(m.players[3],{x:0,y:0,facingX:1,facingY:0,cooldown:0});Object.assign(m.players[8],{x:foul?.7:1.7,y:0,facingX:foul?1:-1,facingY:0});Object.assign(m.ball,{x:foul?1.55:.9,y:0,z:0,vx:0,vy:0,vz:0});
 },foul);
 await setup(false);await page.keyboard.press('KeyL');await page.waitForTimeout(220);assert.equal(await page.evaluate(()=>window.polishMatch.tackles[0]),1);await page.screenshot({path:'artifacts/polish/clean-slide.png'});await page.waitForTimeout(700);await page.screenshot({path:'artifacts/polish/recovery.png'});
 await setup(true);await page.keyboard.press('KeyL');await page.waitForFunction(()=>window.polishMatch.state==='FOUL');await page.screenshot({path:'artifacts/polish/foul.png'});await page.waitForFunction(()=>window.polishMatch.state==='FREE_KICK');assert.match(await page.locator('#announcement').innerText(),/FREE KICK/);await page.screenshot({path:'artifacts/polish/free-kick.png'});
 await page.evaluate(()=>{const m=window.polishMatch;m.state='PLAYING';m.awardFoul(m.players[8],m.players[3]);});await page.waitForFunction(()=>window.polishMatch.state==='FREE_KICK');assert.match(await page.locator('#announcement').innerText(),/PASS/);await page.keyboard.press('Space');await page.waitForFunction(()=>window.polishMatch.state==='PLAYING');
 await page.keyboard.down('ArrowRight');await page.keyboard.down('Shift');await page.waitForTimeout(1100);await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1100);await page.keyboard.up('ArrowLeft');await page.keyboard.up('Shift');
 await page.locator('#pause').click();await page.locator('#resume').waitFor();await page.screenshot({path:'artifacts/polish/playtest.png'});
 assert.deepEqual(errors,[]);await writeFile('artifacts/polish/checks.json',JSON.stringify({feet,runtimeErrors:errors,checks:['clean slide','visible recovery','foul decision','CPU free kick','human free kick','turning','pause']},null,2));console.log({feet,runtimeErrors:errors});await context.close();
}finally{await browser.close();}
