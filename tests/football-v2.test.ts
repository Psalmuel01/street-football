import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match,idle} from '../src/game/simulation';
import {passOptions,passDestination} from '../src/game/football/passing';
function setup(){const m=new Match();m.state='PLAYING';m.restartPending=false;m.owner=3;m.active=3;m.lock=0;for(const p of m.players){p.x=-26;p.y=p.team===0?-16:16;p.homeX=p.x;p.homeY=p.y;}Object.assign(m.players[3],{x:0,y:0,facingX:1,facingY:0});Object.assign(m.players[4],{x:12,y:0});m.ball.x=.64;m.ball.y=0;return m;}
test('passing rejects candidates behind intention and favors an open lane',()=>{
 const m=setup(),p=m.players[3];Object.assign(m.players[1],{x:-5,y:0});Object.assign(m.players[2],{x:12,y:5});Object.assign(m.players[8],{x:6,y:0});
 const options=passOptions(p,m.players);assert.ok(!options.some(o=>o.receiver===1));assert.equal(options[0].receiver,2);
});
test('a struck pass never bends when its receiver changes direction',()=>{
 const m=setup();m.pass(m.players[3]);m.advanceActions(.09);const angle=Math.atan2(m.ball.vy,m.ball.vx);
 for(let i=0;i<15;i++){m.step(1/60,{...idle(),y:1});assert.ok(Math.abs(Math.atan2(m.ball.vy,m.ball.vx)-angle)<1e-8);}
});
test('through pass destination leads into space beyond a moving runner',()=>{
 const m=setup(),p=m.players[3],q=m.players[4];q.vx=4;
 const short=passDestination(p,q,22,false),through=passDestination(p,q,22,true);
 assert.ok(short.x>q.x);assert.ok(through.x>short.x+3);assert.equal(through.y,0);
});
test('buffered pass is struck after reception without a second press',()=>{
 const m=setup();Object.assign(m.players[4],{x:3,y:0});Object.assign(m.players[2],{x:10,y:0});m.kick(m.players[3],3,0,14,false,"pass",4);m.advanceActions(.09);
 m.step(1/60,{...idle(),pass:true,x:1});
 for(let i=0;i<25;i++)m.step(1/60,idle());
 assert.equal(m.passes[0],2);
});
test('ordinary receiving retains damped velocity rather than freezing the ball',()=>{
 const m=setup();m.owner=null;m.lastTouch=4;m.ball.x=-.6;m.ball.vx=10;m.lock=0;
 m.step(1/60,idle());assert.equal(m.owner,3);assert.ok(m.ball.vx>0&&m.ball.vx<5);assert.ok(m.players[3].receiveTime>0);
});
test('sprint touches visibly extend beyond walking control without teleporting',()=>{
 const distances:number[]=[];
 for(const sprint of [false,true]){const m=setup();let maximum=0;
 for(let i=0;i<90;i++){const x=m.ball.x;m.step(1/60,{...idle(),x:1,sprint});assert.ok(Math.abs(m.ball.x-x)<.5);if(i>30)maximum=Math.max(maximum,Math.hypot(m.ball.x-m.players[3].x,m.ball.y-m.players[3].y));}
 assert.equal(m.owner,3);distances.push(maximum);}
 assert.ok(distances[1]>distances[0]+.05);
});
test('difficulty never changes an identical CPU player running speed',()=>{
 const speeds:number[]=[];for(const difficulty of [0,2]){const m=setup();m.difficulty=difficulty;m.owner=8;const p=m.players[8];p.x=-5;p.y=0;m.ball.x=-5;m.ball.y=0;p.cooldown=10;
 for(let i=0;i<30;i++)m.step(1/60,idle());speeds.push(Math.hypot(p.vx,p.vy));}
 assert.ok(Math.abs(speeds[0]-speeds[1])<1e-9);
});
test('L1 plus pass launches a forward run and keeps the intended receiver selected',()=>{
 const m=setup();m.step(1/60,{...idle(),pass:true,switch:true,passAndMove:true});
 assert.ok(m.players[3].runUntil>m.elapsed+2);
 for(let i=0;i<6;i++)m.step(1/60,idle());assert.equal(m.active,4);assert.equal(m.passes[0],1);
});
test('a stale one-touch command expires before a later reception',()=>{
 const m=setup();m.kick(m.players[3],12,0,16,false,'pass',4);m.advanceActions(.09);m.step(1/60,{...idle(),pass:true});
 for(let i=0;i<70;i++)m.step(1/60,idle());assert.equal(m.passes[0],1);assert.equal(m.bufferedPass,null);
});
test('shot aiming remains directional under close pressure',()=>{
 for(const y of [-1,1]){const m=setup();m.players[3].x=20;m.ball.x=20.64;m.shoot(m.players[3],y);assert.equal(Math.sign(m.players[3].pendingKick!.ty),y);assert.ok(m.players[3].pendingKick!.power>20);}
});
test('a tackler facing away at contact cannot steal behind their body',()=>{
 const m=setup();m.owner=8;Object.assign(m.players[8],{x:1,y:0});m.players[3].facingX=-1;m.beginAction(m.players[3],'tackle');m.advanceActions(.14);assert.equal(m.owner,8);
});
test('intercepted passes do not count as completed passes',()=>{
 const m=setup();Object.assign(m.players[8],{x:4,y:0});m.kick(m.players[3],12,0,20,false,'pass',4);m.advanceActions(.09);
 for(let i=0;i<25;i++)m.step(1/60,idle());assert.equal(m.completedPasses[0],0);assert.equal(m.completedPasses[1],0);
});
test('holding L1 before Cross still sends the pass-and-move from the carrier',()=>{
 const m=setup();m.step(1/60,{...idle(),switch:true});assert.notEqual(m.active,3);
 m.step(1/60,{...idle(),pass:true,passAndMove:true});assert.equal(m.players[3].pendingKick?.kind,'pass');assert.ok(m.players[3].runUntil>m.elapsed);
});
test('losing possession selects a nearby defender without overriding recent manual selection',()=>{
 const m=setup();m.active=4;m.players[4].x=20;m.ball.x=0;m.selectDefenderAfterLoss();assert.equal(m.active,3);
 m.selectPlayer(4);m.selectDefenderAfterLoss();assert.equal(m.active,4);m.elapsed=2.1;m.selectDefenderAfterLoss();assert.equal(m.active,3);
});
test('a goalkeeper receives a team back-pass without inventing a save or parry',()=>{
 const m=setup();m.owner=null;m.lastTouch=3;const keeper=m.players[0];m.ball.x=keeper.x+.6;m.ball.y=keeper.y;m.ball.vx=-25;m.lock=0;
 m.step(1/60,idle());assert.equal(m.owner,0);assert.equal(m.saves[0],0);
});
