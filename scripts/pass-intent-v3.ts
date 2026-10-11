import { Match } from '../src/game/simulation';
import { passOptions } from '../src/game/football/passing';
import { writeFileSync } from 'node:fs';
/** Reproducible geometry benchmark; human intended receivers remain a separate gate. */
const cases=[];
for(let n=0;n<50;n++){
 const m=new Match(),p=m.players[3],angle=(-Math.PI*.8)+(n%10)*Math.PI*1.6/9,distance=[4,8,12,16,22][Math.floor(n/10)];
 const x=Math.sin(n*.8)*5,y=Math.cos(n*.7)*3;
 Object.assign(p,{x,y,facingX:Math.cos(angle),facingY:Math.sin(angle)});
 for(const q of m.players){if(q.id===3)continue;Object.assign(q,{x:29,y:q.team?17:-17,vx:0,vy:0});}
 Object.assign(m.players[4],{x:x+Math.cos(angle)*distance,y:Math.max(-16.5,Math.min(16.5,y+Math.sin(angle)*distance))});
 const actualAngle=Math.atan2(m.players[4].y-y,m.players[4].x-x);p.facingX=Math.cos(actualAngle);p.facingY=Math.sin(actualAngle);
 for(const [i,offset] of [[1,.65],[2,-.65],[0,Math.PI]] as const){const a=actualAngle+offset;Object.assign(m.players[i],{x:x+Math.cos(a)*10,y:y+Math.sin(a)*10});}
 // Defenders are outside all ordinary pass lanes: test interpretation, not interception.
 for(const q of m.players.filter(q=>q.team===1))Object.assign(q,{x:x-Math.cos(angle)*20,y:y-Math.sin(angle)*20});
 const options=passOptions(p,m.players);
 cases.push({id:n+1,distance,angle,origin:{x,y},expected:4,selected:options[0]?.receiver,passed:options[0]?.receiver===4,candidates:options});
}
const correct=cases.filter(c=>c.passed).length;
writeFileSync('artifacts/v3/pass-intent.json',JSON.stringify({type:'synthetic unambiguous geometric benchmark',humanAcceptance:false,criterion:'Only intended outlet lies inside +/- 12 degrees; other outlets >= 37 degrees; uncontested lanes',correct,total:50,rate:correct/50,cases},null,2));
console.log(`${correct}/50 synthetic clear-direction targets; not human acceptance`);
if(correct<45)process.exitCode=1;
