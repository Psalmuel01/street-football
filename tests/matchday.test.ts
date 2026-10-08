import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match,idle} from '../src/game/simulation';
import {GoalReplay,snapshot} from '../src/game/replay';
import {makeRoster} from '../src/content/roster';
function playing(){const m=new Match();m.state='PLAYING';m.restartPending=false;m.owner=null;return m;}
test('assisted pass reaches its moving receiver without teleporting the ball',()=>{
 const m=playing();m.owner=3;m.active=3;
 for(const p of m.players){p.x=-26;p.y=p.team===0?-16:16;p.homeX=p.x;p.homeY=p.y;}
 Object.assign(m.players[3],{x:-8,y:0,facingX:1,facingY:0});Object.assign(m.players[4],{x:4,y:0,vx:0,vy:3});m.ball.x=-7.36;m.ball.y=0;
 m.step(1/60,{...idle(),pass:true});let received=false,moved=0;
 for(let i=0;i<180;i++){const x=m.ball.x,y=m.ball.y;m.step(1/60,{...idle(),y:.7});if(m.owner===4){received=true;moved=m.players[4].y;break;}assert.ok(Math.hypot(m.ball.x-x,m.ball.y-y)<1.1,'ball follows a continuous path');}
 assert.ok(received,'moving teammate must receive an unobstructed assisted pass');assert.ok(moved>1,'receiver moved after the pass began');assert.equal(m.passes[0],1);
});
test('defenders can intercept an assisted pass',()=>{
 const m=playing();m.owner=3;m.active=3;
 for(const p of m.players){p.x=-27;p.y=p.team===0?-16:16;p.homeX=p.x;p.homeY=p.y;}
 Object.assign(m.players[3],{x:-9,y:0,facingX:1,facingY:0});Object.assign(m.players[4],{x:9,y:0});Object.assign(m.players[8],{x:0,y:0});m.ball.x=-8.36;m.ball.y=0;
 m.step(1/60,{...idle(),pass:true});let intercepted=false;
 for(let i=0;i<120;i++){m.step(1/60,idle());if(m.owner!==null&&m.players[m.owner].team===1){intercepted=true;break;}}
 assert.ok(intercepted);assert.equal(m.passFlight,null);
});
test('conceding team owns the protected restart after either team scores',()=>{
 for(const scoringTeam of [0,1]){
 const m=playing();m.ball.x=scoringTeam===0?29.99:-29.99;m.ball.vx=scoringTeam===0?20:-20;m.ball.y=0;
 m.step(1/60,idle());assert.equal(m.state,'GOAL');m.step(3,idle());assert.equal(m.state,'KICKOFF');assert.equal(m.kickoffTeam,1-scoringTeam);assert.equal(m.players[m.owner!].team,1-scoringTeam);assert.equal(m.ball.x,0);
 m.step(1.3,idle());const elapsed=m.elapsed;m.step(.2,idle());assert.equal(m.elapsed,elapsed);assert.ok(m.restartPending);
 for(let i=0;i<100;i++)m.step(1/60,m.kickoffTeam===0?{...idle(),pass:true}:idle());assert.equal(m.restartPending,false);assert.ok(m.passes[1-scoringTeam]>0);
 }
});
test('substitutions enforce unique legal roles and survive a goal reset',()=>{
 const m=playing();m.configure(0,makeRoster(2),[0,1,2,3,4]);assert.equal(m.substitute(3,5),false);m.pause();m.players[3].stamina=.2;
 assert.equal(m.substitute(0,5),false);assert.equal(m.substitute(3,1),false);assert.equal(m.substitute(3,5),true);assert.equal(m.players[3].stamina,1);assert.equal(m.athlete(m.players[3]).name,'Sola');
 m.players[1].stamina=.4;m.resetPositions(0);assert.equal(m.lineups[0][3],5);assert.equal(m.players[1].stamina,.4);assert.equal(m.substitutions[0],1);
});
test('replay uses independent bounded snapshots and freezes when paused',()=>{
 const m=playing(),r=new GoalReplay();for(let i=0;i<360;i++){m.ball.x=i/20;m.presentationTime=i/60;r.record(m);}assert.equal(r.history.length,300);r.start();r.advance(1.1,false);const before=r.sample()!;assert.ok(before);const x=before.ball.x;r.advance(1,true);assert.equal(r.sample()!.ball.x,x);before.ball.x=999;assert.notEqual(r.sample()!.ball.x,999);assert.notEqual(m.ball.x,999);r.advance(10,false);assert.equal(r.active,false);
});
test('snapshots preserve animation state without sharing player references',()=>{const m=playing();m.beginAction(m.players[3],'shot');const frame=snapshot(m);m.players[3].action!.elapsed=.3;assert.equal(frame.players[3].action!.elapsed,0);});

test('a standing tackle retains its recovery pose and prevents an immediate counter-steal',()=>{
 const m=playing();m.lock=0;m.owner=8;m.active=3;
 const winner=m.players[3],loser=m.players[8];Object.assign(winner,{x:0,y:0});Object.assign(loser,{x:1.25,y:0});m.ball.x=1.25;m.ball.y=0;
 m.tackle(winner);m.advanceActions(.14);
 assert.equal(m.owner,3);assert.equal(winner.action?.kind,'tackle');assert.ok(loser.recovery>0);assert.ok(loser.cooldown>.5);
 m.tackle(loser);assert.equal(loser.action?.kind,'stumble');assert.equal(m.owner,3);
 m.advanceActions(.6);assert.equal(winner.action,null);
});
test('overlapping tackle contacts cannot ping-pong possession',()=>{
 const m=playing();m.lock=0;m.owner=8;m.active=3;
 Object.assign(m.players[3],{x:0,y:0});Object.assign(m.players[8],{x:1.2,y:0});Object.assign(m.players[9],{x:0,y:1});
 m.ball.x=1.2;m.ball.y=0;
 m.beginAction(m.players[3],'tackle');m.beginAction(m.players[9],'tackle');m.advanceActions(.14);
 assert.equal(m.owner,3);assert.equal(m.tackles[0],1);assert.equal(m.tackles[1],0);assert.ok(m.lock>.5);
});
test('rain has lower ball friction and bounce than dry concrete',()=>{
 const dry=playing(),wet=playing();wet.condition='rain';for(const m of [dry,wet]){m.lock=10;m.ball.x=0;m.ball.y=0;m.ball.z=.05;m.ball.vz=-2;m.ball.vx=10;m.step(.05,idle());}
 assert.ok(wet.ball.vx>dry.ball.vx);assert.ok(wet.ball.vz<dry.ball.vz);
});
test('a close teammate can receive before the passer re-touch lock expires',()=>{
 const m=playing();m.owner=3;m.active=3;
 for(const p of m.players){p.x=-25;p.y=p.team===0?-16:16;p.homeX=p.x;p.homeY=p.y;}
 Object.assign(m.players[3],{x:0,y:0,facingX:1,facingY:0});Object.assign(m.players[4],{x:1.9,y:0});m.ball.x=.64;m.ball.y=0;m.step(1/60,{...idle(),pass:true});
 let caught=false;for(let i=0;i<12;i++){m.step(1/60,idle());if(m.owner===4){caught=true;break;}}
 assert.ok(caught);assert.ok(m.lock>0,'re-touch protection remains active for the passer');
});
