# V2 progress — football foundation, 6 October 2026

This is a completed implementation increment, **not completion of the full V2 brief or its visual acceptance bar**.

## COMPLETED

Audited the current boundaries and documented the remaining architectural weaknesses in `V2-ARCHITECTURE.md`. Extracted passing selection/prediction and central tuning. Retained fixed-tick contacts, replay isolation, legal substitutions and conceding-team restarts.

## FOOTBALL

- Directional receiver scoring considers distance, lane interception risk, openness, forward value and receiver motion. Implausible backward candidates are rejected.
- Passes solve a meeting point at contact. Ball flight no longer steers after the receiver changes direction. Through passes target space beyond the runner.
- Reception retains damped incoming velocity. Short input buffering enables one-touch passes. L1 + Cross starts a forward run, including when L1 is held before Cross.
- Dribbling uses timed impulses with stride-side variation and longer sprint touches. Excessive separation releases possession. The old skill-position teleport was removed.
- Held defensive controls support contain, second pressure and keeper rush on keyboard, gamepad and touch.
- Attacking AI supplies recycling and forward outlets. CPU difficulty no longer multiplies running speed. Decisions/challenge ranges/keeper anticipation vary instead.
- Shots use directional aim, keeper position, pressure and balance. Tackles require facing at contact and retain anti-ping-pong recovery. Back-passes to keepers no longer invent saves or hard-shot parries.
- Distant selected players can be replaced by a nearer defender after a possession loss; recent manual selection has a two-second grace period.

## VISUALS

Follow / Wide / Street camera cycle; Street frames the action closer. Reduced the excessive wet-court specular glare. Replay shows scorer and score. No replacement character asset or new animation clips were delivered in this increment; the major realism gap remains.

## UX

Existing home → community → squad → setup → match → results flows retained. Touch buttons display their defensive role, and landscape camera controls moved clear of Cross. F3 opens a development-only tuning readout. Controls dialog documents the new inputs.

## VALIDATION

- Production build passes, with the existing 545.7 kB Three.js chunk warning.
- 43 deterministic tests pass, including no homing, moving receivers, blocked lanes, through space, input expiry, one-touch, pass-and-move, first touch, fair CPU speed, manual-selection grace, back-passes and tackle recovery.
- Browser checks pass for held/edge keyboard-gamepad-touch inputs, three camera modes, debug visibility, routes, squad swaps, pause/resume, goal replay, restart ownership and rematch.
- Shipped animation checks pass: finite poses, normalized weights, frozen pause, strike heading and approximately 8 cm sampled boot/ball contact. These checks do not establish natural animation quality.
- Two real-time, three-minute **scripted-input** browser matches reached full time without shortening the clock or injecting goals. Desktop dry match: 2–7, 26/30 human-side passes completed. Phone-sized wet match: 3–4, 22/23 human-side passes completed. These are scenarios, not universal accuracy guarantees.
- Both recorded runs measured median and p95 frame intervals about 16.7 ms in desktop Chrome. The phone run uses an 844×390 emulated viewport on the same computer, not a physical phone. Video capture was enabled. Final small camera, selection-grace and keeper-back-pass corrections were covered by targeted checks after those full runs.
- Motion was inspected through extracted video frames, and desktop/mobile screenshots were reviewed. Human enjoyment, physical controllers, physical phones and mobile Safari remain unverified.

## SCREENSHOTS

Saved under `artifacts/matchday/`: `home.png`, `communities.png`, `squad.png`, `match.png`, `goal.png`, `night-replay.png`, `substitution.png`, `results.png`, `phone-match.png`.

Additional `artifacts/v2/`: `desktop-kickoff.png`, `desktop-play-2.png`, `desktop-play-6.png`, `desktop-results.png`, `phone-kickoff.png`, `phone-play-6.png`, `phone-results.png`, `street-camera.png`, `debug.png`, and `movement-review.png`. Full recordings are in `artifacts/v2/video/`; measured event/timing reports are `desktop-report.json` and `phone-report.json`.

## REMAINING QUALITY GAPS

Characters still look procedural, with weak hands, facial character, fabric and body variation. First-touch physics lacks a matching receiving-foot animation. Locomotion/turning still needs a stronger authored animation set. Defensive marking, collision deflections, power/placed shots, richer tactics/formations, expanded attributes, event-based results and quality presets remain incomplete. Intro, crowd memory, broader route restructuring and King of the Pitch have not been built. No online work was started. The visual target is not met.

## NEXT PRIORITY

**Character and football animation rebuild:** an original credible player asset and a coordinated walk–run–dribble–receive–turn animation set, judged in live play at desktop and phone sizes before expanding modes.
