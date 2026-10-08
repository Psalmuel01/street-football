# Locomotion posture and planting

The animation mixer can skip writing a bone property when the sampled value has not changed. Procedural spine offsets were applied with += after evaluation, so those offsets could accumulate on subsequent identical samples. Each rig now retains the clean authored pose, restores it before evaluation, and captures it before any procedural edits. This also isolates recovery, receiving and floor corrections from later animation frames.

Locomotion now uses an explicit lower-body stance/swing solve instead of bypassing planting whenever a player moves. Stance anchors use world space, unreachable anchors release, travel fades out with speed, and hip height allows knee flexion. The solver uses actual shin length and its forward ankle offset. Action animations retain their own contact intent; slide and stumble are not forced into a running stance.

Sharp cuts brake and accelerate along the turning body rather than immediately along raw input. Designated pass receivers retain interception steering; the unobstructed moving-receiver regression still passes.

Run `node scripts/locomotion-check.mjs` with the development server running. It verifies repeated-pose stability, sustained walking/running/sprinting/turning/stopping and records a live keyboard-driven playthrough under `artifacts/locomotion/video/`. Metrics are written to `artifacts/locomotion/metrics.json`. The sampled test has zero repeated-pose spine drift, maximum forward lean around 0.172 radians, and maximum per-frame stance displacement below 0.02 world units. This is a bounded regression, not a claim of perfect motion in every collision or action combination.
