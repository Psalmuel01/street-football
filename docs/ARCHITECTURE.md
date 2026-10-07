# Lagos Street Football — architecture and staged build

Current V2 refactor and limitations: see [V2-ARCHITECTURE.md](V2-ARCHITECTURE.md). The numbered assessment and dated passes below are historical build notes; they are not a current feature checklist.

## 1. Repository assessment
The supplied workspace was empty: no application, assets, server, tests, or inherited conventions. This implementation establishes a first playable local vertical slice. There is no authentication, online transport, persistent competition, or production telemetry.

## 2. Rendering approach
TypeScript + Vite + Three.js. A small imperative UI avoids involving a component tree in every simulation tick. Three.js provides stylized 3D, shadows and procedural assets without a large engine download. The fixed 60 Hz football simulation has no DOM or renderer dependency. Rendering interpolates camera movement and renders independently. The current simulation does not interpolate player snapshots; that is a networking milestone.

## 3. Multiplayer architecture (planned, not implemented)
Run the same headless simulation on a Node authoritative room server. Clients submit sequence-numbered normalized input, never goals or scores. Validate identity, role, input ranges, frequency and sequence. Server owns clock, possession, goals, disconnect forfeits and results. Send compact snapshots at 15–20 Hz with player interpolation and reconciled local prediction. Separate spectator read-only fanout from active match transport. WebSocket first; measure before adding WebRTC complexity.

Phone pairing should use a short-lived room code and QR link, a server-minted controller credential, explicit lobby team assignment, input expiration, heartbeat and reconnect grace. Spectators must have a distinct credential incapable of input. Production requires HTTPS/WSS. A local host/client demo is not equivalent to competitive server authority.

## 4. Input architecture
`InputManager` maps keyboard, standard Gamepad API and pointer-based joystick/actions to `Input`. The simulation never reads DOM events. Movement/sprint are held state; actions are edge-triggered. Future device adapters attach to per-seat inputs. Current release has one human-controlled team. Non-standard controllers need a remapping screen. Physical controller and phone testing remains required.

## 5. Game state
KICKOFF → PLAYING → GOAL → PLAYING → FULL_TIME. PAUSED stores the previous state so resuming kickoff/celebration is safe. Page visibility loss pauses the match. A fixed timestep and bounded frame delta prevent giant simulation jumps after inactivity. Match duration is a constructor setting (3/5/7/10 minutes through UI).

## 6. Directory structure
- `src/game/simulation.ts`: entities, ball dynamics, AI, rules and match states.
- `src/game/input.ts`: normalized keyboard, gamepad and touch adapters.
- `src/game/renderer.ts`: procedural pitch, characters, camera and render loop interface.
- `src/content/teams.ts`: original community teams and contextual caption strings.
- `src/main.ts`: setup, match UI, lifecycle and sound cues.
- `src/style.css`: responsive presentation and touch layouts.
- `tests/`: deterministic rules tests.

Split AI and ball physics into separate systems when complexity warrants it; keep the small first slice navigable.

## 7. Data model
Implemented: Team (id, name, abbreviation, kit, motto, fictional player names); Player (id, team, role, position, velocity, facing, cooldown, stamina, pace, shooting, passing); Match (state, duration, elapsed time, score, ball, possession, shots, passes, tackles). Team identities are content, not competitive advantages.

Future durable model: User → PlayerProfile; Community → Team → TeamMember; Match → MatchParticipant and MatchEvent; Tournament → TournamentTeam and TournamentMatch; ChampionStreak and QueueEntry; Rating, Achievement, Friendship and ModerationReport. Match results should use idempotent server-side transactions. Cosmetic reputation must remain separate from matchmaking rating.

## 8. Performance strategy
Cap pixel ratio at 1.8; shared simple shapes; no per-frame DOM rebuilding, external models, or texture downloads. Fixed simulation tick, small crowds, modest shadow map and bounded camera tracking. Next optimizations: shared geometry/material pools, crowd instancing, quality presets and measured dynamic resolution. Targets are aspirations, not measured cross-device claims. Audit mobile GPU load before increasing environment detail.

## 9. Asset and audio strategy
All world geometry, characters, markings and signage are procedural original assets. No copyrighted sports branding or real-person likenesses. Optional audio is synthesized match cues, not recorded commentary. Content strings are centralized. Commission or license local voice performances before advertising voiced commentary. Fonts currently use Google Fonts with system fallbacks. Cache a self-hosted font for the PWA milestone.

## 10. Roadmap
1. Current: 5v5, movement/sprint/stamina, independent ball, short and lofted through passes, shooting, nearby tackling, switching, keeper capture/distribution, AI spacing, scoring, clock, pause/results, keyboard/gamepad/touch adapters, original Lagos-inspired court.
2. Playtest/tune: keeper reaction/parries, directional defensive pressure, shielding, shot power, richer skills, facing/animation, player labels, accessibility and input mapping, improved possession acquisition. Practice is currently a long unranked AI match, not isolated drills.
3. PWA/device validation: manifest, app icons, versioned service worker, offline shell/training, install/update flow, real phone/controller testing and quality controls.
4. Local seats and phone controllers, then authoritative online rooms/reconnect.
5. Persistent Winner Stays: FIFO queue; loser goes to tail, winner stays; ties go to explicitly defined shootout. Atomic champion/result/queue update. Test replacement and queue order before exposing UI.
6. Knockout/league tournaments, public read-only pages, spectator transport.
7. Profiles, meaningful community rankings, moderation, original licensed voices, cosmetic progression, replay and shareable results.

