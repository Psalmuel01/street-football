import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await page.goto('http://localhost:5173/#/setup');await page.waitForFunction(()=>!document.querySelector('#app').inert);
 const result=await page.evaluate(async()=>{
  const {InputManager}=await import('/src/game/input.ts');const input=new InputManager(()=>{});input.bindTouch();
  const down=code=>document.body.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));const up=code=>document.body.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
  down('Space');const first=input.read(),held=input.read();up('Space');const released=input.read();
  down('KeyQ');input.read();down('Space');const chord=input.read();up('Space');up('KeyQ');
  const button=document.querySelector('[data-action="through"]');button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));const touch=input.read(),touchHeld=input.read();button.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));const touchUp=input.read();
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{axes:[0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===0||i===4}))}]});const pad=input.read();
  return {edge:first.pass&&!held.pass,hold:first.contain&&held.contain&&!released.contain,chord:chord.passAndMove,touch:touch.through&&touch.keeperRush&&!touchHeld.through&&touchHeld.keeperRush&&!touchUp.keeperRush,pad:pad.passAndMove&&pad.contain};
 });assert.ok(Object.values(result).every(Boolean),JSON.stringify(result));console.log('V2 held defence, edge attacks, touch release and L1+Cross controls passed.');
}finally{await browser.close();}
