import type {Player} from '../simulation';
import type {Tactic} from '../../content/roster';
export function supportTarget(player:Player,carrier:Player,style:Tactic,players:Player[]){
 const dir=player.team===0?1:-1,slot=player.id%5,side=slot%2?-1:1;
 const close=style==='possession',counter=style==='counter',compact=style==='compact';
 let x=carrier.x+dir*(slot===1?(counter?-11:close?-5:-8):slot===2?(close?-2:-4):slot===3?(counter?8:close?3:5):(counter?14:close?8:10));
 let y=carrier.y*.2+side*(close?6:compact?6.5:9);
 // Offer a side of the defender rather than an outlet hidden behind their body.
 for(const defender of players){if(defender.team===player.team)continue;const dx=x-carrier.x,dy=y-carrier.y,length=dx*dx+dy*dy||1,along=((defender.x-carrier.x)*dx+(defender.y-carrier.y)*dy)/length;if(along>.15&&along<.9&&Math.hypot(defender.x-carrier.x-dx*along,defender.y-carrier.y-dy*along)<1.5)y+=side*2;}
 return {x:Math.max(-26,Math.min(26,x)),y:Math.max(-14,Math.min(14,y))};
}
