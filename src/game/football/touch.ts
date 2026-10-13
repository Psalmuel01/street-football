/** Foot contacts become farther apart as speed increases, never pinning the ball. */
export function dribbleTouch(speed:number,stride:number){
 const run=Math.max(0,Math.min(1,speed/9));
 return {reach:.48+run*.72,interval:.18+run*.12,side:Math.sin(stride*Math.PI*2)*(.06+run*.04)};
}
/** Moving receivers cushion into their travel lane; standing receivers stop it close. */
export function receptionVelocity(vx:number,vy:number,px:number,py:number,skill:number){
 const speed=Math.hypot(vx,vy),retention=Math.max(.08,Math.min(.25,.08+(1-skill)*.16));
 const moving=Math.hypot(px,py)>.6,lead=moving?Math.min(speed*.14,1.8):0,length=Math.hypot(px,py)||1;
 return {vx:vx*retention+px*.6+px/length*lead,vy:vy*retention+py*.6+py/length*lead};
}
