import { actionWeight, type PlayerAction } from './actions';

export type LocomotionState = 'IDLE' | 'WALK' | 'JOG' | 'RUN' | 'SPRINT' | 'TURN' | 'STOP';
export type AnimationSample = {
  state: LocomotionState;
  weights: { idle: number; walk: number; run: number; sprint: number; action: number };
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** Pure evaluation from current simulation data. Previous final bones never enter the graph. */
export function evaluateAnimation(speed: number, action: PlayerAction | null, turnAngle = 0, braking = false): AnimationSample {
  const moving = clamp(speed), jogging = clamp((speed - 1.8) / 2.2), sprint = clamp((speed - 6) / 2);
  const acting = action && !action.turnRemaining ? actionWeight(action) : 0;
  const base = 1 - acting;
  const state: LocomotionState = speed < .15 ? 'IDLE' : braking ? 'STOP' : Math.abs(turnAngle) > .35 ? 'TURN' : speed < 1.8 ? 'WALK' : speed < 4 ? 'JOG' : speed < 6.5 ? 'RUN' : 'SPRINT';
  // TURN/STOP currently blend the available gait. Authored cut/stop clips are an open art gate.
  return { state, weights: { idle: (1 - moving) * base, walk: moving * (1 - jogging) * base, run: moving * jogging * (1 - sprint) * base, sprint: moving * sprint * base, action: acting } };
}
