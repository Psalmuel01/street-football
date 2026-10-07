import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts/fidelity',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/fidelity/video',size:{width:1440,height:900}}});
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:5173/#/setup');await p.waitForFunction(()=>!document.querySelector('#app').inert);
 await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').filter(r=>r.name.includes('/src/game/simulation.ts')).at(-1).name;const {Match}=await import(url);const original=Match.prototype.step;Match.prototype.step=function(dt,input){window.match=this;return original.call(this,dt,input);};});
 await p.locator('#play').click();await p.waitForTimeout(1500);await p.screenshot({path:'artifacts/fidelity/01-kickoff.png'});await p.keyboard.press('Space');await p.waitForTimeout(900);
 // Seed reproducible visual drills, then drive the same live simulation with keyboard controls.
 async function drill(x=0){await p.evaluate(x=>{const m=window.match;m.state='PLAYING';m.restartPending=false;m.owner=3;m.active=3;m.lock=.5;m.passFlight=null;m.bufferedPass=null;for(const q of m.players){q.action=null;q.pendingKick=null;q.cooldown=0;q.receiveTime=0;q.touchTime=0;q.recovery=0;q.vx=q.vy=0;}Object.assign(m.players[3],{x,y:0,facingX:1,facingY:0});Object.assign(m.players[8],{x:x+5,y:2});Object.assign(m.players[9],{x:x+8,y:-3});m.ball.x=x+.64;m.ball.y=0;m.ball.z=0;m.ball.vx=m.ball.vy=m.ball.vz=0;},x);}
 await drill(-7);await p.keyboard.down('KeyD');await p.keyboard.down('ShiftLeft');await p.waitForTimeout(650);await p.screenshot({path:'artifacts/fidelity/02-dribble.png'});await p.keyboard.up('ShiftLeft');await p.keyboard.up('KeyD');
 await drill(0);await p.evaluate(()=>{const m=window.match;m.owner=8;m.lock=0;Object.assign(m.players[8],{x:1.25,y:0});m.ball.x=1.25;m.ball.y=0;});await p.keyboard.press('KeyL');await p.waitForTimeout(80);await p.screenshot({path:'artifacts/fidelity/03-duel.png'});
 await drill(24);await p.evaluate(()=>{window.match.players[5].y=12;});await p.waitForTimeout(600);await p.keyboard.press('KeyJ');await p.waitForTimeout(100);await p.screenshot({path:'artifacts/fidelity/04-shot.png'});
 await p.waitForFunction(()=>document.querySelector('#replay-banner').hidden===false);await p.waitForFunction(()=>Number(document.querySelector('#replay-progress').value)>.72);await p.screenshot({path:'artifacts/fidelity/05-replay.png'});await p.locator('#skip-replay').click();await p.locator('#camera-view').click();await p.waitForTimeout(1200);await p.screenshot({path:'artifacts/fidelity/06-wide.png'});
 await p.locator('#camera-view').click();await p.locator('#camera-view').click();await p.waitForTimeout(1000);
 const timing=await p.evaluate(()=>new Promise(resolve=>{const values=[];let last=performance.now();function f(now){values.push(now-last);last=now;if(values.length<300)requestAnimationFrame(f);else{values.sort((a,b)=>a-b);resolve({medianMs:values[150],p95Ms:values[285]});}}requestAnimationFrame(f);}));
 await p.locator('#pause').click();await p.locator('#resume').click();assert.deepEqual(errors,[]);await writeFile('artifacts/fidelity/performance.json',JSON.stringify(timing,null,2));console.log('Six live-renderer visual drills, replay, pause and camera passed.',timing);await context.close();
 const phone=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});await phone.goto('http://localhost:5173/#/setup');await phone.waitForFunction(()=>!document.querySelector('#app').inert);await phone.locator('#play').click();await phone.waitForTimeout(1700);await phone.locator('[data-action="pass"]').tap();await phone.waitForTimeout(650);await phone.screenshot({path:'artifacts/fidelity/07-phone.png'});
}finally{await browser.close();}
