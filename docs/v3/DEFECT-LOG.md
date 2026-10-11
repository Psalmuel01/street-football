# V3 recovery audit — 11 October 2026

Status: NOT RELEASE READY. Scope is the single local 5v5 match. No deployment authorized by this gate.

Evidence distinguishes source inspection, synthetic inputs, browser inspection and human acceptance. Automated matches are bot-driven playthroughs, not human playtests. Physical gamepad, iPhone, Android, thermal and cultural voice acceptance remain untested.

| ID | Severity | Finding | Evidence | Acceptance / disposition |
| --- | --- | --- | --- | --- |
| MOT-01 | P1 | Asset loading discards embedded animations; procedural clips always win. | `prepareCharacterAsset` calls `buildClips` after GLB load. | Load and validate rig-compatible embedded clips; retain labelled prototype fallback. |
| MOT-02 | P1 | Current locomotion consists of sine curves plus overriding two-leg IK, without authored cuts or acceleration clips. | `animation/clips.ts`, `character.ts`; baseline footage. | Requires a licensed coherent football motion set and artist retargeting; cannot claim authored motion from new procedural curves. |
| MOT-03 | P1 | Turn rate is fixed at 7 rad/s even at full sprint; exponential velocity interpolation has no acceleration bound. | `simulation.ts` movement loop. | Shared speed-dependent turning, bounded acceleration and braking; record reversals. |
| MOT-04 | P2 | Unreachable foot anchors clear the plant and skip correction for one frame. | `character.ts` anchor release branch. | Release into a ground-aware swing pose without leaving the previous plant stale. |
| BALL-01 | P1 | Kick release relocates ball to a fixed boot offset. | `releaseKick`. | Strike from the existing ball position; no release displacement. |
| BALL-02 | P1 | Hard-shot keeper parry relocates ball to keeper centre plus 1.1 m despite the comment claiming no teleport. | Ball acquisition branch. | Deflect at collision contact, not at an arbitrary keeper offset. |
| ART-01 | P1 | Generated body and simplified hands/faces do not meet hero asset target. | Asset provenance and close gameplay inspection. | Commission/import licensed stable-rig footballer, separate clothing, LODs; artist review required. |
| AUDIO-01 | P1 | Synthetic Spitch pack is enabled without any stored Nigerian listener approval. | Manifest provider, AudioManager loading. | Default to silence/captions for unreviewed voice clips; only reviewed recorded performances accepted for V3. |
| CAM-01 | P1 | Follow camera at 5.8 m / 11.8 m can lose tactical support; no dynamic zoom. | Camera source and gameplay inspection. | Ball and controlled player composition plus useful neighbours; inspect both viewports. |
| PASS-01 | P2 | Direction/risk scoring exists, but no representative 50-pass intent report. | Passing module and tests. | At least 45/50 uncontested intended outlets with disclosed test cases; human check separate. |
| UI-01 | P2 | Landscape contains player card, shoulder buttons, camera toolbar and radar competing for space. | Responsive CSS; browser capture. | Physical landscape phone match acceptance required. |
| PERF-01 | P1 | Actual low-end mobile frame rate, memory and thermal behaviour unknown. | No physical device evidence available. | 30 fps low-end; 45–60 modern; complete physical match. |
| QA-01 | P1 | No external preference panel or Nigerian culture review is evidenced. | Local artifacts are automation. | Recruit 15-player mix and 10+ comparison preference gate; collect real responses. |

Baseline locomotion invariant probe: spine repeat error 0; max lean 0.172 rad; stance displacement max 0.01868 m/frame, 1194 samples. This checks bounded drift in sampled circumstances, not animation beauty or universal foot lock.

Recordings: `artifacts/locomotion/video/` (current 11 October baseline), `artifacts/v2/video/` (two baseline full-match captures). Do not overwrite older user launch-video artifacts. Full-match reports include machine load and automated driver limitations.

P0: no confirmed crash or unfinishable match at audit start. A passing build alone cannot close any P1 above.

## First local recovery pass

