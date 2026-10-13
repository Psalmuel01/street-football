# Combined football upgrade — 13 October 2026

Both attached briefs are the scope. Source/local verification only; no push, deployment, credential or listing changes. Servers started for verification will be stopped afterward (the later brief's explicit lifecycle instruction).

## Acceptance checklist

- [x] Unified UI: all routes, professional setup/selection, consistent controls, focus/errors/loading, responsive screenshots.
- [x] Animation: speed/pose transitions, dedicated original cut/stop poses, reception balance and contact regression checks. Procedural work must be labelled honestly.
- [x] Ball feel: spin/impact presentation, fair first touches/flight and shared physics.
- [x] AI/difficulty: Casual/Competitive/Expert alter choices and organisation, never physical abilities; useful support/marking/pressing.
- [x] Eight teams: distinct crests/kits/rosters/playstyles, balanced ratings, no missing portrait requests or four-team assumptions.
- [x] Five grounds: yard, waterfront, arena, residential cage, sandy community ground; distinct surroundings, independent weather, matching playing dimensions.
- [x] Audio: no speech/subtitles, GOAL! announcement, bounded/cancellable recorded reactions and ball/whistle/post effects.
- [x] Cup/practice: three-match seasons with eight-team fixtures, migration preserving old records, clear progress and practice targets.
- [x] Performance: measure browser frame timing/render workload, reduce repeated allocations and large startup imports; inspect resource cleanup and quality controls.
- [x] Verification: test suite/build, representative matches, all grounds, phone/landscape/tablet/desktop, screenshots; local server stopped.

## External quality gates

Physical Android/iPhone testing and independent human judgement of premium art/animation are not implied by automated/browser tests. No professional-console quality claim. Local progress remains device-local.

## What changed

1. A shared presentation stylesheet now covers home, clubs, squad, setup, HUD, pause, replay, results and cosmetics. Eight club cards include useful style descriptions. Setup offers five illustrated ground choices, clear difficulty descriptions and a fixed phone start action. Club/setup/touch preferences persist; saved obsolete difficulty indices clamp safely. Boot errors expose a retry, route changes announce/focus their destination, and blocked cup storage displays an honest warning.
2. Original procedural cut-left, cut-right, stop and receive poses blend with the credited captured gait. Blend weights remain normalised. Simulation-owned kick contact times are unchanged; the early kickoff tap is now accepted immediately. These additions are not new football motion capture or a console-quality asset pack.
3. Dribble/reception physics remain shared and tested. Rolling spin follows ball radius, posts/crossbar rebound with an impact event, and visible rebound boards use the simulation boundary coordinates. Physical contact sounds are no longer gated by the removed speech cooldown. Footsteps follow stride contacts; crowd/music stings cancel on pause/exit/hidden state. No speech or subtitles are reintroduced; GOAL! remains the announcement.
4. Casual, Competitive and Expert affect decisions, pressure, marking and keeper commitment. Support players open passing lanes; possession/counter/compact/high-press plans produce different spacing and choices. Identical players retain the same physical abilities at every level. Nearest-player lookup no longer allocates/sorts arrays on every call.
5. Added Ikeja Athletic, Lekki Waves, Ikorodu Rovers and Victoria Island FC. All eight clubs have nine-player rosters, balanced overall ratings, distinct crests/kits/default plans/formations and existing portrait files. New portraits are original renders of the same character identities used on pitch. The reproduction tool and source credits are included.
6. Residential Cage adds close apartments, balconies and tall mesh fencing. Community Sands adds an open horizon, pavilion, palms and a firm-sand surface. The original yard, waterfront and arena retain separate environments. Sand is visual/firm-ground variety, not a hidden physics modifier. Weather affects both sides equally. Static environment batching and spectator LOD reduce render work; boats gently move with presentation time.
7. Cup seasons remain three matches. Explicit fixtures rotate through seven rivals across seasons. Legacy four-club saves retain their original fixtures/results/titles/best points. Practice shows passing/finishing targets. Progress is local; unfinished matches are not resumed from a save and no cloud progression is claimed.
8. Auto quality can step down under sustained frame pressure; manual quality choices remain respected. Spectator heads and pose update frequency are cheaper while playable models remain detailed. Captured gait data is a separate lazy chunk, allowing the shell to initialise before parsing that data.

## Executed verification

- `npm test`: **96 pass, 0 fail**. Includes every club × every difficulty in representative matches; speed invariance; cup migration/rival coverage/title idempotency; valid portraits; blend/contact timing; ball flight, post contact and long-match stability; static batching; audio cancellation; existing SDK and purchase regressions.
- `npm run build`: passes. Main application chunk approximately 459 KB (159 KB gzip); gait chunk 263 KB (99 KB gzip); Three.js 548 KB (139 KB gzip). The Three.js chunk still triggers Vite's >500 KB warning. Splitting is not a claim that total download size fell by the same amount.
- `node --check scripts/build-portraits.mjs` and `git diff --check`: pass.
- All five grounds inspected/captured at desktop 1366 × 900, phone 390 × 844 and landscape 844 × 390. Client widths exclude scrollbars; every recorded setup check reports no horizontal overflow. Additional gameplay check at 360 × 780 and squad check at tablet 768 × 1024.
- Normal browser checks: club selection/persistence, new squad portraits, live match/kickoff, pause, setup, controls and ground switching. No console errors in the sampled normal game checks and no subtitle element.
- Results/pause/squad/shop checked with labelled local UI fixtures. Mock kit purchase/owned selector/restore exercised without real money, API keys or platform submission. This is frontend fixture validation, not a new live-payment certification.
- Forced boot failure shows a visible retry. Forced unavailable local storage shows the cup progress warning. The deliberately forced error is expected and separate from normal console checks.
- Development-only render sample: cage reported ~1,012,314 triangles/479 draw calls before spectator LOD work and ~636,320 triangles/471 calls afterward; the latter sampled ~60 FPS and p95 17.6 ms. Different warm-up/viewport conditions mean these are observations, not a controlled hardware benchmark or a promised frame rate. Local boot preparation samples were 164–272 ms, excluding full network/download timing.

## Artifacts and release boundary

Screenshots and JSON checks are under ignored `artifacts/combined-upgrade/`. Labelled fixtures are under `tools/` and are not production entry points. New production portraits are game assets under `public/assets/portraits/`, not verification screenshots. No generated videos, credentials or temporary outputs were added to Git.

Both local Vite previews on ports **5175 and 5176 were stopped** and listener absence verified. To review again, run `npm run dev -- --port 5175`, then open http://localhost:5175/. No push, deployment, credential change, live-payment switch or submitted-listing edit was performed.

## Remaining gates

- Physical Android/iPhone playtesting, including low-end frame pacing, audio, safe areas and orientation.
- Human review of full-season difficulty balance, movement/first-touch feel and whether the art meets the desired premium bar. Current character art and procedural overlays do not establish PES parity.
- Professional football-specific authored animation/art can improve this further; current provenance remains explicit.
- Cold production/network and service-worker installation profiling; desktop viewport checks are not a device/performance guarantee.
- Explicit authorization before publishing/deploying these local changes. Hosted Lagos Life review/live keys remain a separate release task.

### Keyboard and contrast follow-up
- Shift sprint accepts the keyboard modifier flag as well as left/right Shift key codes; key release, blur and reset clear held sprint. Match start focuses the court.
- Secondary-button hover retains light text on a dark green fill; mode, formation, pause and motion controls use paired hover colours and visible keyboard focus.
- Lagos Matchday Arena is the first/default ground. Valid saved ground choices remain respected.
- Validation: 98 tests pass; production build passes. The temporary preview was stopped. Browser visual verification was unavailable because the in-app browser provider was not available in this session.

### Card containment follow-up
- Venue columns now adapt to the available panel width rather than only the viewport breakpoint; long venue labels wrap inside each card.
- Shared setup, club, squad, report and shop grid children can shrink, long labels wrap, and selects stay inside their panels. Formation controls wrap when space is limited.
- Production build passes. Browser automation inventory exposed no browser surfaces, so responsive visual verification remains unverified.
