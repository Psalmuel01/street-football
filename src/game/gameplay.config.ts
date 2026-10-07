/** Metres and seconds. Shared physics apply equally to humans and CPU players. */
export const gameplay = {
  passing: { minSpeed: 12, maxSpeed: 32, drag: .18, maxDistance: 48, minAlignment: -.28, throughLead: 3.5, bufferSeconds: .32 },
  control: { walkReach: .56, sprintReach: 1.05, touchInterval: .23, turnReleaseDistance: 2.2, receptionSeconds: .18 },
  movement: { acceleration: 14, sprintMultiplier: 1.45, runSeconds: 2.4 },
  tackling: { protection: .55, recovery: .38, retry: .85, minAlignment: .25 },
  camera: { followHeight: 5.8, followDepth: 11.8, streetHeight: 3.4, streetDepth: 8.5, wideHeight: 33, wideDepth: 37, lookAhead: .2 },
  ai: { decisionInterval: [1.15, .65, .35], pressureDistance: [1.0, 1.25, 1.5] },
} as const;