- MOT-01: reviewed complete embedded-pack selection and track validation implemented; no actual licensed replacement delivered. Current GLB remains procedural fallback.
- MOT-03: movement extracted into `simulation/Movement.ts`; bounded momentum and speed-dependent turns implemented. Human comfort remains open.
- BALL-01 / BALL-02: fixed XY relocation at kick release and keeper parry; full visible-contact acceptance still open.
- AUDIO-01: unreviewed synthetic voices withheld. Recorded cast remains missing.
- Pose regression after changes: zero repeated final-pose drift across ten action/locomotion cases, finite transforms, 0.172 rad max locomotion lean, spine resets to zero and hips to [0, 0.96, 0] after stopping.
- Baseline replay browser check failed once at kickoff-owner assertion (3 vs 8), then passed on fresh rerun. Not established as a reproducible simulation defect; monitor instead of calling it fixed.
- Synthetic 50-case clear-direction pass benchmark: 46/50 (92%). Four wrong targets occur on long backward passes where tactical/distance scoring outweighs direction. This satisfies the numerical machine benchmark only, not the requested human intent acceptance. Keep the four cases for tuning.
- Close motion footage: reject as final animation/art acceptance. Procedural gait remains stiff, clothing/anatomy below hero target. Physics invariants are not aesthetic proof.

## User steering: PES-level feel; remove cocky Pidgin

The quality target is contemporary console-football movement, not another procedural-pose polish claim. Captured CMU walk/run samples are now retargeted to the stable rig; sprint currently time-scales the same captured run. Retargeting retains joint timing and captured swing. The old generated swing solver and velocity lean no longer overwrite these clips. A small captured-contact IK correction handles grounded stance only and releases unreachable contacts. Starts, planted cuts, reversals, dribbling and football actions still require a coherent authored pack; hero geometry remains unchanged.

After retargeting: zero repeated pose drift, all sampled transforms finite, max sampled spine lean 0.15661 rad; stop restores neutral spine/hip. These are invariants, not a PES-quality acceptance claim.

Clear-direction passing now scores aim more strongly for ordinary passes; through-pass tactical scoring remains unchanged. The benchmark places receivers inside pitch boundaries and now gets 50/50. This is machine geometry only, not human acceptance.

Callouts rewritten to concise, respectful match description. Removed miss taunts, bragging-rights claims, exaggerated Pidgin and unsolicited player instructions. Empty atmosphere commentary is explicitly ignored. Synthetic audio remains withheld. Natural Nigerian delivery is a real-recording gate, not something inferred from neutral text.

No Konami/PES assets are used. Source motion and commercial-inclusion terms retained in `mocap-source/`; see character CREDITS. Character sculpt/clothing, full football motion set, camera obstruction, physical mobile checks and external playtesting remain open.

Final captured-contact probe: 1260 CPU Three.js samples through walk/run/sprint/turn/stop, including nonuniform character scale. Maximum measured consecutive stance displacement 0.04498 m, 1522 contact samples, max sampled spine lean 0.15806 rad. This passes the existing 0.055 m/frame regression bound, but is NOT perfect foot lock; contact reach and stride matching remain visible-review work. Do not close MOT-02/MOT-04 from this number alone.

Capture infrastructure: parallel browser recording runs hit Playwright screenshot timeouts while waiting for fonts. Those incomplete runs are invalid evidence. Final rig captures completed with no page errors; font-wait bypass affects the capture runner only. Actual device performance remains unverified.

## Final vertical motion correction

Restored actor root-height excursion instead of grounding every individual pose. Each captured cycle receives one ground calibration, preserving airborne stride. Unreachable stance anchors now release before the IK solve. The updated 1260-sample CPU contact probe gives max consecutive stance displacement 1.41e-7 m, 343 contact samples, max spine lean 0.15806 rad. This measures only contacts that remain within reach, not universal locking or human visual acceptance.

Two complete scripted three-minute matches passed before this final render-only root-height correction: desktop 1–5, phone emulation 1–2, no browser errors. These are not human preference tests. Simulation and input were unchanged by the final retarget correction; final rig recordings and pose/stance tests cover the new visual data. Physical mobile performance remains unverified.

Reproducible contact probe: `npx tsx scripts/stance-regression-v3.ts`. Captured run is reused at a faster rate for sprint; no separately captured sprint or football action/turn set is claimed.
