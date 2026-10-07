# Original visual assets
Generated with the built-in OpenAI image generation tool. No stock artist or sports-brand assets.

- `public/assets/art/lagos-cover-v1.jpg`: original Lagos street football cover illustration, optimized from the retained PNG at `artifacts/lagos-cover-source-v1.png`. Prompt requested widescreen cinematic sunset cover art, a fictional adult Nigerian footballer in a plain yellow/green kit, believable dribbling anatomy, worn concrete, neighbourhood balconies, spectators, water tanks and a danfo-inspired bus, with quiet space on the left for typography. No logos or text. A second edit explicitly removed all clothing logos while preserving the scene. This illustration is labelled cover art, not gameplay.
- `public/assets/art/court-concrete-v1.jpg`: generated albedo texture used by the actual 3D court. Prompt: “Generate a seamless square top-down orthographic material photograph of weathered sun-bleached concrete with dusty warm gray and sandy beige tones, faint worn remnants of desaturated green court paint, fine aggregate, tiny hairline cracks, subtle darker wear patches and small scuff marks. Entire image is only flat floor material, even diffuse lighting, no shadows, no horizon, no perspective, no objects, no people, no grass, no text, no painted court lines. Natural, low contrast, tileable surface.”

Music and 3D geometry are source-authored. No commercial recording is bundled. The runtime environment remains stylized; cover illustration fidelity is not a claim about rendered match fidelity.

## Local typography and character cards
Teko (display) and Sora (UI) are self-hosted in `public/assets/fonts`, with their SIL Open Font License files. Character card PNGs in `public/assets/portraits` are deterministic Three.js renders of the original in-game GLB, built by `scripts/build-portraits.mjs`; they are not photographs or separate generated likenesses.

## Match voices
`scripts/build-voices.py` contains the authored lines and generic voice choices. Fifteen short clips in `public/assets/audio/voices` were synthesized using the Nigerian-English `en-NG-AbeoNeural` and `en-NG-EzinneNeural` voices through the [edge-tts build utility](https://github.com/rany2/edge-tts). No voice cloning or public-figure imitation was requested. The browser plays bundled files and makes no runtime request to the speech service. These are synthetic prototype performances; a commissioned or release-cleared voice pack remains a production task.

## 6 October live-match fidelity pass
Player hands/shoulders, instanced hair, panorama, neighbourhood geometry and gait changes are original code-authored work in this repository. No external character, celebrity likeness, brand or animation asset was imported. The user-provided hero image is copied into the local comparison artifact as a reference only. It is not composited into live gameplay. The regenerated GLB and portraits use the same original source/export pipeline.

## Original contextual music pack
The ten AAC arrangements in `public/assets/audio/music` are generated from the original Web Audio composition in `src/game/audio/composition.ts`, parameterized by `catalogue.ts` and exported with `scripts/build-music-pack.mjs`. Percussion, bass, guitar-like plucks and melody are synthesized; there are no external recording samples or artist imitations. The manifest retains tempo, variant, duration and render peak. Sonic authenticity remains a listening evaluation, not a claim established by code or provenance.

## Online Afrobeats recording — 6 October
The active menu and pitch radio now use “The Afrobeat” by FASSounds, downloaded from its Pixabay page under the Pixabay Content License. See `public/assets/audio/music/licensed/CREDITS.md` for source, author, terms and Content ID status. In-game credits appear in Controls. This supersedes the earlier statement that all bundled music is source-authored. Original synthesized tracks remain for intro/result accents and in the source pack.
