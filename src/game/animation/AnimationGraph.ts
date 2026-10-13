import { actionWeight, type PlayerAction } from './actions';

export type LocomotionState = 'IDLE' | 'WALK' | 'JOG' | 'RUN' | 'SPRINT' | 'TURN' | 'STOP';
export type AnimationSample = {
  state: LocomotionState;
  weights: { idle: number; walk: number; run: number; sprint: number; action: number; cutLeft:number;cutRight:number;stop:number;receive:number };
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
/** Pure evaluation from current simulation data. Previous final bones never enter the graph. */
export function evaluateAnimation(speed: number, action: PlayerAction | null, turnAngle = 0, braking = false, reception=0): AnimationSample {
  const moving = clamp(speed), jogging = clamp((speed - 1.8) / 2.2), sprint = clamp((speed - 6) / 2);
  const acting = action && !action.turnRemaining ? actionWeight(action) : 0;
  const cut=action?0:clamp((Math.abs(turnAngle)-.15)/.75)*clamp(speed/3)*.32;
  const stop=action?0:braking?clamp(speed/2)*.38:0;
  const receive=action?0:clamp(reception/.18)*.5;
  const sum=cut+stop+receive, scale=sum>1-acting?(1-acting)/sum:1;
  const base=1-acting-sum*scale;
  const state: LocomotionState = speed < .15 ? 'IDLE' : braking ? 'STOP' : Math.abs(turnAngle) > .35 ? 'TURN' : speed < 1.8 ? 'WALK' : speed < 4 ? 'JOG' : speed < 6.5 ? 'RUN' : 'SPRINT';
  // Small original cut/stop/reception overlays preserve the captured gait underneath.
  return { state, weights: { idle: (1 - moving) * base, walk: moving * (1 - jogging) * base, run: moving * jogging * (1 - sprint) * base, sprint: moving * sprint * base, action: acting,cutLeft:turnAngle<0?cut*scale:0,cutRight:turnAngle>=0?cut*scale:0,stop:stop*scale,receive:receive*scale } };
}
