/** Simulation-owned action timing, in seconds. Contact is gameplay, not a render callback. */
export const actionTiming = {
  pass: { duration: 0.42, contact: 0.08333333333333333 },
  shot: { duration: 0.58, contact: 0.11666666666666667 },
  tackle: { duration: 0.62, contact: 0.13333333333333333 },
  slide: { duration: 1.25, contact: 0.16 },
  stumble: { duration: 0.75, contact: 0 },
  skill: { duration: 0.55, contact: 0.15 },
  catch: { duration: 0.65, contact: 0 },
  dive: { duration: 0.95, contact: 0 },
  celebrate: { duration: 2.5, contact: 0 },
} as const;
export type ActionKind = keyof typeof actionTiming;
export type PlayerAction = {
  kind: ActionKind;
  elapsed: number;
  duration: number;
  side: number;
  contacted: boolean;
  turnRemaining?: number;
  targetHeading?: number;
};
export type PendingKick = {
  tx: number;
  ty: number;
  power: number;
  lob: boolean;
  receiver: number | null;
  through?: boolean;
  kind: "pass" | "shot";
};
export const actionWeight = (action: PlayerAction) =>
  Math.min(1, action.elapsed / 0.075, Math.max(0, (action.duration - action.elapsed) / 0.18));
