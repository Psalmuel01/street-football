import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Match,idle} from '../src/game/simulation';
import {difficultyTiers,difficultyTier,gameplay} from '../src/game/gameplay.config';
import {renderShell} from '../src/ui/shell';
import {actionTiming} from '../src/game/animation/actions';
import {passOptions} from '../src/game/football/passing';

/**
 * A CPU side holding the ball at (-5,0) with one opponent 1 m away.
 * Everyone else is parked far off so the only thing under test is the decision.
 */
function pressureSetup(difficulty:number){
  const m=new Match(600,difficulty);
  m.state='PLAYING';m.restartPending=false;m.lock=0;m.owner=8;m.active=4;
  for(const p of m.players){p.x=p.team===0?-26:26;p.y=(p.id%5-2)*5;p.homeX=p.x;p.homeY=p.y;p.cooldown=600;p.vx=0;p.vy=0;}
  Object.assign(m.players[8],{x:-5,y:0,vx:0,vy:0,facingX:-1,facingY:0,cooldown:0});
  Object.assign(m.players[9],{x:-26,y:2,vx:0,vy:0});
  Object.assign(m.players[3],{x:-4,y:.4,vx:0,vy:0});
  m.ball.x=-5;m.ball.y=0;m.ball.vx=0;m.ball.vy=0;m.lastTouch=8;
  return m;
}

test('difficulty offers three real levels that only change decisions',()=>{
  assert.equal(difficultyTiers.length,3);
  assert.equal(new Set(difficultyTiers.map(tier=>tier.label)).size,3);
  assert.equal(new Set(difficultyTiers.map(tier=>tier.id)).size,3);
  for(const tier of difficultyTiers){
    assert.ok(tier.summary.length>20,`${tier.label} needs a description for the setup screen`);
    assert.ok(tier.decisionInterval>0&&tier.decisionInterval<=1.5);
    assert.ok(tier.pressureDistance>0&&tier.pressureDistance<2);
    assert.ok(tier.keeperReaction>0&&tier.keeperReaction<1);
    assert.ok(tier.composure>0&&tier.composure<=1);
    assert.ok(tier.shapeDiscipline>0&&tier.shapeDiscipline<=1);
    assert.ok(tier.passVision>0&&tier.passVision<=1);
    assert.ok(tier.shootingRange>0&&tier.shootingRange<30);
    assert.ok(tier.keeperRush>=0&&tier.keeperRush<5);
  }
  for(let i=1;i<difficultyTiers.length;i++){
    const easier=difficultyTiers[i-1],harder=difficultyTiers[i];
    assert.ok(harder.decisionInterval<easier.decisionInterval,'reaction time must improve');
    assert.ok(harder.pressureDistance>easier.pressureDistance,'pressing must get tighter');
    assert.ok(harder.keeperReaction>easier.keeperReaction,'keeper must read the shot earlier');
    assert.ok(harder.shapeDiscipline>easier.shapeDiscipline,'shape discipline must improve');
    assert.ok(harder.composure>easier.composure,'composure must improve');
  }
  // Out-of-range saved settings resolve to a real level instead of throwing.
  assert.equal(difficultyTier(-5).id,difficultyTiers[0].id);
  assert.equal(difficultyTier(99).id,difficultyTiers[2].id);
  assert.equal(difficultyTier(Number.NaN).id,difficultyTiers[1].id);
  assert.equal(difficultyTier(2.4).id,difficultyTiers[2].id);
  // The legacy tuning arrays stay derived from the tiers rather than drifting apart.
  assert.deepEqual([...gameplay.ai.decisionInterval],difficultyTiers.map(tier=>tier.decisionInterval));
  assert.deepEqual([...gameplay.ai.pressureDistance],difficultyTiers.map(tier=>tier.pressureDistance));
});

test('no difficulty level changes how fast an identical player runs',()=>{
  const speeds:number[]=[];
  for(let difficulty=0;difficulty<difficultyTiers.length;difficulty++){
    const m=new Match(600,difficulty);
    m.state='PLAYING';m.restartPending=false;m.lock=0;m.owner=8;m.active=4;
    for(const p of m.players){p.x=-26;p.y=p.team===0?16:-16;p.homeX=p.x;p.homeY=p.y;p.vx=0;p.vy=0;p.cooldown=600;}
    Object.assign(m.players[8],{x:-5,y:0,vx:0,vy:0,facingX:-1,facingY:0,cooldown:600});
    m.ball.x=-5;m.ball.y=0;m.ball.vx=0;m.ball.vy=0;m.lastTouch=8;
    for(let i=0;i<45;i++)m.step(1/60,idle());
    const carrier=m.players[8];
    speeds.push(Math.hypot(carrier.vx,carrier.vy));
  }
  for(const speed of speeds)assert.ok(Math.abs(speed-speeds[0])<1e-9,`speed changed by difficulty: ${speeds.join(', ')}`);
  assert.ok(speeds[0]>0,'the reference player should actually be moving for this check to mean anything');
});

