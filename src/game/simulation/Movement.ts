import { gameplay } from '../gameplay.config';

export type MovingBody = { vx: number; vy: number; facingX: number; facingY: number };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** One shared steering model for human, receiver and CPU movement. No difficulty boost. */
export function steer(body: MovingBody, x: number, y: number, dt: number, intercept = false) {
  const magnitude = Math.min(1, Math.hypot(x, y));
  if (magnitude <= .12) return { x: 0, y: 0 };
  const heading = Math.atan2(body.facingY, body.facingX);
  const desired = Math.atan2(y, x);
  const delta = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading));
  const speed = Math.hypot(body.vx, body.vy);
  // A planted, slow player can cut sharply. A sprinting player must brake first.
  const turnRate = gameplay.movement.slowTurnRate +
    (gameplay.movement.fastTurnRate - gameplay.movement.slowTurnRate) * clamp(speed / 9, 0, 1);
  const turn = clamp(delta, -turnRate * dt, turnRate * dt);
  body.facingX = Math.cos(heading + turn);
  body.facingY = Math.sin(heading + turn);
  const brake = Math.max(0, Math.cos(delta));
  if (intercept) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length * magnitude, y: y / length * magnitude };
  }
  return { x: body.facingX * magnitude * brake, y: body.facingY * magnitude * brake };
}

/** Bound change in momentum; stopping is stronger than acceleration, never instantaneous. */
export function accelerate(body: MovingBody, x: number, y: number, dt: number, traction = 1) {
  const dx = x - body.vx, dy = y - body.vy, distance = Math.hypot(dx, dy);
  const slowing = x * body.vx + y * body.vy < body.vx * body.vx + body.vy * body.vy;
  const limit = (slowing ? gameplay.movement.braking : gameplay.movement.acceleration) * traction * dt;
  const fraction = distance > 0 ? Math.min(1, limit / distance) : 0;
  body.vx += dx * fraction;
  body.vy += dy * fraction;
}
