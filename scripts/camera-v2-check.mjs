import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://localhost:5173/#/setup');await p.waitForFunction(()=>!document.querySelector('#app').inert);await p.locator('#play').click();await p.waitForTimeout(1700);await p.keyboard.press('Space');await p.waitForTimeout(800);
 assert.equal(await p.locator('#camera-view').innerText(),'FOLLOW');await p.locator('#camera-view').click();assert.equal(await p.locator('#camera-view').innerText(),'WIDE');await p.locator('#camera-view').click();assert.equal(await p.locator('#camera-view').innerText(),'STREET');await p.keyboard.down('KeyD');await p.waitForTimeout(1700);await p.keyboard.up('KeyD');await p.screenshot({path:'artifacts/v2/street-camera.png'});await p.keyboard.press('F3');assert.ok(await p.locator('#football-debug').isVisible());await p.screenshot({path:'artifacts/v2/debug.png'});await p.keyboard.press('F3');await p.locator('#camera-view').click();assert.equal(await p.locator('#camera-view').innerText(),'FOLLOW');assert.deepEqual(errors,[]);console.log('Follow, Wide, Street, keyboard movement and development diagnostics passed.');
}finally{await b.close();}
