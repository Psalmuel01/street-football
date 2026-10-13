/**
 * A difficulty tier changes *decisions* only: how quickly the CPU reacts, how tightly it
 * presses, whether it marks runners and how well it picks its moments.
 *
 * It never changes player speed, acceleration, reach, tackling contact, the keeper's
 * handling or any ball physics — the CPU plays the same sport with the same body.
 */
export type DifficultyTier = {
  id: string;
  label: string;
  summary: string;
  /** Seconds the CPU carrier waits before reconsidering its options. Reaction time, not pace. */
  decisionInterval: number;
  /** Distance at which a defender commits to a tackle. */
  pressureDistance: number;
  /** Longest ball travel time the keeper will commit a dive to. */
  keeperReaction: number;
  /** Metres from the goal centre inside which the CPU will shoot on sight. */
  shootingRange: number;
  /** How far out the keeper comes for a loose ball, in metres, on top of the 2.5 m base. */
  keeperRush: number;
  /** Shape discipline. Above 0.7 defenders pick up runners; above 0.75 a second player presses. */
  shapeDiscipline: number;
  /** How often the CPU looks for the productive pass instead of dribbling into trouble. */
  passVision: number;
  /** Chance the CPU chooses the disciplined action rather than the rushed one. */
  composure: number;
};

/** Index 1 is the baseline: it is also the tier your own AI team-mates always play at. */
export const difficultyTiers: readonly DifficultyTier[] = [
 {id:'casual',label:'Casual',summary:'More time on the ball. Lighter pressure and occasional rushed choices.',decisionInterval:1.15,pressureDistance:1,keeperReaction:.22,shootingRange:14,keeperRush:1,shapeDiscipline:.45,passVision:.3,composure:.76},
 {id:'competitive',label:'Competitive',summary:'Balanced pressure, tracked runners and useful passing support.',decisionInterval:.65,pressureDistance:1.25,keeperReaction:.32,shootingRange:18,keeperRush:1.6,shapeDiscipline:.72,passVision:.65,composure:.9},
 {id:'expert',label:'Expert',summary:'Coordinated pressing, tighter passing lanes and disciplined chance selection.',decisionInterval:.3,pressureDistance:1.5,keeperReaction:.42,shootingRange:21,keeperRush:2.4,shapeDiscipline:.92,passVision:.88,composure:.97},
];

/** Throws away anything that is not a real difficulty level. */
export function difficultyTier(level: number): DifficultyTier {
  const index = Number.isFinite(level) ? Math.round(level) : 1;
  return difficultyTiers[Math.max(0, Math.min(difficultyTiers.length - 1, index))];
}

/** Metres and seconds. Shared physics apply equally to humans and CPU players. */
export const gameplay = {
  passing: { minSpeed: 12, maxSpeed: 32, drag: .18, maxDistance: 48, minAlignment: -.28, throughLead: 3.5, bufferSeconds: .32 },
  control: { walkReach: .56, sprintReach: 1.05, touchInterval: .23, turnReleaseDistance: 2.2, receptionSeconds: .18 },
  movement: { acceleration: 19, braking: 29, slowTurnRate: 9, fastTurnRate: 3.6, sprintMultiplier: 1.45, runSeconds: 2.4 },
  tackling: { protection: .55, recovery: .38, retry: .85, minAlignment: .25 },
  camera: { followHeight: 5.8, followDepth: 11.8, streetHeight: 3.4, streetDepth: 8.5, wideHeight: 33, wideDepth: 37, lookAhead: .2 },
  /** Derived from the difficulty tiers above so there is a single source of truth. */
  ai: {
    decisionInterval: difficultyTiers.map(tier => tier.decisionInterval),
    pressureDistance: difficultyTiers.map(tier => tier.pressureDistance),
  },
} as const;
