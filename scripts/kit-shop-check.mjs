import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:375,height:812},hasTouch:true});
page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));let owned=false,claims=0;
await page.route('https://lagoslife.app/sdk/vatar-games-v1.js',route=>route.fulfill({contentType:'application/javascript',body:`
 window.__host={pause:()=>{},resume:()=>{}};
 window.Vatar={init:async()=>({player:{id:'t_mock',name:'Mock',avatar:null},mode:'test'}),onPause(fn){__host.pause=fn;return ()=>{};},onResume(fn){__host.resume=fn;return ()=>{};},session:async()=>({session:'mock_session'}),purchases:async()=>[],onPurchase:()=>()=>{},purchase:async()=>({purchaseId:'mock_receipt',productId:'night_court_kits'})};
`}));
await page.route('**/api/entitlements',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({products:owned?['night_court_kits']:[]})}));
await page.route('**/api/claim',r=>{const data=r.request().postDataJSON();assert.equal(data.purchaseId,'mock_receipt');assert.equal(data.session,'mock_session');owned=true;claims++;return r.fulfill({contentType:'application/json',body:JSON.stringify({products:['night_court_kits']})});});
await mkdir('artifacts/lagos-life',{recursive:true});
try{
 await page.route('http://localhost:5174/__kit-check',r=>r.fulfill({contentType:'text/html',body:'<iframe sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms" allow="autoplay; gamepad" src="http://localhost:5174/" style="border:0;width:100%;height:100%"></iframe><style>html,body{margin:0;height:100%}</style>'}));
 await page.goto('http://localhost:5174/__kit-check');
 const frame=page.frames().find(f=>f.parentFrame()&&f.url().includes('localhost:5174'))||await new Promise(resolve=>page.once('framenavigated',resolve));
 try{await frame.waitForFunction(()=>document.querySelector('#buy-kits')&&!document.querySelector('#buy-kits').disabled,{},{timeout:15000});}catch(error){console.log('Frame diagnostic',await frame.locator('body').innerText(),errors);await page.screenshot({path:'artifacts/lagos-life/kit-shop-error.png'});throw error;}
 assert.equal(await frame.locator('#kit-selector-label').isVisible(),false);
 await frame.locator('#buy-kits').scrollIntoViewIfNeeded();
 await page.screenshot({path:'artifacts/lagos-life/kit-pack-preview.png'});
 await frame.locator('#buy-kits').click();
 await frame.waitForFunction(()=>document.querySelector('#buy-kits').textContent==='Kit pack owned');
 assert.equal(claims,1);assert.equal(await frame.locator('#buy-kits').isDisabled(),true);
 await frame.locator('#kit-selector').selectOption('#e7b44b');
 await frame.locator('#restore-kits').click();
 await frame.waitForFunction(()=>!document.querySelector('#restore-kits').disabled);
 assert.equal(await frame.locator('#kit-selector').inputValue(),'#e7b44b');
 await page.screenshot({path:'artifacts/lagos-life/kit-pack-owned.png'});
 await frame.locator('#quick-play').click();
 assert.equal(await frame.locator('#scoreboard').evaluate(e=>e.style.getPropertyValue('--home-kit')),'#e7b44b');
 await frame.waitForTimeout(1600);
 await frame.locator('[data-action=pass]').click();
 await frame.waitForFunction(()=>document.querySelector('#timer').textContent!=='03:00');
 await page.screenshot({path:'artifacts/lagos-life/kit-pack-gold-match.png'});
 assert.deepEqual(errors,[]);
 await writeFile('artifacts/lagos-life/kit-shop-check.json',JSON.stringify({mockSDK:true,realPurchaseVerified:false,claims,cosmeticApplied:true,restoreRetainedSelection:true,errors},null,2));
 console.log('Kit shop UI passed: unowned purchase, one claim, owned selector, restore, gold kit in match, no browser errors.');
}finally{await browser.close();}
