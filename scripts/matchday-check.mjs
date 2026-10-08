import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try {
 await mkdir('artifacts/matchday',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/#/home');await page.waitForFunction(()=>!document.querySelector('#app').inert);await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'artifacts/matchday/home.png'});
 assert.equal(await page.locator('#match-setup').isVisible(),false);
 await page.locator('#hero-play').click();await page.waitForURL('**/#/clubs');
 await page.locator('[data-team="1"]').click();await page.screenshot({path:'artifacts/matchday/communities.png',fullPage:true});await page.locator('.club-continue button').click();await page.waitForURL('**/#/squad');
 await page.locator('.athlete-card[data-slot="3"]').click();await page.locator('[data-reserve="5"]').click();assert.match(await page.locator('#squad-feedback').innerText(),/Seun replaces Kola/);
 await page.locator('#tactic-select').selectOption('press');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'artifacts/matchday/squad.png',fullPage:true});
 await page.locator('#squad-continue').click();await page.waitForURL('**/#/setup');await page.locator('#play').click();await page.waitForURL('**/#/match');await page.waitForTimeout(1700);
 assert.match(await page.locator('#announcement').innerText(),/YOUR KICK/);await page.keyboard.press('Space');await page.waitForTimeout(1100);await page.screenshot({path:'artifacts/matchday/match.png'});
 await page.locator('#match-squad').click();await page.waitForURL('**/#/squad');await page.locator('.athlete-card[data-slot="3"]').click();await page.locator('[data-reserve="3"]').click();assert.match(await page.locator('#squad-feedback').innerText(),/Kola replaces Seun/);await page.locator('#control-player').click();await page.screenshot({path:'artifacts/matchday/substitution.png',fullPage:true});await page.locator('#squad-continue').click();await page.waitForURL('**/#/match');
 await page.locator('#pause').click();assert.equal(await page.locator('#resume').isVisible(),true);await page.locator('#resume').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const phone=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});phone.on('pageerror',e=>errors.push(e.message));await phone.goto('http://localhost:5173/#/squad');await phone.waitForFunction(()=>!document.querySelector('#app').inert);await phone.evaluate(()=>document.fonts.ready);await phone.screenshot({path:'artifacts/matchday/phone-squad.png',fullPage:true});assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await phone.locator('#squad-continue').click();await phone.locator('#play').click();await phone.setViewportSize({width:844,height:390});await phone.waitForTimeout(1700);await phone.locator('[data-action="pass"]').tap();await phone.waitForTimeout(600);await phone.screenshot({path:'artifacts/matchday/phone-match.png'});
 for(const selector of ['#joystick','[data-action="shoot"]','[data-action="pass"]','#pause','#match-squad','#radar']){const r=await phone.locator(selector).boundingBox();assert.ok(r&&r.x>=0&&r.y>=0&&r.x+r.width<=844&&r.y+r.height<=390,selector);}
 const face=await phone.locator('[data-action="pass"]').boundingBox(),camera=await phone.locator('.camera-tools').boundingBox();
 assert.ok(face&&camera&&(camera.x+camera.width<=face.x||face.x+face.width<=camera.x||camera.y+camera.height<=face.y||face.y+face.height<=camera.y),'camera controls must not overlap Cross');
 assert.deepEqual(errors,[]);console.log('Desktop and phone: routes, starting selection, tactics, kick-off, substitutions, direct player control and pause/resume passed. No runtime errors.');
}finally{await browser.close();}
