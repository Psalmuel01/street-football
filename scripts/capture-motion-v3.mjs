import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts/v3/motion/video',{recursive:true});
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{for(const mobile of [false,true]){
 const name=mobile?'mobile':'desktop',size=mobile?{width:844,height:390}:{width:1280,height:800};
 const c=await b.newContext({viewport:size,isMobile:mobile,hasTouch:mobile,recordVideo:{dir:'artifacts/v3/motion/video',size}}),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:5173/tools/motion-review/index.html');await p.waitForFunction(()=>document.querySelector('#metrics').textContent.includes('m/s'));
 for(const seconds of [12,20,31,40,52,60]) {await p.waitForFunction(s=>parseFloat(document.querySelector('#label').textContent)>=s,seconds,{timeout:45000});await p.screenshot({path:`artifacts/v3/motion/${name}-${seconds}.png`});}
 const video=p.video();await c.close();const path=await video.path();await writeFile(`artifacts/v3/motion/${name}.json`,JSON.stringify({path,errors,physicalDevice:false},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(name,path);
}}finally{await b.close();}
