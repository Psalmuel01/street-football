# Live-match visual pass — 6 October 2026

## What changed

The default Follow camera moved from 10.5 m high / 14 m deep to 5.8 / 11.8; Street is 3.4 / 8.5. Ball-led framing retains anticipation and the radar. Replay is lower and closer, with an opening camera cut instead of a long catch-up movement.

The original model now has shaped palms and separate fingers, revised neck/shoulder forms, continuous shoulder coverage, irregular instanced short hairstyles and five build variations. Fabric weave no longer adds a yellow tint to every kit; skin is less glossy. Kit folds are geometric, not simulated cloth. The rebuilt source is 24,367 vertices / 43,960 triangles / 17 bones; the GLB is approximately 2.07 MB. All 36 portraits were rebuilt from this asset.

Thirteen clips now include a walking gait blended into jog/sprint. Lower-speed foot lift is reduced; directional torso lean, receiving and recovery pose offsets add physical cues. Contact remains owned by simulation timing. The ball's oversized sphere and decorative torus were replaced by a smaller textured sphere, preserving the existing gameplay reach. The selection ring is thinner.

Lighting uses a lower warm key with longer shadows, cool fill and a graded sunset panorama. Ground tint is more neutral. The surrounding scene adds instanced balconies, railings, corrugated roof detail, water tanks, benches, skyline layers and a chain-link fence. Forty foreground spectators include seated, leaning and hand-to-face poses, with less uniform celebration. A bounded 64-particle pool adds dry-ground grit during running.

Auto/Low/Medium/High graphics settings control pixel ratio, shadows and visible crowd. Medium shows 30 spectators; Low shows 20 with shadows disabled. Instanced details share geometry; hidden spectators skip animation updates. These settings do not change football physics.

## Validation

Production build and 43 simulation tests passed. The existing Three.js chunk-size warning remains. Animation checks passed for 13 clips, finite poses, normalized weights, paused poses and sampled strike contact (approximately 7.6 cm in the existing model-space check). This is not proof of perfect foot contact throughout every blend.

Browser flow checks passed on desktop and an emulated 844×390 phone viewport: team/squad selection, substitution, kickoff, direct selection, pause and resume. Quality switching Low → Medium → High → Auto passed without runtime errors.

The six requested scenarios are captured in `artifacts/fidelity/`: kickoff, dribble, duel, shot, replay and wide environment, plus phone landscape. These are deliberately seeded visual drills running the real renderer/simulation and keyboard input, not six organically occurring match events. A recording is saved alongside them. A 300-frame desktop-browser sample with recording enabled measured about 16.7 ms median / 16.7 ms p95 on the final capture run; see `performance.json` for the latest run. Physical mobile performance is unverified.

## Comparison and limitations

The camera now devotes more space to nearby players and exposes the surrounding neighbourhood. Hands, hairstyles, body variation, gait transitions and longer directional shadows are visible at that scale. The ground and background are less isolated than before.

The reference image remains substantially ahead. Faces lack the anatomy and skin shading of a high-quality sculpt; clothing lacks convincing deformation and authored texture variation. Buildings and vehicles still have simple silhouettes. The motion library remains authored procedural animation rather than performance-quality animation. Contact under all changing poses is still approximate. These differences are visible; the hero-image fidelity target is not achieved by this pass.

The next necessary art step is a carefully sculpted, retopologized footballer with authored skin/cloth textures and a coordinated receiving, turning and striking animation set. More geometry or brighter lighting alone will not close that gap.

Open `artifacts/fidelity/comparison.html` through the dev server for the reference, saved before image and all current comparison captures.
