import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accelerate, steer } from '../src/game/simulation/Movement';
import { evaluateAnimation } from '../src/game/animation/AnimationGraph';
import { buildClips } from '../src/game/animation/clips';
import { selectMotionPack, validateMotionPack } from '../src/game/animation/AssetPipeline';
import { approvedVoices } from '../src/game/audio/VoiceApproval';
import { Match } from '../src/game/simulation';
import { actionTiming } from '../src/game/animation/actions';

const body = (speed = 0) => ({ vx: speed, vy: 0, facingX: 1, facingY: 0 });
test('sprint reversal brakes with bounded momentum and turns slower than a planted cut', () => {
  const slow = body(), fast = body(9);
  steer(slow, -1, 0, 1/60); const desired = steer(fast, -1, 0, 1/60);
  assert.ok(Math.abs(Math.atan2(fast.facingY, fast.facingX)) < Math.abs(Math.atan2(slow.facingY, slow.facingX)));
  const vx = fast.vx; accelerate(fast, desired.x * 9, desired.y * 9, 1/60);
  assert.ok(fast.vx > 0); assert.ok(Math.hypot(fast.vx-vx,fast.vy) <= 32/60 + 1e-8);
});
test('acceleration reaches the same speed at 30, 60 and 120 simulation ticks', () => {
  for(const fps of [30,60,120]) { const p = body(); for(let n=0;n<fps;n++) accelerate(p,9,0,1/fps); assert.equal(p.vx,9); }
});
test('locomotion/action weights stay normalized through interruptions and repeated evaluation', () => {
  for(const speed of [0,.1,.5,1,2,4,6,8,10]) for(const elapsed of [0,.03,.08,.2,.4,.42]) {
    const action = {kind:'pass' as const, elapsed, duration:.42, side:1, contacted:elapsed>.08};
    const sample = evaluateAnimation(speed,action);
    assert.ok(Math.abs(Object.values(sample.weights).reduce((a,b)=>a+b,0)-1)<1e-8);
    assert.deepEqual(sample,evaluateAnimation(speed,action));
    assert.equal(evaluateAnimation(speed,null).weights.action,0);
  }
  assert.equal(evaluateAnimation(4,null,.8).state,'TURN');
  assert.equal(evaluateAnimation(4,null,0,true).state,'STOP');
});
test('reviewed embedded tracks reach runtime; incomplete, drift-prone or nonfinite packs are rejected', () => {
  const clips=buildClips(), fallback=buildClips();
  const provenance={rigVersion:1,source:'test fixture only',license:'test fixture only',author:'test',reviewed:true};
  assert.deepEqual(validateMotionPack(clips,provenance),[]);
  assert.equal(selectMotionPack(clips,fallback,provenance).clips[0],clips[0]);
  assert.equal(selectMotionPack(clips,fallback).source,'procedural-prototype');
  assert.ok(validateMotionPack(clips.slice(1),provenance).length);
  clips[0].tracks[0].values[0]=NaN;
  assert.equal(selectMotionPack(clips,fallback,provenance).source,'procedural-prototype');
});
test('synthetic, stale, incomplete and duplicate-reviewer voice approvals remain silent', () => {
  const hash='a'.repeat(64), review={status:'approved',hash,locale:'ng',date:'2026-10-11',reviewers:['r1','r2']};
  const clip={url:'/assets/audio/voices/native/recorded.mp3',hash,source:'recorded' as const,review};
  assert.deepEqual(Object.keys(approvedVoices({good:clip})),['good']);
  assert.deepEqual(approvedVoices({synthetic:{...clip,source:'synthetic'},stale:{...clip,hash:'b'.repeat(64)},duplicate:{...clip,review:{...review,reviewers:['r1','r1']}}}),{});
});
test('pass and shot release preserve the ball position even after a directional windup', () => {
  for(const kind of ['pass','shot'] as const) {
    const m=new Match();m.state='PLAYING';m.restartPending=false;m.owner=3;
    const p=m.players[3];Object.assign(p,{x:0,y:0,cooldown:0,action:null,facingX:1,facingY:0});
    Object.assign(m.ball,{x:.45,y:.27,z:.12});
    m.kick(p,12,2,20,false,kind,null);
    m.advanceActions(1);
    assert.equal(m.ball.x,.45);assert.equal(m.ball.y,.27);assert.equal(m.ball.z,.12);assert.equal(m.owner,null);assert.ok(m.ball.vx>0);
    assert.ok(actionTiming[kind].contact>0);
  }
});
