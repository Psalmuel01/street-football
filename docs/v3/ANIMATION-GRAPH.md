# Runtime motion evaluation

Order: restore clean sampled pose → normalize graph weights → sample mixer → store clean sample → bounded receiving/lean additives → stance IK/contact → final pose. The previous final pose never becomes the next base. The existing pose restore is preserved.

Locomotion states: IDLE below 0.15 m/s; WALK below 1.8; JOG below 4; RUN below 6.5; SPRINT above that. TURN denotes heading/travel mismatch > 0.35 rad; STOP denotes braking. The pure graph exposes these classifications to the review harness. Runtime currently uses the four available idle/walk/run/sprint clips; TURN/STOP have no authored clip and remain an open delivery gate. JOG blends walk/run. Do not claim missing authored motion was delivered.

Action overlays use simulation-owned elapsed time and contact, blend in over 75 ms and out over 180 ms, and suppress base locomotion by their exact complement. Windup rotation precedes contact time. Interruption removes action weight at the next sample. Pause repeats the same sample. Locomotion responds in the simulation tick instead of waiting for a clip.

Steering uses 8 rad/s at rest, tapering to 3 rad/s at 9 m/s. Sharp direction changes brake into the cut. Momentum changes are capped at 24 m/s² acceleration and 32 m/s² braking, multiplied by pitch traction. CPU and human use the same function. A designated receiver can move laterally/backward to intercept, with the same momentum cap; the ball trajectory is not steered. Interception anticipation begins within 6 m to avoid a late stop after the momentum change.

Validation: frame-rate-independent acceleration; sprint reversal bounded impulse; normalized weights across action interruption; repeated final-pose drift across ten locomotion/action conditions; sustained turns, sprint/stop; asset track validation; complete scripted matches. Visual and physical-device acceptance remain separate.

Captured walk/run evaluation supersedes the generated locomotion clips in the local build. TURN/STOP are now classified from runtime travel/heading mismatch and deceleration, but still sample the locomotion blend until dedicated clips exist. Captured stance correction is isolated in `IKController.ts`: it uses the captured knee bend plane, small world anchors and a two-bone solve; swing stays captured. Large errors release the anchor rather than stretching a limb. Pitch is currently flat; terrain raycasts remain an open extension. The old stance probe can run against captured gait, but a quantitative contact pass still needs close video inspection.
