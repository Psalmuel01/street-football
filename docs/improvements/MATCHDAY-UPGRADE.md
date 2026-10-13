# Matchday upgrade checklist

Goal: a more responsive, polished football game with grounded movement, real crowd reactions and reasons to return. PES is a reference for responsiveness and presentation, not a claim of equivalent production quality.

- [x] Movement: momentum through cuts, softer action braking, speed-matched gait and body balance.
- [x] Ball feel: controlled close touches, longer sprint touches, directional first touch.
- [x] Audio: silence spoken commentary; licensed recorded applause, cheering and gasp; no reactions after pause/exit.
- [x] Grounds: three selectable venues with distinct pitch colours and surroundings, independent weather.
- [x] Return play: saved three-match neighbourhood cup, results and personal bests, restartable season.
- [x] UI: consistent setup cards, legible match HUD, accessible targets and safe areas, phone/landscape/desktop checks.
- [x] Verification: gameplay regressions, cup persistence, audio lifecycle, build and browser play checks.

Work on source and local preview first. Keep the submitted Lagos Life listing intact. Release after validation; production rollout is separate from this implementation pass.

## Implemented and verified — 13 October 2026

- Movement uses gentler acceleration and bounded braking during passing/shooting actions instead of an instantaneous stop. Captured gait receives a restrained directional bank and braking balance.
- Dribble contact spacing and reach vary with speed. Reception cushions the incoming ball into a moving receiver's travel direction without teleporting it.
- Spoken playback code, voice settings and commentary subtitle element are removed. Goal announcement is GOAL! Recorded CC0 applause, cheers and gasps replace the synthesized event reactions. Active and pending reactions cancel on host pause, manual pause, tab hiding and leaving the match. Crowd previews work in the controls dialog. These are generic audience recordings, not Nigerian speech; provenance is in public/assets/audio/crowd/CREDITS.md.
- Surulere retains street shops, road traffic, vendors and palms. Marina hides that entire environment and adds open water, docks, boats, cranes and containers with a blue painted court. Arena hides the street and adds a roofed terrace bowl, 384 instanced seats, club banners, tall lighting towers and a striped green surface. Weather is independent of venue.
- Area Cup visits each of the other three neighbourhoods. Wins/draws earn 3/1 points; 7 points wins the season. Completed results, titles and best points persist locally. Starting a new season keeps records. Unfinished matches do not resume after reload. Opponent selection is disabled during the cup; the saved season fixes the team until a new season is chosen.
- Setup preferences and touch size persist. Phone/landscape HUD targets, labels, focus outlines and camera/control spacing were improved. Results identify the selected ground.

Verification: 76 tests pass; production build passes with the existing large-bundle warning. Tests cover momentum/pass/reception regressions, cup save corruption/title idempotency, venue visibility and delayed audio cancellation. Browser checks cover desktop setup, phone portrait (actual 360 × 812) and landscape (844 × 390), kickoff, pause, crowd preview and all three grounds. No horizontal phone overflow or commentary subtitle DOM, and no browser console errors in these checks.

Local screenshots: ignored artifacts/matchday-upgrade/. Generated video and screenshot artifacts remain excluded from Git. Working preview: http://localhost:5175/. This pass has not been pushed/deployed and has not changed the submitted Lagos Life listing.

## Interface, difficulty and match-flow pass — 13 October 2026

Detailed item-by-item status, including everything deliberately left open, is in
`docs/improvements/PHASED-CHECKLIST.md`. This section is the summary.

- Loading and failure are now visible states. `#boot-screen` covers the first frames of `boot()` and reports what it is doing; a failed boot explains itself, is announced as an alert and offers a retry. The screen is moved out of `#app` because that container is made `inert` while the game boots, which previously hid the message from assistive technology and blocked the retry.
- Route changes are announced through a visually hidden live region, and focus moves to the new screen's landmark on a real navigation.
- The in-match announcement is only written when the message changes, so `GOAL!` is announced once instead of on every frame.
- The Area Cup panel lists its three fixtures as an ordered list with opponent, score, result and which match is next, plus a points/titles summary and a plain sentence about what lifts the cup.
- The scoreboard shows a kit chip per team so the two sides are separable at a glance.
- Difficulty is now five described levels (`Street`, `Normal`, `Hard`, `Elite`, `Legend`) defined once in `src/game/gameplay.config.ts`. A level changes reaction time, pressing distance, keeper read, marking, shape, pass vision and composure — never speed, acceleration, reach, tackling contact or ball physics, and never the tier your own AI team-mates play at. The old hard-coded `[...][this.difficulty]` lookups are gone, so an out-of-range saved value now clamps to a real level instead of silently disabling CPU decisions.
- The CPU carrier picks its action from distance, shooting lane and composure instead of firing on sight; a rushed side settles for its second-best pass target. Organised sides mark runners goal-side and send a second player to the ball in their own half.
- The last orphaned `#commentary-caption` stylesheet rule and the comment that still contained the token were removed. Spoken commentary and subtitles are not part of the game; the announcement remains `GOAL!`.
- The level description under the difficulty select is wrapped onto its own full-width line. It was previously a third child of a `space-between` flex row and rendered inline beside the select.

New regression tests live in `tests/matchday-phases.test.ts`: five real levels with monotonic decision quality, identical running speed at every level, a harder level releasing the ball sooner, more players committed to the ball at an organised level, the pass contact frame, contact timings falling inside their own action, possession hand-over and passer credit, a rushed side choosing a different target, one second of ball flight matching at 60 Hz and 120 Hz, and 200 simulated seconds at the hardest level staying finite, in bounds and countable.

Verification: see the verification log in `PHASED-CHECKLIST.md`. The test suite, type check, production build and browser checks have not been re-run since these edits landed — the command-safety classifier refused every execution attempt in this session. The commands to run are `npx tsc --noEmit && npm test && npm run build`, then `node scripts/browser-check.mjs`. Until those complete, the items above are implemented and reasoned through, not observed passing.

## Next quality gates

- Real Android and iPhone playtesting, especially low-end frame pacing and sustained audio behavior.
- Human review of movement and first-touch responsiveness. Dedicated football cut/stop animations and improved character art remain necessary for a premium console-level appearance.
- Playtest full cup seasons for pacing and difficulty. Currently progress is device-local, not synced to a player account.
- Playtest the difficulty curve in a real match. In particular the shot-selection range and the keeper dive window have to be tuned together: the keeper only commits to a dive when the ball arrives inside its reaction time, so a level that shoots from further out is exploiting the same keeper limitation at every level. The tier values are a reasoned first pass, not a measured one.
- Measure, then optimise. `Match.nearest()` is now called up to roughly twenty times per simulation step (twice for the ball chasers, once per player in the marking and pressing checks) and still allocates through `filter().sort()`. That is a plausible source of garbage-collection churn on a low-end phone, but nothing has been profiled.
- Human design pass on `src/style.css`. It is ~83 KB of hand-minified CSS that has grown by repeated override passes (`.hero h1` is redefined nine times). It works, but consolidating it needs eyes on every screen; a blind rewrite is a regression risk.
- Public rollout of this verified source after reviewing the local preview. Lagos Life review/live-key status remains a separate release task.
