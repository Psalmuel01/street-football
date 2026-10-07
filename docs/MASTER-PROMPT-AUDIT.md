# Master prompt implementation audit — 5 October 2026

Source: the user's 75-section “MASTER BUILD PROMPT — LAGOS STREET FOOTBALL”. This is a code audit, not a claim that the full product has shipped. Later requests for closer, more realistic presentation supersede the original preference for stylized visuals. Browser screenshots and synthetic input checks are not substitutes for real-phone performance and physical-controller testing.

## Current vertical slice

A local, single-human-team versus AI game. Four clubs, nine-player rosters with a legal starting five, bench substitutions, tactical styles, a 60 × 36 metre court, keyboard/gamepad/touch input, a following camera, instant goal replay, match conditions and original assets. Separate hash routes expose Home, Communities, Squad, Match Setup, Match and Results. No backend, accounts, online players or shared competition state exist.

## Implemented and available to exercise

| Master sections | Capability | Evidence and limits |
|---|---|---|
| 2, 4.1, 7–12, 49, 57 | Five-a-side versus AI, configurable 3/5/7/10-minute games, movement, acceleration, sprint, facing, collisions, passing, through/lob passes, shooting, tackling, interception, keepers, scoring, timer, pause and full time | `src/game/simulation.ts`; deterministic tests. Still needs user playtesting and deeper football mechanics. |
| 3, 24, 44 | Home → club → squad → setup → match → results → rematch | `src/ui/router.ts`, `src/main.ts`. No online lobby, progression step or tournament continuation. |
| 4.2, 6, 69–70 | Four fictional community identities; structured nine-player rosters, names, roles and ratings | `src/content/teams.ts`, `roster.ts`. No celebrity likenesses. Ratings and appearances are not a full character-creation system. |
| 7–9, 24 | Assisted moving-target passes with interceptable trajectories; receiving-player selection; direct on-pitch selection; conceding team owns protected kick-off | Simulation and matchday tests. Assistance is deliberately arcade-oriented, not a PES engine recreation. |
| 10 | Beginner/Normal/Hard; support movement, chasing, keeper prediction; balanced/press/counter tactics | High press affects stamina; counter affects positioning. Detailed marking and passing-lane intelligence remain partial. |
| 13–14 | Standard Gamepad API and six visible touch controls: four face buttons plus L1/R1; joystick | `src/game/input.ts`. Physical-controller matrix and device assignment remain untested/unimplemented. |
| 24, 29, 43 | Follow and wide views, radar, goal celebration, bounded five-second recorded-state replay at 0.7×, skip/pause | `src/game/replay.ts`, `renderer.ts`. Replay never changes live simulation state. No full-match storage, export or rewind. |
| 25–27, 58 | One original Lagos-inspired court, coloured murals, flags, vendors, buses/cars, pedestrians, watching/reacting spectators | `street-life.ts`, `atmosphere.ts`, renderer. Not geographically exact; characters and environment remain stylized. |
| 26, 30–32, 54 | Original instrumental, contextual Nigerian-English synthetic Pidgin callouts, subtitles, cooldown, kicks/steps/whistles and synthesized crowd reaction; separate music/voice/effects control | `game/audio/`, bundled MP3 assets and build script. Synthetic performance, not recorded Lagos crowd actors. Broader context and independent crowd/environment buses remain missing. |
| Follow-up requests | Starting-five selection, legal rolling substitutions, player attributes and energy, club-coloured portraits generated from the actual 3D models | `ui/squad.ts`, `content/roster.ts`, simulation. Changes survive goal resets during a match. No durable squad/account save yet. |
| Follow-up requests | Golden hour, floodlit evening and rain; rain changes traction, friction and bounce | `content/conditions.ts`, `atmosphere.ts`, simulation. One location with conditions, not three distinct pitches. |

## Partial — not complete enough to call finished

