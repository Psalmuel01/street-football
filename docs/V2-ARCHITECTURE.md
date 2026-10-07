# V2 football feel audit — 6 October 2026

The fixed-step simulation owns contacts, goals and restart rules; render animation must remain a consumer. Replay copies simulation state and must never mutate live play. These boundaries are worth preserving.

The weakest area was sustained pass homing inside the ball integrator. Target ranking and a strike-time interception solver now belong in `game/football/passing.ts`; physical tuning belongs in `gameplay.config.ts`. Pass-flight metadata represents intent and a fixed destination, never authority to bend the ball. Ordinary receivers move to meet that destination. Human movement can deliberately abandon it.

Remaining audit findings: simulation still combines AI, movement, contacts and stats; split those only along tested boundaries. Main owns too much DOM/lifecycle wiring, CSS has accumulated overrides, and hash routes remain basic. Input currently uses action edges; defensive held controls need a separate normalized state. The rig has timed contacts but lacks reception animation, walk clips and convincing hands/cloth. Renderer combines court construction, crowd and camera. Audio has independent voice/effects controls but needs event priority and more varied crowd reactions. Tests previously rewarded homing and did not prove a complete enjoyable match.

This pass prioritizes non-homing passing, contextual selection, buffered reception, controlled touches, fair movement, defensive controls and attacking support. Further art and UI work must follow browser match review; passing unit tests alone cannot establish quality. Online, accounts and King of the Pitch remain deferred as requested.

## Boundaries retained and changed

- `InputManager` exposes held defensive intent separately from attack action edges. The fixed-tick command queue retains one-touch and pass-and-move inputs until consumed. Mobile labels change with possession.
- Controlled touches are impulses at short intervals, with stride-side offset and a longer sprint radius. Reception damps incoming velocity deterministically. A hard turn can separate the ball beyond the control radius. A full stumble/contact model is still outstanding.
- CPU and human movement share the same speed formula. Difficulty changes decision cadence, challenge distance and keeper anticipation. Attacking support now separates recycling defenders and advanced outlets, but defensive marking remains basic.
- Shooting chooses a goal-side target using input, keeper position, pressure and balance. Shot charging, post geometry and placed-shot modifiers remain outstanding.
- F3 enables a development-only readout. Production excludes the debug module. Diagnostics never mutate the match.
- Full-match browser runs use a scripted normalized-input player and the normal real-time render loop. No clock shortening, teleporting, goal injection or forced full time. Video capture adds overhead; timing is not a physical mobile benchmark.

Current validation and explicit outstanding scope are recorded in `V2-PROGRESS.md`. Follow/Wide/Street camera values now share the tuning config. Manual selection gets a two-second grace period before possession-loss defensive assistance can change a distant selected player.
