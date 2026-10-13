import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
// Local mock only: never calls the platform or represents sandbox approval.
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://lagoslife.app/sdk/vatar-games-v1.js',route=>route.fulfill({contentType:'application/javascript',body:`
window.__host={pause:()=>{},resume:()=>{}};
window.Vatar={init:async()=>({player:{id:'t_mock',name:'Mock',avatar:null},mode:'test'}),onPause(fn){__host.pause=fn;return ()=>{};},onResume(fn){__host.resume=fn;return ()=>{};}};
`}));
await mkdir('artifacts/lagos-life',{recursive:true});
try{
 await page.setContent('<iframe sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms" allow="autoplay; gamepad" src="http://localhost:5173/#/setup" style="border:0;width:100%;height:100%"></iframe><style>html,body{margin:0;height:100%}</style>');
 const frame=page.frames().find(f=>f.url().includes('localhost:5173'))||await new Promise(resolve=>page.once('framenavigated',resolve));
 await frame.waitForFunction(()=>document.documentElement.dataset.vatarMode==='test');
 assert.equal(await frame.locator('#fullscreen').isVisible(),false);
 assert.equal(await frame.locator('#install-app').count(),0);
 await page.screenshot({path:'artifacts/lagos-life/portrait-setup.png'});
 await frame.locator('#play').click();
 await frame.waitForTimeout(1800);
 await frame.locator('[data-action=pass]').click();
 await frame.waitForFunction(()=>document.querySelector('#timer').textContent!=='03:00');
 await page.screenshot({path:'artifacts/lagos-life/portrait-match.png'});
 await frame.evaluate(()=>window.__host.pause());
 await frame.waitForTimeout(150);
 const timer=await frame.locator('#timer').textContent();
 await frame.waitForTimeout(2100);
 assert.equal(await frame.locator('#timer').textContent(),timer,'host pause must freeze the match clock');
 await frame.evaluate(()=>window.__host.resume());
 await frame.waitForTimeout(2100);
 assert.notEqual(await frame.locator('#timer').textContent(),timer,'host resume must restart the match clock');
 await frame.locator('#pause').click();
 await frame.evaluate(()=>{window.__host.pause();window.__host.resume();});
 assert.equal(await frame.locator('#resume').isVisible(),true,'host resume must preserve manual pause');
 await page.screenshot({path:'artifacts/lagos-life/portrait-pause.png'});
 assert.deepEqual(errors,[]);
 await writeFile('artifacts/lagos-life/local-check.json',JSON.stringify({mockSDK:true,realSandboxVerified:false,viewport:{width:375,height:812},clockFrozen:true,clockResumed:true,manualPausePreserved:true,errors},null,2));
 console.log('Mock frame check passed: portrait, SDK init, pause/resume, manual pause, no browser errors.');
}finally{await browser.close();}