test('a harder level reacts sooner instead of moving faster',()=>{
  const release=(difficulty:number)=>{
    const m=pressureSetup(difficulty);
    for(let step=0;step<200;step++){
      m.step(1/60,idle());
      if(m.passes[1]>0)return step;
    }
    return Infinity;
  };
  const street=release(0),legend=release(difficultyTiers.length-1);
  assert.ok(street<Infinity&&legend<Infinity,'both levels should release the ball under pressure');
  assert.ok(legend<street,`legend released on step ${legend}, street on step ${street}`);
  assert.ok(legend<=30,`legend should react inside half a second, took ${legend} steps`);
});

test('organised levels put more players on the ball than loose ones',()=>{
  // Counting bodies inside a radius would only measure where the shape happened to sit.
  // What the pressing rule actually changes is how many players *commit* to the ball, so
  // this counts the outfielders actively closing on it rather than drifting with the shape.
  const committed=(difficulty:number)=>{
    const m=new Match(600,difficulty);
    m.state='PLAYING';m.restartPending=false;m.lock=0;m.owner=3;m.active=4;
    for(const p of m.players){p.cooldown=600;p.vx=0;p.vy=0;}
    const place=(id:number,x:number,y:number)=>Object.assign(m.players[id],{x,y,homeX:x,homeY:y});
    place(3,10,0);m.players[3].facingX=1;m.players[3].facingY=0;
    place(4,-24,6);place(1,-24,-6);place(2,-20,4);place(0,-28,0);
    place(5,22,-2);place(6,20,2);place(7,18,-6);place(8,16,6);place(9,14,-10);
    m.ball.x=10;m.ball.y=0;m.ball.vx=0;m.ball.vy=0;m.lastTouch=3;
    for(let i=0;i<90;i++)m.step(1/60,idle());
    return m.players.filter(p=>{
      if(p.team!==1||p.keeper)return false;
      const dx=m.ball.x-p.x,dy=m.ball.y-p.y,d=Math.hypot(dx,dy);
      if(d>12)return false;
      return (dx*p.vx+dy*p.vy)/(d||1)>0.05;
    }).length;
  };
  const street=committed(0),legend=committed(difficultyTiers.length-1);
  assert.ok(legend>street,`legend committed ${legend} players to the ball, street committed ${street}`);
});

test('a struck pass leaves the foot on the contact frame and not before',()=>{
  const m=new Match();
  m.state='PLAYING';m.restartPending=false;m.lock=0;m.owner=3;m.active=3;
  for(const p of m.players){p.x=-20;p.y=(p.id%5-2)*5;p.homeX=p.x;p.homeY=p.y;}
  Object.assign(m.players[3],{x:0,y:0,vx:0,vy:0,facingX:1,facingY:0});
  Object.assign(m.players[4],{x:10,y:0,vx:0,vy:0});
  m.ball.x=.64;m.ball.y=0;m.ball.vx=0;m.ball.vy=0;
  assert.equal(passOptions(m.players[3],m.players)[0].receiver,4,'only the intended receiver should be on offer');
  assert.ok(m.pass(m.players[3]));
  m.advanceActions(actionTiming.pass.contact-0.001);
  assert.equal(m.ball.vx,0,'the ball must not leave the foot before contact');
  assert.equal(m.owner,3,'possession is retained through the wind-up');
  m.advanceActions(0.002);
  assert.ok(m.ball.vx>0,'the pass must be struck on the contact frame');
  assert.equal(m.owner,null);
  assert.equal(m.lastTouch,3);
});

test('every scripted contact happens inside its own action',()=>{
  for(const [kind,timing] of Object.entries(actionTiming)){
    assert.ok(timing.duration>0,`${kind} needs a duration`);
    assert.ok(timing.contact>=0&&timing.contact<=timing.duration,`${kind} contact must fall inside the clip`);
  }
  assert.ok(actionTiming.pass.contact<actionTiming.shot.contact,'a pass must be released before a shot');
});

test('a completed pass hands over possession and credits the passer',()=>{
  const m=new Match();
  m.state='PLAYING';m.restartPending=false;m.lock=0;m.owner=3;m.active=3;
  for(const p of m.players){p.x=-20;p.y=(p.id%5-2)*5;p.homeX=p.x;p.homeY=p.y;p.vx=0;p.vy=0;}
  Object.assign(m.players[3],{x:0,y:0,vx:0,vy:0,facingX:1,facingY:0});
  Object.assign(m.players[4],{x:10,y:0,vx:0,vy:0});
  m.ball.x=.64;m.ball.y=0;m.ball.vx=0;m.ball.vy=0;
  assert.ok(m.pass(m.players[3]));
  for(let i=0;i<120&&m.owner!==4;i++)m.step(1/60,idle());
  assert.equal(m.owner,4,'the intended receiver should collect the pass');
  assert.equal(m.completedPasses[0],1);
  assert.equal(m.completedPasses[1],0);
  assert.equal(m.possession[1],0,'possession is only credited to the team actually in control');
  for(let i=0;i<20;i++)m.step(1/60,idle());
  assert.ok(m.possession[0]>0);
});

