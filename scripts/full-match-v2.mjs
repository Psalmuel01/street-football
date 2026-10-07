import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts/v2',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
try{
 for(const mobile of [false,true]){
  const name=mobile?'phone':'desktop';
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,recordVideo:{dir:'artifacts/v2/video',size:{width:960,height:600}}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:5173/#/setup');await page.waitForFunction(()=>!document.querySelector('#app').inert);
  await page.evaluate(async()=>{
   const resource=part=>performance.getEntriesByType('resource').filter(r=>r.name.includes(part)).at(-1).name;
   const {Match}=await import(resource('/src/game/simulation.ts')), {InputManager}=await import(resource('/src/game/input.ts'));
   const original=Match.prototype.step;
   window.observed=null;window.samples=[];window.events=[];let lastEvent=-1,tick=0;
   Match.prototype.step=function(dt,input){window.observed=this;const result=original.call(this,dt,input);if(lastEvent!==this.eventSerial){lastEvent=this.eventSerial;window.events.push({event:this.event,time:this.elapsed,owner:this.owner});}return result;};
   // Scripted player uses only normalized controls; clock, players and ball are never repositioned.
   InputManager.prototype.read=function(){
    const m=window.observed,i={x:0,y:0,sprint:false,pass:false,shoot:false,through:false,tackle:false,switch:false,skill:false};tick++;
    if(!m)return i;if(m.restartPending||m.state==='GOAL'){i.pass=tick%12===0;return i;}
    const p=m.players[m.active];
    if(m.owner===p.id){
      i.x=1;i.y=-p.y*.12;i.sprint=p.x<16&&p.stamina>.45;
      const pressure=m.players.some(q=>q.team!==p.team&&Math.hypot(q.x-p.x,q.y-p.y)<3);
      if(p.x>17){i.shoot=tick%20===0;i.y=-p.y*.04;}
      else if(pressure&&tick%35===0){const mates=m.players.filter(q=>q.team===0&&q.id!==p.id&&q.x>p.x-2).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));if(mates[0]){i.x=mates[0].x-p.x;i.y=mates[0].y-p.y;i.pass=true;}}
    }else if(m.passFlight?.receiver!==p.id){
      const dx=m.ball.x-p.x,dy=m.ball.y-p.y,d=Math.hypot(dx,dy)||1;i.x=dx/d;i.y=dy/d;i.sprint=d>5&&p.stamina>.35;i.tackle=d<1.7&&tick%12===0;i.switch=d>9&&tick%90===0;
    }
    const mag=Math.max(1,Math.hypot(i.x,i.y));i.x/=mag;i.y/=mag;return i;
   };
   let last=performance.now();function sample(t){const m=window.observed;if(m?.state==='PLAYING'&&!m.restartPending)window.samples.push(t-last);last=t;requestAnimationFrame(sample);}requestAnimationFrame(sample);
  });
  await page.locator('#conditions').selectOption(mobile?'rain':'golden');await page.locator('#play').click();await page.waitForTimeout(1500);await page.screenshot({path:`artifacts/v2/${name}-kickoff.png`});
  const start=Date.now();let shots=0;
  while(Date.now()-start<360000){
   await page.waitForTimeout(15000);
   const state=await page.evaluate(()=>({state:window.observed?.state,elapsed:window.observed?.elapsed,score:window.observed?.score,passes:window.observed?.passes,shots:window.observed?.shots}));
   console.log(name,JSON.stringify(state));
   if(shots++===1||shots===6)await page.screenshot({path:`artifacts/v2/${name}-play-${shots}.png`});
   if(state.state==='FULL_TIME')break;
  }
  const report=await page.evaluate(()=>{const m=window.observed,s=window.samples.slice(60).sort((a,b)=>a-b);return {state:m.state,elapsed:m.elapsed,score:m.score,passes:m.passes,completed:m.completedPasses,shots:m.shots,saves:m.saves,tackles:m.tackles,frames:s.length,medianMs:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],events:window.events};});
  assert.equal(report.state,'FULL_TIME');assert.equal(report.elapsed,180);assert.deepEqual(errors,[]);
  await page.screenshot({path:`artifacts/v2/${name}-results.png`});await writeFile(`artifacts/v2/${name}-report.json`,JSON.stringify(report,null,2));console.log('COMPLETE',name,JSON.stringify({...report,events:report.events.length}));await context.close();
 }
}finally{await browser.close();}
