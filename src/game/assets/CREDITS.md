# Character source credits

The facial mesh in `human-head.json` is derived from MakeHuman's base human mesh and African male young morph, released under CC0 (September 2020), as stated in each source file's header.

- Base: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj
- Morph: https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/targets/macrodetails/african-male-young.target
- License: https://creativecommons.org/publicdomain/zero/1.0/

The morph deltas were applied to the base vertices. Head faces above Y=7.35 were extracted, triangulated, scaled and attached to this game's head bone. The body, kits, rig and animation code are local game assets. No MonkeyPost assets are included.

## V3 captured locomotion evaluation

Walking (subject 35, trial 01, frames 80–205) and running (subject 09, trial 01, frames 8–95) come from the CMU Graphics Lab Motion Capture Database. Actual actor motion is retargeted offline to this game's stable rig, mirrored into its coordinate convention, stripped of world travel and baked into quaternion tracks. A 15% seam blend closes each cycle. The sprint variant is a faster sample of the captured run, not a separately captured football sprint. Football-specific turns, dribbling, receives and actions are still missing; this is an evaluation, not a completed football motion set.

- Source and terms: https://mocap.cs.cmu.edu/
- Walking: https://mocap.cs.cmu.edu/subjects/35/35_01.amc and https://mocap.cs.cmu.edu/subjects/35/35.asf
- Running: https://mocap.cs.cmu.edu/subjects/09/09_01.amc and https://mocap.cs.cmu.edu/subjects/09/09.asf
- Source terms permit inclusion in commercially sold products, but prohibit direct resale of motion data even in converted form. Original source/terms are retained under `tools/motion-review/cmu-source/` for audit. Do not market or sell those raw files or this conversion as an animation asset pack.
- Required acknowledgment: The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.
- Conversion: `scripts/retarget-cmu-v3.mjs`; output: `cmu-gaits.json`. No Konami/PES/eFootball assets are used.
