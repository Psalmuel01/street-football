import type {Match} from './simulation';
/** Development-only readout. No simulation mutation; absent from production boot. */
export function installFootballDebug(getMatch:()=>Match,metrics:()=>{calls:number;triangles:number;geometries:number;textures:number}=()=>({calls:0,triangles:0,geometries:0,textures:0})){
 const panel=document.createElement('pre');panel.id='football-debug';panel.hidden=true;
 Object.assign(panel.style,{position:'fixed',right:'16px',top:'85px',zIndex:'100',padding:'14px',background:'#071c20ed',color:'#d3ffb0',font:'12px/1.6 monospace',borderRadius:'12px',pointerEvents:'none'});
 document.body.append(panel);
 window.addEventListener('keydown',e=>{if(e.code==='F3'){e.preventDefault();panel.hidden=!panel.hidden;}});
 let average=1/60;const times:number[]=[];
 return (dt:number)=>{average=average*.95+dt*.05;times.push(dt*1000);if(times.length>180)times.shift();if(panel.hidden)return;const info=metrics(),sorted=[...times].sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)]??0;const m=getMatch(),p=m.players[m.active],target=m.passCandidate;
 panel.textContent=`FOOTBALL LAB · F3\nFPS ${Math.round(1/average)} · p95 ${p95.toFixed(1)} ms\nDraws ${info.calls} · triangles ${info.triangles}\nGeometry ${info.geometries} · textures ${info.textures}\n${m.state} · owner ${m.owner??'loose'}\nPlayer ${m.athlete(p).name} · ${p.id}\nSpeed ${Math.hypot(p.vx,p.vy).toFixed(1)} m/s\nStamina ${Math.round(p.stamina*100)}%\nBall ${m.ball.vx.toFixed(1)}, ${m.ball.vy.toFixed(1)}\nReceiver ${target?.receiver??'—'} · score ${target?.score.toFixed(1)??'—'}\nLane risk ${target?.risk.toFixed(2)??'—'}\nTouch ${p.touchTime.toFixed(2)} · first ${p.receiveTime.toFixed(2)}\nPasses ${m.completedPasses[0]}/${m.passes[0]}`;};
}
