import type { Player } from '../simulation';
import { gameplay } from '../gameplay.config';
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export type PassOption={receiver:number;score:number;alignment:number;risk:number;distance:number};
export function passOptions(p:Player,players:Player[],through=false):PassOption[]{
  return players.filter(q=>q.team===p.team&&q.id!==p.id).map(q=>{
    const dx=q.x-p.x,dy=q.y-p.y,distance=Math.hypot(dx,dy),alignment=(dx*p.facingX+dy*p.facingY)/(distance||1);
    let risk=0,openness=8;
    for(const defender of players.filter(d=>d.team!==p.team)){
      openness=Math.min(openness,Math.hypot(defender.x-q.x,defender.y-q.y));
      const along=((defender.x-p.x)*dx+(defender.y-p.y)*dy)/(distance*distance||1);
      if(along>.08&&along<.95){
        const lane=Math.hypot(defender.x-p.x-dx*along,defender.y-p.y-dy*along);
        risk=Math.max(risk,clamp(1-lane/3,0,1));
      }
    }
    const forward=(p.team===0?1:-1)*dx;
    const score=alignment*12-Math.abs(distance-(through?17:10))*.15+openness*.5+clamp(forward*.08,-1.5,1.5)+(q.vx*(p.team===0?1:-1))*.18-risk*7;
    return {receiver:q.id,score,alignment,risk,distance};
  }).filter(q=>q.distance>1&&q.distance<gameplay.passing.maxDistance&&q.alignment>gameplay.passing.minAlignment).sort((a,b)=>b.score-a.score);
}
/** Solve a launch target once. No post-strike steering or receiver teleportation. */
export function passDestination(p:Player,q:Player,speed:number,through:boolean){
  let time=Math.hypot(q.x-p.x,q.y-p.y)/speed;
  let x=q.x,y=q.y;
  for(let i=0;i<4;i++){
    const run=Math.hypot(q.vx,q.vy),lead=through?gameplay.passing.throughLead:0;
    x=clamp(q.x+q.vx*time+(run>1?q.vx/run:(p.team===0?1:-1))*lead,-29,29);
    y=clamp(q.y+q.vy*time+(run>1?q.vy/run:0)*lead,-17,17);
    const distance=Math.max(0,Math.hypot(x-p.x,y-p.y)-.64);
    time=-Math.log(Math.max(.1,1-distance*gameplay.passing.drag/speed))/gameplay.passing.drag;
    time=Math.min(2,time);
  }
  return {x,y};
}
