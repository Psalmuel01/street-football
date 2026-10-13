# Phased implementation status

The combined briefs are implemented and verified in this pass. The authoritative acceptance checklist, evidence and remaining external gates are in [COMPLETE-UPGRADE.md](COMPLETE-UPGRADE.md).

| Phase | Result |
| --- | --- |
| UI | Shared presentation system across home, eight clubs, squad, setup, live HUD, pause, replay, results and shop; phone start action; focus/loading/error/storage states |
| Animation | Original procedural cut/stop/receive overlays, normalised blending and retained simulation-owned contact timing; captured gait remains credited |
| Ball and audio | Correct rolling spin, post/crossbar rebound events, every physical contact audible, stride-based footsteps, cancellable crowd/stings; no speech/subtitles |
| AI and difficulty | Three requested levels: Casual, Competitive, Expert; tactical support, open passing lanes, goal-side marking, press and keeper decisions; no level speed/reach boosts |
| Clubs | Eight complete nine-player squads, distinct crests/kits/default tactics/formations and matching original rendered portraits |
| Grounds | Five separate environments with visible rebound boundaries, weather and low-cost static batching |
| Return play | Three-match rotating cup fixtures, legacy save migration preserving records, practice targets and honest unavailable-storage warning |
| Performance | Deferred gait chunk, linear nearest-player search, batched static meshes, simplified/throttled spectators, adaptive Auto quality and development-only measurements |
| Verification | 96 tests pass, production build passes, representative matches for every club/level, responsive and failure-state browser checks |

This replaces an earlier unverified local checklist which described five difficulty levels and checks not yet executed. A recovery copy is kept under ignored artifacts/combined-upgrade/prior-phased-checklist.md. Two initial test fixtures were corrected: one exited before the pending pass contact, and one rejected the valid goal-net area.

Physical-phone performance and independent judgement of premium character art, animation and match balance remain external gates. Browser-size simulations are not physical device tests. No release, credential or submitted-listing changes were made.