| Master sections | Remaining work |
|---|---|
| 1, 27–28, 58, 68 | Overall game feel and presentation are still a prototype. Actual character models do not equal the photorealistic cover illustration. Further anatomy, skin/cloth textures, animation, collision and performance work is needed. |
| 5–6 | Team/player customization, captain and formation editing are missing. Pace/passing/shooting/defending and energy exist; individual acceleration, strength, dribbling, control and keeper-ability attributes do not. |
| 7 | No charged power shots, finesse modifier, contextual cross, shield/jockey system or buffered one-touch pass. Dribbling uses a spring-follow possession model, not physical foot contacts for every touch. |
| 8 | Independent free-ball physics, bounce and interception exist. Controlled possession, deflections, body contacts and rebound tuning need refinement. |
| 9–10 | Nearest/manual/receiving selection works. Predictive defensive auto-switch suggestion, sophisticated marking and formation intelligence are missing. |
| 13–14 | No remapping screen, device-connect messaging, mobile skill button, haptics or full attack/defence contextual labels. |
| 24 | Scorer identity is recorded but goal UI does not yet provide a full scorer/assist presentation. Team badges are not in the match HUD. No halftime, which is optional for the short format. |
| 28, 53, 65 | Reused assets, lighter crowd geometry, capped pixel ratio and offscreen render suppression exist. No Low/Medium/High/Auto quality menu, runtime LOD or dynamic resolution. No measured real-phone 45–60 FPS claim. |
| 30–34 | Callout text is structured by event, but not a proper localization catalogue. No equalizer/late-winner/hat-trick/champion context engine, voice actor performances, arguing/warnings/miss callouts or release-rights review for a commercial voice pack. |
| 45–46 | No named guest onboarding or guided drills. “Practice” is currently a long AI match, not a separate training curriculum. |
| 47–49, 70, 73 | Simulation/input/rendering/animation/audio/replay/content/UI are separated. AI and ball rules still share the simulation class; further extraction is justified before networking, not an engine rewrite. |
| 54 | Subtitles, readable selected-player ring and motion-reduction CSS exist. No scalable HUD setting, full non-colour team differentiation or controller remapping. |
| 64–65, 74 | Unit and browser tests cover implemented rules and flows. Safari, Firefox, physical pads, real Android/iPhone, installed PWA, GPU memory and input latency validation remain outstanding. |

## Not implemented

| Master sections | Missing system |
|---|---|
| 5 | Create-a-team, badge editor, kits, player name/appearance editor, custom home pitch and saved formations. |
| 15, 17, 59 | Phone-as-controller QR/session pairing; multiple local input seats; local cooperative/opposing humans; input-to-team lobby. |
| 16, 59, 68 | Web app manifest, icons, installability, service worker, progressive offline caching and update flow. **Current browser build is not an installable PWA.** |
| 18–19, 40, 47, 50–52, 60 | Authoritative multiplayer server, authentication, database, private rooms, matchmaking, ratings, prediction/reconciliation, reconnect, disconnect rules and anti-cheat. Architecture notes are proposals only. |
| 20–23, 61–62, 68 | King of the Pitch, persistent champion/streak, challenger queue, queue rotation, tournament formats/brackets/tables, public tournament pages and input-isolated live spectator clients. **The flagship winner-stays mode is still absent.** |
| 25 | Separate Island, beach, under-bridge, Lekki or other playable location layouts. |
| 35–39, 63 | Street Rep, assists/nutmegs/skills milestones, XP, achievements, cosmetics, accounts/profiles, leaderboards and community meta rankings. |
| 41–43, 63 | Friends, invites, challenges, shareable result image, replay video export, persistent highlights and full spectator rewind. |
| 55–56 | User-generated-content moderation, reporting, analytics hooks and privacy/retention controls. No tracking backend is silently installed. |

## Recommended next vertical slices

1. **Football acceptance:** real-phone and physical-controller testing; repair passing edge cases, receiving, player turning, goalkeeping and the closer camera before widening scope. Add one-touch passing and shot power only with focused tests.
2. **Finish the local MVP:** guided practice, saved squad settings, quality presets and installable/offline PWA; then a deterministic local King of the Pitch prototype with persistent queue and streak.
3. **Spontaneous local multiplayer:** two input seats and a lobby, then phone pairing with expiring credentials and disconnect handling.
4. **Authoritative online foundation:** room server, persistence, reconnect and spectator-only transport; then shared King of the Pitch and tournaments.
5. **Social/progression:** share cards, reputation, rankings and moderation after match integrity is dependable.

The original prompt explicitly says not to build the whole dream at once and not to advance aggressively while football feels bad. The current user criticism means stage 1 acceptance is still open, even though many stage 2 presentation systems now exist.
