import { test } from "node:test";
import assert from "node:assert/strict";
import { Match, idle } from "../src/game/simulation";
test("kickoff creates two balanced teams and enters play", () => {
  const m = new Match();
  assert.equal(m.players.length, 10);
  assert.equal(m.players.filter((p) => p.keeper).length, 2);
  m.step(2, idle());
  assert.equal(m.state, "PLAYING");
});
test("goal increments only once and resets after celebration", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.ball.x = 29.99;
  m.ball.vx = 20;
  m.step(1 / 60, idle());
  assert.deepEqual(m.score, [1, 0]);
  assert.equal(m.state, "GOAL");
  m.step(1, idle());
  assert.deepEqual(m.score, [1, 0]);
  m.step(2, idle());
  assert.equal(m.state, "KICKOFF");
  assert.equal(m.owner,8);
  assert.equal(m.ball.x, 0);
});
test("outside goal mouth rebounds without scoring", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.ball.x = 29.99;
  m.ball.y = 8;
  m.ball.vx = 20;
  m.step(1 / 60, idle());
  assert.deepEqual(m.score, [0, 0]);
  assert.ok(m.ball.vx < 0);
});
test("pause freezes clock and restores kickoff state", () => {
  const m = new Match();
  m.pause();
  m.step(20, idle());
  assert.equal(m.elapsed, 0);
  m.pause();
  assert.equal(m.state, "KICKOFF");
});
test("full time is terminal and respects configured length", () => {
  const m = new Match(3);
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.step(3, idle());
  assert.equal(m.state, "FULL_TIME");
  m.step(100, idle());
  assert.equal(m.elapsed, 3);
});
test("passing releases independent ball and selects receiver", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.owner = 3;
  const p = m.players[3];
  m.ball.x = p.x;
  m.ball.y = p.y;
  p.facingX=0;p.facingY=1;
  m.step(1 / 60, { ...idle(), pass: true });
  assert.equal(m.owner, 3, "pass retains possession during wind-up");
  assert.equal(m.passes[0], 0);
  for (let i = 0; i < 5; i++) m.step(1 / 60, idle());
  assert.equal(m.owner, null);
  assert.ok(Math.hypot(m.ball.vx, m.ball.vy) > 10);
  assert.notEqual(m.active, 3);
  assert.equal(m.passes[0], 1);
});
test("tackle transfers nearby opposing possession", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.lock = 0;
  m.owner = 8;
  const a = m.players[3],
    b = m.players[8];
  a.x = b.x - 1.3;
  a.y = b.y;
  m.ball.x=b.x;m.ball.y=b.y;
  m.step(1 / 60, { ...idle(), tackle: true });
  assert.equal(m.owner, 8);
  for (let i = 0; i < 8; i++) m.step(1 / 60, idle());
  assert.equal(m.owner, 3);
  assert.equal(m.tackles[0], 1);
});
test("long simulation remains finite and inside court", () => {
  const m = new Match(600);
  for (let i = 0; i < 20000; i++) m.step(1 / 60, {...idle(),pass:i%60===0});
  for (const p of m.players) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert.ok(Math.abs(p.x) < 31 && Math.abs(p.y) < 19);
  }
  assert.ok(Number.isFinite(m.ball.x));
});
test("normalized movement accelerates and sprint consumes stamina", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  const p = m.players[m.active],
    start = p.x;
  for (let i = 0; i < 30; i++)
    m.step(1 / 60, { ...idle(), x: 1, sprint: true });
  assert.ok(p.x > start + 2);
  assert.ok(p.stamina < 1);
});
test("shooting produces a shot impulse and keeper can collect a free ball", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.owner = 3;
  m.shoot(m.players[3]);
  assert.equal(m.owner, 3);
  for (let i = 0; i < 7; i++) m.step(1 / 60, idle());
  assert.equal(m.owner, null);
  assert.equal(m.shots[0], 1);
  assert.ok(m.ball.vx > 0);
  m.ball.x = m.players[0].x;
  m.ball.y = m.players[0].y;
  m.ball.vx = m.ball.vy = 0;
  m.lock = 0;
  m.step(1 / 60, idle());
  assert.equal(m.owner, 0);
});

