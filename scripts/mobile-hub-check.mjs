import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
await mkdir('artifacts/mobile-hub',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small',320,568],['landscape',844,390]]){
 const p=await browser.newPage({viewport:{width,height},hasTouch:width<900,isMobile:width<900});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:5173');await p.waitForFunction(()=>!document.querySelector('#app').inert);
 await p.locator('#install-app').click();await p.locator('.install-dialog').waitFor();await p.locator('.install-done').click();
 for(const route of ['home','clubs','squad','setup']){await p.evaluate(r=>location.hash='/'+r,route);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${route} overflow`);}
 await p.evaluate(()=>location.hash='/home');await p.locator('#home-training').click();await p.waitForURL('**/#/match');await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').find(r=>r.name.includes('/src/game/renderer.ts')).name;const {PitchRenderer}=await import(url);const draw=PitchRenderer.prototype.draw;PitchRenderer.prototype.draw=function(...args){window.testRenderer=this;return draw.apply(this,args);};});await p.waitForFunction(()=>!!window.testRenderer);
 await p.locator('#zoom-in').click();assert.ok(await p.evaluate(()=>window.testRenderer.cameraZoom<1));await p.locator('#zoom-out').click();assert.equal(await p.evaluate(()=>window.testRenderer.cameraZoom),1);
 const label=await p.locator('#player-tag').boundingBox();assert.ok(label.height<110,`${name} player label stretches`);
 const toolbar=await p.locator('.camera-tools').boundingBox();assert.ok(toolbar.y>height-90&&toolbar.x+toolbar.width<=width,`${name} bottom toolbar`);
 if(width<900){const face=await p.locator('.touch-actions').boundingBox();assert.ok(face.y+face.height<=toolbar.y,`${name} controls overlap`);}
 await p.screenshot({path:`artifacts/mobile-hub/${name}-match.png`});await p.locator('#pause').click();await p.locator('#resume').waitFor();
 for(const id of ['resume','manage-paused','setup']){const r=await p.locator('#'+id).boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width,`${name} ${id} clipped`);}
 await p.screenshot({path:`artifacts/mobile-hub/${name}-pause.png`});await p.locator('#resume').click();assert.equal(await p.locator('#match-overlay').isVisible(),false);
 await p.evaluate(()=>document.querySelector('#court').requestFullscreen=undefined);await p.locator('#fullscreen').click();await p.locator('#view-status').waitFor();assert.deepEqual(errors,[]);await p.close();
 }
 const ctx=await browser.newContext();const p=await ctx.newPage();await p.goto('http://localhost:4173');await p.waitForFunction(()=>!document.querySelector('#app').inert);await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await p.locator('#install-app').click();await p.locator('.install-dialog').waitFor();await p.locator('.install-done').click();await ctx.setOffline(true);await p.reload();await p.waitForFunction(()=>!document.querySelector('#app').inert);await p.evaluate(()=>location.hash='/home');await p.locator('#home-training').waitFor();await p.locator('#home-training').click();await p.locator('#pause').waitFor();console.log('4 viewport sizes: menus, pause/resume, control spacing, fullscreen fallback. Production installation guide and offline game boot passed.');
}finally{await browser.close();}
