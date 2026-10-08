# Lagos Street Football

A Lagos-inspired, local 5-a-side football game built with TypeScript, Three.js and Vite. Choose a community, pick your five and play on a neighbourhood concrete court. The game uses original stylized characters; the illustrated cover is not a gameplay screenshot.

## Run locally

Use Node.js 22 LTS and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:5173/. To test on a phone, connect it to the same Wi-Fi and open the **Network** address printed by Vite. `localhost` on your phone refers to the phone, not your computer. Your computer must allow incoming connections to port 5173.

```sh
npm test
npm run build
npx vite preview --host 0.0.0.0 --port 4173
```

The build generates `dist/`, including the production service worker. Deploy that directory on an HTTPS static host. Preview serves the production build; the development server does not register the service worker.

## What's playable

- Four communities, squad selection, formations, tactics and rolling substitutions.
- Quick matches with configurable conditions: golden hour, night and rain.
- Practice with no running clock, full stamina, passive outfield opposition, an active keeper, and resettable through-ball/finishing drills.
- Directional passing, through balls, sprinting, skills, keeper saves, sliding tackles, fouls and restarts.
- Goals, contextual crowd reactions, replays, a pause hub and a match report. The conceding team takes the kickoff.
- Follow, Wide and Street cameras, camera zoom, keyboard/gamepad/touch input and home-screen installation.

Use the squad button beside Pause to manage players during a match. Replay uses the selected camera and zoom. Multiplayer, phone-as-controller, tournaments and persistent progression are not implemented.

## Controls

Attack the right goal. The glowing ring identifies your controlled player.

| Action | Keyboard | Controller / touch |
| --- | --- | --- |
| Move | WASD / arrows | Left stick / on-screen stick |
| Short pass | Space | ✕ |
| Through pass | K | △ |
| Shoot | J | □ |
| Lofted pass / defensive slide | L | ○ |
| Sprint | Hold Shift | Hold R1 / RB |
| Switch player | Q | L1 |
| Skill | E | R2 on controller |
| Pass and move | Q + Space | L1 + ✕ |
| Contain / second press / keeper rush | Hold Space / J / K | Hold ✕ / □ / △ |
| Pause | Escape | Start / pause button |

**K is a through pass in possession and keeper rush when defending.** Aim with your movement direction. Sprint consumes stamina in matches. Sliding tackles commit the player to a recovery; mistimed contact can concede a foul.

The bottom-right toolbar switches cameras, zooms with **+ / −**, and requests fullscreen. Two-finger pitch gestures also control camera zoom. Landscape offers more room on phones. How to Play contains graphics and audio settings.

## Mobile and home-screen installation

Use the footer's **Install app** button on a supported browser. On iPhone, open the HTTPS site in Safari and choose **Share → Add to Home Screen**, then launch its icon. Installed mode already provides an app view; browser fullscreen support varies by device.

A plain HTTP LAN address is useful for gameplay testing but does not provide secure-context service-worker support on a phone. Use HTTPS for production installation tests.

The production service worker stores the app shell, fonts, artwork and character assets after an initial online visit. Audio remains online-only. When an update is waiting, the footer offers **Update app**; activation is explicit and unavailable during a match. Touch state resets after interruptions, and backgrounding pauses the match.

Browser automation covers multiple screen sizes and multi-touch signals. It does **not** certify every physical iPhone/Android browser. See [mobile and installation notes](docs/MOBILE-AND-INSTALL.md).

## Audio and commentary

Enable music through the music control; browsers require user interaction for playback. The audio system includes generated instrumental tracks, the bundled licensed **The Afrobeat — FASSounds**, match effects and contextual commentary. Credits and license links are shown in How to Play.

Native commentary uses local clips exported through the Spitch integration. The repository includes a native-voice manifest and recordings; missing lines fall back to captions/crowd effects. Voice authenticity and delivery still require listening review.

To generate or replace recordings, copy `.env.example` to `.env`, set your own `SPITCH_API_KEY`, then run:

```sh
npm run voices:plan
npm run voices:build -- --event=goal
npm run voices:build
```

Generation can incur provider charges. Credentials are build-time only: never prefix them with `VITE_` or commit `.env`. See [native voice setup](docs/NATIVE-VOICE.md).

## Verification and development

```sh
npm test
npm run build
```

Browser checks require a running development server. Install Playwright's Chromium and recording dependency, or use an installed Chrome where supported:

```sh
npx playwright install chromium ffmpeg
npm run test:animation
node scripts/controls-practice-check.mjs
node scripts/locomotion-check.mjs
node scripts/mobile-input-check.mjs
node scripts/mobile-hub-check.mjs
```

`mobile-hub-check.mjs` also requires the production preview on port **4173**. The locomotion and mobile scripts currently target macOS Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; adjust their `executablePath` on other systems. Other browser scripts accept `CHROME_PATH`. Screenshots, metrics and recordings are written under `artifacts/`.

`npm run assets:character` regenerates the original GLB with the development server running. F3 opens the development football readout. Gameplay tuning lives in `src/game/gameplay.config.ts`.

Further notes:

- [Locomotion fixes and motion checks](docs/LOCOMOTION-FIX.md)
- [Gameplay polish](docs/GAMEPLAY-POLISH.md)
- [Architecture and roadmap](docs/ARCHITECTURE.md)
- [V2 football architecture](docs/V2-ARCHITECTURE.md)
- [Original-spec audit](docs/MASTER-PROMPT-AUDIT.md) — historical; some items have since shipped.
- [Character asset provenance](public/assets/characters/README.md)

## Repository hygiene

`.DS_Store` files hold macOS Finder folder preferences. They are not app assets and should not be committed. Git ignores them at every directory level; Finder may recreate local copies harmlessly. Dependencies, production builds, local secrets and test-runner caches are also ignored.