test("pause freezes a pending strike and resumes a single release", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.owner = 3;
  m.shoot(m.players[3]);
  m.step(1 / 60, idle());
  const elapsed = m.players[3].action!.elapsed;
  m.pause();
  m.step(5, idle());
  assert.equal(m.players[3].action!.elapsed, elapsed);
  assert.equal(m.owner, 3);
  assert.equal(m.shots[0], 0);
  m.pause();
  for (let i = 0; i < 7; i++) m.step(1 / 60, idle());
  assert.equal(m.shots[0], 1);
  for (let i = 0; i < 8; i++) m.step(1 / 60, idle());
  assert.equal(m.shots[0], 1);
});
test("losing possession cancels a pending shot", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.owner = 3;
  m.shoot(m.players[3]);
  m.owner = 8;
  m.players[8].cooldown = 1;
  for (let i = 0; i < 8; i++) m.step(1 / 60, idle());
  assert.equal(m.players[3].pendingKick, null);
  assert.equal(m.shots[0], 0);
});
test("repeated shoot requests cannot duplicate the pending strike", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.owner = 3;
  for (let i = 0; i < 20; i++) m.step(1 / 60, { ...idle(), shoot: true });
  assert.equal(m.shots[0], 1);
});
test("full time discards a wind-up without a late shot", () => {
  const m = new Match(0.05);
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.owner = 3;
  m.shoot(m.players[3]);
  for (let i = 0; i < 10; i++) m.step(1 / 60, idle());
  assert.equal(m.state, "FULL_TIME");
  assert.equal(m.shots[0], 0);
  assert.equal(m.players[3].pendingKick, null);
});
test("keeper catches slower shots and holds the ball off the floor", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.lock = 0;
  const keeper = m.players[0];
  m.ball.x = keeper.x + 0.6;
  m.ball.y = keeper.y;
  m.ball.vx = -15;
  m.lastTouch=8;
  m.step(1 / 60, idle());
  assert.equal(m.owner, keeper.id);
  assert.equal(keeper.action?.kind, "catch");
  assert.equal(m.saves[0], 1);
  m.step(1 / 60, idle());
  assert.ok(m.ball.z > 0.5);
});
test("keeper parries a hard shot away from goal into a loose ball", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.lock = 0;
  const keeper = m.players[0];
  m.ball.x = keeper.x + 0.6;
  m.ball.y = keeper.y;
  m.ball.vx = -26;
  m.lastTouch=8;
  m.step(1 / 60, idle());
  assert.equal(m.owner, null);
  assert.equal(m.saves[0], 1);
  assert.ok(m.ball.vx > 0);
  assert.equal(keeper.action?.kind, "dive");
});
test("goal gives scoring team a celebration and resets it at kickoff", () => {
  const m = new Match();
  m.state = "PLAYING"; m.restartPending=false; m.owner=null;
  m.ball.x = 29.99;
  m.ball.vx = 20;
  m.step(1 / 60, idle());
  assert.ok(
    m.players
      .filter((p) => p.team === 0)
      .every((p) => p.action?.kind === "celebrate"),
  );
  m.step(3, idle());
  assert.ok(m.players.every((p) => p.action === null));
});

test('circle requests a lofted pass in possession; triangle stays on the ground', () => {
  for (const action of ['tackle', 'through'] as const) {
    const m = new Match();m.state = 'PLAYING';m.restartPending=false;m.owner=null;m.active = 3;m.owner = 3;
    const p=m.players[3];m.ball.x=p.x;m.ball.y=p.y;p.facingX=0;p.facingY=1;
    m.step(1/60,{...idle(),[action]:true});
    assert.equal(p.pendingKick?.kind,'pass');
    assert.equal(p.pendingKick?.lob,action==='tackle');
  }
});
