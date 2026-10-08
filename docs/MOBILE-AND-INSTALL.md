# Mobile and installation

Run `npm run dev` for development. Use `npm run build` and `npx vite preview --host 0.0.0.0` to check the production app locally. Deploy `dist/` on an HTTPS static host for phone installation. A LAN HTTP address supports gameplay but cannot register a service worker or offer the standard Android install prompt.

The footer offers installation. Supported browsers use their native install prompt; Safari users get Share → Add to Home Screen instructions. Installed mode hides the install button. The game does not interrupt a match with installation dialogs.

The production-only service worker precaches the application, fonts, artwork, character and portraits. Audio is online-only. First visit must complete online. Updates wait for old app tabs to close; they do not reload an active match. The cache is versioned from asset contents and only this app's older caches are removed.

Camera zoom uses +/− or a two-finger pinch on the pitch. The chosen camera and zoom persist through replays. Fullscreen uses the browser API; unsupported browsers receive an honest home-screen suggestion. iPhone browser chrome cannot be programmatically hidden everywhere.

Verification: `node scripts/mobile-hub-check.mjs` covers 1440×900, 390×844, 320×568 and 844×390, menu overflow, pause/resume, HUD bounds, fullscreen fallback and production offline launch. Screenshots are in `artifacts/mobile-hub/`. Emulation does not replace testing on a physical iPhone or Android device.
