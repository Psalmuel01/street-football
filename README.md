# Lagos Street Football

Original Lagos-inspired 5-a-side football. First playable local vertical slice.

```sh
npm install
npm run dev
npm test
npm run build
```

Open the Vite URL, choose a community and press **Play ball**. Attack the right goal. WASD/arrows move; Shift sprint; Space pass; J shoot; K through pass; L loft/tackle; Q switch; E skill; Escape pause. Standard gamepads and touch controls have input adapters.

Includes one procedural 3D court, four community kits, 5v5 AI, configurable matches, score/time, pause, results and a practice match. Match audio includes original music, synthesized effects and bundled Nigerian-English Pidgin callouts. This is not yet an online game or installable PWA.

See [architecture and roadmap](docs/ARCHITECTURE.md) for the repository assessment, multiplayer design, model, performance strategy, milestones and known limitations.

Browser checks (with the dev server running):

```sh
npx playwright install chromium
node scripts/browser-check.mjs
node scripts/input-check.mjs
node scripts/matchday-check.mjs
node scripts/replay-check.mjs
node scripts/conditions-audio-check.mjs
```

Alternatively set `CHROME_PATH` to an installed Chrome executable. Input checks emulate device signals; they do not certify physical gamepad or phone performance.

The character pass adds a reusable skinned GLB, timed pass/shot contact, standing tackles, keeper catches/parries and goal celebrations. Use **Stand / Run / Shoot / Tackle / Save** in the squad preview, or switch **Follow / Wide** on the court for a closer view. These characters remain stylized.

```sh
npm run assets:character  # regenerate the original GLB; requires running dev server
npm run test:animation    # validate rig/contact and render a motion study
```

Asset provenance and constraints are recorded in `public/assets/characters/README.md`.

### Visual and controls update
The landing uses rounded raised cards, self-hosted Teko display headings and Sora interface labels. Original cover art is labelled separately from actual gameplay. The match has a textured concrete surface, weathered buildings, moving vehicles and pavement pedestrians. Characters remain original stylized skinned models; the game is not photorealistic.

Touch/controller actions: ✕ pass, △ ground through ball, □ shoot, ○ lofted pass when in possession / tackle when defending. L1 switches players; R1 holds sprint. Keyboard: Space pass, K through, J shoot, L loft/tackle, Q switch, Shift sprint, E skill.

Music is an original 106 BPM Naija-inspired synthesized instrumental, **Lagos After Hours**, composed in `src/game/audio/composition.ts` without sampled songs. Tap Music or the record player to enable playback. Volume and effects settings persist; music starts only after interaction and ducks during matches. Build source: `scripts/build-music.mjs`; distribution: `public/assets/audio/lagos-after-hours.m4a`.

### Matchday flows and current scope
Open `/#/home`, `/#/clubs`, `/#/squad` or `/#/setup`. Choose a starter and a reserve to edit the five. During a match, use the squad icon beside Pause to make rolling substitutions or choose the controlled player. Closing squad management returns to that match. Tap/click a player on the pitch or use L1/Q to switch.

The default follow camera now shows part of a 60 × 36 metre court. The radar shows offscreen players; FOLLOW/WIDE changes the view. Goals trigger a short recorded-state replay with skip and pause support, then the conceding side restarts with possession. Press ✕/Space for your kick-off pass.

Setup offers golden hour, floodlit night and rain. Wet conditions reduce grip and increase ball skid. In How to Play, voice and effects controls accompany music volume. Pidgin callouts use bundled generic Nigerian-English synthesized voices; they are not recordings of actual residents or public figures.

The complete original-spec audit is in [docs/MASTER-PROMPT-AUDIT.md](docs/MASTER-PROMPT-AUDIT.md). PWA, phone-as-controller, multiplayer, King of the Pitch, tournaments, online spectators and progression remain unimplemented. The cover is illustration; the playable models do not yet match its photorealism.

### V2 football-feel work

Passes now select an open directional outlet and predict its meeting point once at boot contact. They no longer home toward a teammate after launch. Triangle leads a run into space; a pass pressed within 0.32 seconds before reception is buffered for one-touch play. Hold L1/Q with pass for pass-and-move. When defending, hold Cross/Space to contain, Square/J for a second presser, or Triangle/K to rush the keeper. Circle/L remains the standing tackle.

In development, F3 shows the football tuning readout. Physics/decision constants live in `src/game/gameplay.config.ts`; target selection lives in `src/game/football/passing.ts`. See `docs/V2-ARCHITECTURE.md` for the audit and outstanding quality work. Full-match recordings are scripted playtests, not physical phone or human enjoyment validation.
