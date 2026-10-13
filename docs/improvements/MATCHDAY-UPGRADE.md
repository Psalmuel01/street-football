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

## Next quality gates

- Real Android and iPhone playtesting, especially low-end frame pacing and sustained audio behavior.
- Human review of movement and first-touch responsiveness. Dedicated football cut/stop animations and improved character art remain necessary for a premium console-level appearance.
- Playtest full cup seasons for pacing and difficulty. Currently progress is device-local, not synced to a player account.
- Public rollout of this verified source after reviewing the local preview. Lagos Life review/live-key status remains a separate release task.
