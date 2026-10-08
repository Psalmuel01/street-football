import {chromium} from 'playwright';import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:5173');await p.waitForFunction(()=>!document.querySelector('#app').inert);
 assert.deepEqual(await p.locator('.site-header nav .nav').allTextContents(),['Playground','Communities','How to play ']);
 await p.screenshot({path:'artifacts/polish/home.png'});
 await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').filter(r=>r.name.includes('/src/game/simulation.ts')).at(-1).name;const {Match}=await import(url),step=Match.prototype.step;Match.prototype.step=function(dt,input){window.testMatch=this;return step.call(this,dt,input);};});
 await p.locator('#home-training').click();await p.waitForURL('**/#/match');await p.locator('#training-drill').selectOption('through');await p.keyboard.press('KeyK');await p.waitForFunction(()=>window.testMatch.passes[0]===1);assert.equal(await p.evaluate(()=>window.testMatch.training),true);assert.equal(await p.evaluate(()=>window.testMatch.elapsed),0);
 await p.locator('#training-drill').selectOption('finishing');assert.equal(await p.evaluate(()=>window.testMatch.players[3].x),18);await p.keyboard.press('KeyJ');await p.waitForFunction(()=>window.testMatch.shots[0]===1);
 await p.locator('#reset-drill').click();await p.locator('#camera-view').click();assert.equal(await p.locator('#camera-view').innerText(),'WIDE');await p.locator('#camera-view').click();assert.equal(await p.locator('#camera-view').innerText(),'STREET');
 const camera=await p.locator('.camera-tools').boundingBox(),player=await p.locator('#player-tag').boundingBox();assert.ok(camera.x>1000&&camera.y<60&&player.x<100);
 await p.locator('#fullscreen').click();await p.waitForFunction(()=>document.fullscreenElement?.id==='court');await p.locator('#fullscreen').click();await p.waitForFunction(()=>!document.fullscreenElement);
 await p.screenshot({path:'artifacts/polish/practice.png'});
 await p.keyboard.down('ArrowRight');await p.keyboard.down('Shift');await p.waitForTimeout(600);assert.match(await p.locator('.sprint-hint').innerText(),/SPRINTING/);assert.ok(await p.evaluate(()=>Math.hypot(window.testMatch.players[window.testMatch.active].vx,window.testMatch.players[window.testMatch.active].vy)>7));await p.keyboard.up('Shift');await p.keyboard.up('ArrowRight');
 await p.evaluate(async()=>{const {PitchRenderer}=await import('/src/game/renderer.ts');const draw=PitchRenderer.prototype.draw;PitchRenderer.prototype.draw=function(m,dt,replay){window.testPitch=this;return draw.call(this,m,dt,replay);};});
 await p.locator('#camera-view').click();assert.equal(await p.locator('#camera-view').innerText(),'FOLLOW');
 await p.evaluate(()=>{const m=window.testMatch;m.owner=null;m.restartPending=false;m.state='PLAYING';m.ball.x=29.99;m.ball.y=0;m.ball.vx=20;});await p.waitForFunction(()=>!document.querySelector('#replay-banner').hidden);
 for(const [mode,height] of [['follow',5.8],['broadcast',33],['street',3.4]]){
  if(mode!=='follow')await p.locator('#camera-view').click();await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>window.testPitch.cameraMode),mode);
  // A direct replay draw uses the selected mode; no forced cinematic height.
  const y=await p.evaluate(()=>{const r=window.testPitch;r.draw(window.testMatch,2,true);return r.camera.position.y;});assert.ok(Math.abs(y-height)<.02,`${mode}: ${y}`);
 }
 const phone=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await phone.goto('http://localhost:5173/');await phone.waitForFunction(()=>!document.querySelector('#app').inert);assert.equal(await phone.locator('#area-nav').isVisible(),true);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.screenshot({path:'artifacts/polish/phone-home.png'});
 assert.deepEqual(errors,[]);console.log('K through pass, practice drills, sprint speed, right-side camera, fullscreen, and replay camera modes passed.');
}finally{await b.close();}