## Known limits and validation
No networking, PWA installability, local second player, full commentary, tournament or persistent progression is claimed in this slice. Ball possession uses a damped target for close control, with free impulses for kicks; improve separation and interception through playtesting. Keyboard + browser interaction tested through automation; physical device feel and Safari/Firefox/mobile performance require actual devices. Current skill is a small contextual burst, not an animated nutmeg system. No deterministic randomness is used.

## Visual pass 02
`src/game/character.ts` now owns reusable articulated character construction and animation, plus the live team-kit preview. Original faces, skin/hair variants, numbered kits, segmented limbs and smoothed facing replace the first primitive figures. Geometry is shared between characters; spectators omit facial/kit decals. The pitch uses a seeded procedural wear texture and filmic lighting. Building details and a closer broadcast camera improve setting/readability. Match layout hides introductory content; portrait mobile also hides setup while playing.

These are stylized procedural characters, not production sculpted assets. Next visual milestone: an original optimized skinned GLB character with authored locomotion, kick, tackle, keeper and celebration clips; verify silhouette, feet/ball contact and animation blending before expanding content. Physical mobile GPU profiling remains outstanding; additional articulated mesh parts increase draw calls even though geometry is shared.

## Character and contact pass 03
The prototype now ships an original skinned GLB in `public/assets/characters/lagos-footballer.glb`, with a reproducible source/export pipeline. `assets/footballer.ts` authors smoothly weighted ring topology, shaped face geometry and a 17-bone skeleton. `animation/clips.ts` supplies twelve embedded quaternion/position clips. `character.ts` loads and clones the GLB, assigns cosmetic variants, blends locomotion/actions and solves two-bone leg placement to level the soles during the stance phase. It is still a stylized authored mesh; facial expressions, fingers and artist-sculpted anatomical detail are not production-complete.

`animation/actions.ts` is shared timing data, independent of Three.js. Each simulated player has an action, optional pending kick and accumulated stride. Pass contact occurs after 5 fixed ticks (83 ms); shot contact after 7 ticks (117 ms); a standing tackle resolves after 8 ticks (133 ms). The action timer advances on the simulation clock. A lost possession cancels the pending kick; repeated requests cannot duplicate it. Full time discards pending actions; pause freezes both the event and pose. Renderer clip evaluation cannot create gameplay events.

Goalkeepers now anticipate nearby incoming trajectories, animate a dive, catch slower shots at hand height, or parry hard shots away from goal with a brief acquisition lock. Catch/dive recovery affects their movement and distribution. Goal celebrations expire when positions reset. The lightweight AI and save envelope still need human playtesting; the system is not a biomechanics simulation. Ball/hand alignment during a diving catch remains approximate.

The app buffers edge actions until the next fixed tick so high-refresh rendering cannot silently consume a button press between ticks. The Street camera follows the selected player/ball more closely; Broadcast retains the wider field view. The player name/stamina indicator makes the active character clearer. Squad-preview motion buttons expose the actual runtime clips and reset when a match begins.

Validation includes 17 deterministic match tests; browser start/movement/pause/resume/camera/layout checks; and `scripts/animation-check.mjs`, which loads the shipped GLB, checks normalized skin weights, finite skinned vertices, repeatable paused pose and the kicking-foot contact point, then renders `artifacts/character-motion-study.png`. The contact-point test currently measures approximately 8 cm in model coordinates. This is a sample-pose check, not proof of perfect contact at every blend/scale. Mobile hardware frame rate and physical device feel remain unmeasured. The GLB adds roughly 829 KiB before transfer compression.

## October matchday iteration
- Hash routing exposes six actual flows while retaining the live match in memory. Leaving the match pauses it; returning through squad management resumes the same game.
- Per-team lineups index nine-player data rosters. Rolling substitutions validate unique membership and goalkeeper compatibility; goal resets retain lineups and player energy. Three tactical modes change off-ball positioning/pressing.
- `PITCH` defines a 60 × 36 metre field. The default follow camera shows part of it; the wide view and radar provide context. Player selection supports input switching and clicking/tapping a player.
- Assisted passing leads receivers at strike time and limits subsequent angular correction; defenders can intercept the continuous path. This is an accessibility/game-feel choice, not a claim of fully physical passing.
- Goal replay holds at most 300 simulation snapshots. Presentation interpolates an independent copy at 0.7× while live match stepping is suspended, then resumes the conceding team's kick-off.
- Conditions are data-driven: golden and night retain dry physics; rain reduces traction, drag and bounce. Rendering uses corresponding lighting and rain particles.
- Character portraits are exported from the actual shipped model, so the squad gallery is not a separate photorealistic likeness. Font files and voice clips are served locally.
- See `MASTER-PROMPT-AUDIT.md` for implemented, partial and absent requirements. This remains a local prototype, not an online/PWA release.