test('a rushed side settles for a worse pass target without touching the ball physics',()=>{
  const chosen=(optionIndex:number)=>{
    const m=new Match();
    m.state='PLAYING';m.restartPending=false;m.lock=0;m.owner=3;m.active=3;
    for(const p of m.players){p.x=-20;p.y=(p.id%5-2)*5;p.homeX=p.x;p.homeY=p.y;p.vx=0;p.vy=0;}
    Object.assign(m.players[3],{x:0,y:0,vx:0,vy:0,facingX:1,facingY:0});
    Object.assign(m.players[4],{x:10,y:0,vx:0,vy:0});
    Object.assign(m.players[2],{x:7,y:3,vx:0,vy:0});
    m.ball.x=.64;m.ball.y=0;
    const options=passOptions(m.players[3],m.players);
    assert.ok(options.length>=2,'this check needs at least two legal passing options');
    assert.ok(m.pass(m.players[3],false,false,undefined,optionIndex));
    return {receiver:m.passCandidate!.receiver,power:m.players[3].pendingKick!.power};
  };
  const best=chosen(0),settled=chosen(1);
  assert.notEqual(settled.receiver,best.receiver,'a rushed side must be able to pick a different target');
  assert.ok(settled.power>0&&Number.isFinite(settled.power),'the ball is still struck with the shared physics');
});

test('ball physics hold up when the frame rate changes',()=>{
  const after=(steps:number,dt:number)=>{
    const m=new Match(600);
    m.state='PLAYING';m.restartPending=false;m.lock=0;m.owner=null;
    for(const p of m.players){p.x=p.team===0?-26:26;p.y=(p.id%5-2)*5;p.homeX=p.x;p.homeY=p.y;}
    Object.assign(m.ball,{x:0,y:0,z:0,vx:22,vy:6,vz:2});
    m.lastTouch=3;
    for(let i=0;i<steps;i++)m.step(dt,idle());
    return {...m.ball};
  };
  const coarse=after(60,1/60),fine=after(120,1/120);
  assert.ok(Math.hypot(coarse.x-fine.x,coarse.y-fine.y)<0.05,
    `one second of flight drifted: ${coarse.x.toFixed(3)},${coarse.y.toFixed(3)} vs ${fine.x.toFixed(3)},${fine.y.toFixed(3)}`);
  assert.ok(coarse.x>10&&coarse.y>0,'the reference ball should actually be travelling');
});

test('a long match at the hardest level stays finite, bounded and countable',()=>{
  const m=new Match(600,difficultyTiers.length-1);
  const input=(i:number)=>({...idle(),pass:i%97===0,shoot:i%211===0,through:i%503===0,switch:i%331===0,sprint:i%7===0,x:(i%181<90?1:-1) as number,y:(i%89<44?1:-1) as number});
  for(let i=0;i<12000;i++)m.step(1/60,input(i));
  for(const p of m.players){
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.vx)&&Number.isFinite(p.vy));
    assert.ok(Math.abs(p.x)<=29.5+1e-9&&Math.abs(p.y)<=17.5+1e-9,'players must stay on the court');
    assert.ok(p.stamina>=0&&p.stamina<=1&&Number.isFinite(p.stride));
    assert.ok(Number.isFinite(p.cooldown)&&p.cooldown>=0);
  }
  assert.ok(Number.isFinite(m.ball.x)&&Number.isFinite(m.ball.y)&&Number.isFinite(m.ball.z)&&Number.isFinite(m.ball.vz));
  assert.ok(Math.abs(m.ball.x)<=32&&Math.abs(m.ball.y)<=18);
  for(const tally of [...m.score,...m.shots,...m.passes,...m.saves,...m.completedPasses,...m.fouls])
    assert.ok(Number.isInteger(tally)&&tally>=0);
});

test('every screen ships the loading, error and difficulty affordances',()=>{
  const shell=renderShell();
  for(const id of ['boot-screen','boot-title','boot-detail','boot-retry','route-status','difficulty-description'])
    assert.ok(shell.includes(`id="${id}"`),`the shell is missing #${id}`);
  assert.ok(shell.includes('class="visually-hidden"'),'route announcements need a live region');
  for(let i=0;i<difficultyTiers.length;i++){
    assert.ok(shell.includes(`<option value="${i}"`),`difficulty level ${i} is not selectable`);
    assert.ok(shell.includes(difficultyTiers[i].label),`difficulty level ${i} has no label`);
  }
  assert.ok(shell.includes('selected'),'a default difficulty must be preselected');
  const css=readFileSync('src/style.css','utf8');
  assert.ok(css.includes('#boot-screen'),'the loading screen needs styling');
  assert.ok(css.includes('.cup-fixture'),'cup fixtures need styling');
  assert.ok(!css.includes('commentary-caption'),'removed commentary caption styles must not come back');
});
