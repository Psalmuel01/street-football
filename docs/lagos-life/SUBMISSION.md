# Lagos Life submission

Status: implementation prepared and locally verified; not registered, sandbox-tested, or approved. Developer explicitly authorized Agreement v1.0 acceptance and free-only draft creation on 13 October 2026; account sign-in is pending.

- Game: Lagos Street Football
- Public URL: https://street-football.quikdb.net/
- Developer name (proposed): Samuel Dahunsi
- Contact: provided in the registration form; not stored in the repository.
- Category: Sports
- Mode: Single player against the CPU; free-only. No online multiplayer or paid products.
- Short description: Play 5-a-side Lagos street football. Pick your neighbourhood team and take on the computer by touch or keyboard.
- Long description: Play short 5-a-side matches on Lagos-inspired street courts. Choose a neighbourhood team, adjust your formation, and use passes, shots, tackles and player switching to take on the computer. Supports touch controls, keyboard and gamepad. Includes match replays and different court conditions. This version has no online multiplayer or in-app purchases.
- Icon: public/icons/icon-512.png
- Screenshots: capture the deployed integration build at 375 × 812 before submission; use 3–5 actual gameplay/menu screenshots. Do not submit old motion-review or cinematic renders as gameplay evidence.

## Integration

`src/platform/lagos-life.ts` loads the official hosted SDK only inside a frame and initializes it. It installs pause/resume callbacks before initialization so host events aren't missed. Host pause freezes game/replay timers, clears input and suspends the audio context/media playback. Resume retains a player's manually paused match. No account/session data is persisted, and no secrets belong in the client.

Embedded views hide the fullscreen button and skip PWA installation/service worker registration. Standalone play retains those features. Existing settings gracefully tolerate unavailable third-party storage.

`public/_headers` is for hosts that support that file. nginx does **not** interpret it: apply `deploy/lagos-life-nginx.conf` in the actual server configuration. Check the deployed response for CSP frame-ancestors and the absence of conflicting X-Frame-Options. The current QuikDB host returned HTTP 200 on 13 October 2026, with neither header; the live integration has not yet been deployed.

## Required external steps

1. Sign into Lagos Life and confirm the Developer Agreement v1.0 before creating the draft or using the real SDK.
2. Register the URL above, leaving webhook empty and products absent for the requested free-only launch.
3. The published review checklist requires purchase tests and server verification, without documenting an exemption for free-only games. Verify whether the dashboard waives those items; if not, request a waiver from Lagos Life. Do not invent a paid product or mark a test complete without evidence.
4. Open the real sandbox and verify SDK init, touch play in portrait, host pause/resume, and audio after the first tap. Unit tests use a mock SDK and do not establish sandbox acceptance.
5. Complete the listing, upload the icon/screenshots and submit for platform review. Agreement acceptance requires the developer's explicit confirmation.

Official requirements: https://lagoslife.app/developers/docs
Agreement: https://lagoslife.app/developers/agreement

## Local verification

Build succeeds; 65 tests pass. `node scripts/lagos-life-check.mjs` tests the real game in a restricted 375 × 812 iframe with a mock SDK: initialization, host clock freeze/resume, preservation of manual pause, hidden fullscreen/install controls, and no browser errors. Review captures and the report are under ignored `artifacts/lagos-life/`. This is not a real Lagos Life sandbox result.
