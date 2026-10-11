import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {const p=await b.newPage();await p.goto('http://localhost:5173');await p.waitForFunction(()=>!document.querySelector('#app').inert);
 const report=await p.evaluate(async()=>{
  const {createCharacter,animateCharacter}=await import('/src/game/character.ts');const {actionTiming}=await import('/src/game/animation/actions.ts');
  const rig=createCharacter('#ddbe46',3);const motion={receive:.1,recovery:.2,vx:5,vy:2,facingX:1,facingY:0};
  let drift=0,nonfinite=0;
  const cases=[null,...Object.keys(actionTiming).map(kind=>({kind,elapsed:actionTiming[kind].duration*.4,duration:actionTiming[kind].duration,side:1,contacted:true}))];
  for(const action of cases){
   animateCharacter(rig,1,6,0,false,action,.3,motion);
   const initial=Object.fromEntries(Object.entries(rig.bones).map(([name,b])=>[name,[...b.quaternion.toArray(),...b.position.toArray()]]));
   for(let n=0;n<40;n++){animateCharacter(rig,1,6,0,false,action,.3,motion);for(const [name,b] of Object.entries(rig.bones)){const values=[...b.quaternion.toArray(),...b.position.toArray()];for(let i=0;i<values.length;i++){drift=Math.max(drift,Math.abs(values[i]-initial[name][i]));if(!Number.isFinite(values[i]))nonfinite++;}}}
  }
  let time=2,stride=0,maxLean=0;
  for(let n=0;n<600;n++){const speed=n<120?n/15:n<360?8:Math.max(0,8-(n-360)/20);time+=1/60;stride=(stride+speed/60/2.4)%1;const heading=n/60;rig.root.rotation.y=heading;rig.root.position.x+=Math.sin(heading)*speed/60;rig.root.position.z+=Math.cos(heading)*speed/60;animateCharacter(rig,time,speed,0,false,null,stride,{receive:0,recovery:0,vx:Math.sin(heading)*speed,vy:Math.cos(heading)*speed,facingX:Math.sin(heading),facingY:Math.cos(heading)});maxLean=Math.max(maxLean,Math.abs(rig.bones.spine.rotation.x));}
  animateCharacter(rig,time,0,0,false,null,stride,{receive:0,recovery:0,vx:0,vy:0,facingX:1,facingY:0});
  return {drift,nonfinite,maxLean,spineAfterStop:rig.bones.spine.rotation.x,hipAfterStop:rig.hips.position.toArray(),rootHeading:rig.root.rotation.y,cases:cases.length};
 });await writeFile('artifacts/v3/pose-regression.json',JSON.stringify(report,null,2));assert.ok(report.drift<1e-7,JSON.stringify(report));assert.equal(report.nonfinite,0);assert.ok(report.maxLean<.22);assert.ok(Math.abs(report.spineAfterStop)<.02);console.log(report);
}finally{await b.close();}
