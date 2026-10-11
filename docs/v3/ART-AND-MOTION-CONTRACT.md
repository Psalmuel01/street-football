# V3 art and motion handoff

The current model and curves remain a prototype. Renaming a procedural clip does not satisfy the authored-motion requirement. No external motion license or performer consent is claimed.

One stable rig, metres, Y up, +Z forward, neutral root. Preserve the names and hierarchy exported by `boneLayout` for the first incremental import. Body and kit material names are `skin`, `kit`, `kit-sleeve`, `shorts`, `socks`, `boots`, `hair`. Separate jersey and shorts must be skinned to that rig. Additional face/finger bones may be added, but the core bones must not disappear. Bake retargeting offline; validate deformation at knees/shoulders and at every action contact.

First delivered asset must contain the complete currently supported runtime clip set: idle, walk, run, sprint, pass, shot, tackle, slide, stumble, skill, keeper, catch, diveLeft, diveRight, celebrate. Actions keep simulation-owned contact markers from `actions.ts`. Export no locomotion root translation: simulation owns world travel. Additional cuts, starts/stops, strafes, receives, driven/through/loft passes and keeper recoveries follow as a complete coherent motion pack; do not map unavailable actions to misleading labels.

For each source retain: creator, original URL or invoice, license text, redistribution permission, changes, rig version, scale, clip names, contact time, foot contacts and reviewer/date. Artist deliveries require a review sheet and close motion video, not only a successful GLB parse. Runtime must prefer valid embedded tracks over generated curves.

Reference boards should use footage from this game and licensed artist references. Desired direction: stylized realism; anatomically coherent silhouettes, worn concrete, warm light, muted shops and kits, readable football broadcast composition. Do not imply photoreal hero fidelity with concept art. No new cover imagery should be generated to conceal the current character gap.

Required boards:
- Character: front/side/back neutral body, hands, knees, boots, actual rendered kit, near/mid/far LOD.
- Animation: side/front locomotion contact sequence; 90° cut and 180° reverse; pass and shot contact; receiver preparation; slide body/ball collision; keeper set/dive/recovery.
- Pitch/light: actual court, ground roughness, fence scale, balconies, shade, skyline; golden-hour lighting remains the rescue pitch.
- Camera/UI: controlled player plus nearest 2–4 useful players, attack space, landscape clear controls, readable radar.
- Audio: recorded Nigerian performances only, with explicit cultural approval against exact clip hashes; ball/player/whistle/crowd take precedence over music.

External gates: approved licensed artist deliverables, real Nigerian recordings and reviewers, 15-person test panel, physical iPhone / midrange Android / low-end Android. These cannot be fabricated by automation.

GLB scene extras for reviewed motion: `motion: { rigVersion: 1, source: "source URL or delivery ID", license: "redistribution license", author: "creator", reviewed: true }`. This is delivery metadata, not proof of legal clearance; retain the source license separately. The runtime validates a complete pack and explicit bone transforms. Legacy exports without this metadata use the labelled procedural fallback. Bake every core rotation plus pelvis position in every clip. Action durations must equal `actionTiming`; align actual boot contact to its `contact` time during retargeting. Other root translation is rejected. Gait sampling uses each imported clip's duration.
