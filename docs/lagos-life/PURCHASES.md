# Optional cosmetic purchases

## Product

`night_court_kits` — Night Court Kit Pack — ₦500, one-off.
Includes Court Gold, Night Violet and Ocean Teal jersey colours. All existing teams, matches and controls remain free. This changes appearance only; simulation, stamina, speed and scoring are unchanged. The in-game checkout shows Lagos Life's authoritative price.

Product was saved in the Samuel Dahunsi draft (`6ff6e3755ad942bea038`) on 13 October 2026. It is waiting for review and currently works only for test purchases. There is a separate user-created Street football draft (`a3aaf2c8ff474916bcba`); credentials and entitlements must not be mixed between them.

## Backend

`npm start` serves the built game and `/api/claim` and `/api/entitlements` from one origin. `server/purchases.mjs` verifies each fresh session with Vatar, checks the receipt's game mode, player, product, paid/delivered status, currency and positive amount, commits ownership in PostgreSQL, then marks delivery through Vatar. A failed delivery retries without granting twice. Entitlements are restored after reload and host resume; confirmed refunds revoke the kit.

Database rows contain only game-scoped player ids, purchase ids, product ids, test/live mode and creation time. No names, email addresses, avatar images, session tokens or API secrets are stored in PostgreSQL. Keys stay in server environment variables. Sandbox and live ownership are separated in the database primary key and queries.

## Deployment

Apply the reviewed settings in `deploy/quikdb-purchases.json` to the existing QuikDB deployment. Changing `quikdb.json` alone does not update its saved static/nginx runtime. Keep port 5173 and use `npm start` with the Node.js runtime. The server serves the actual CSP framing header, including the Lagos Life origins; nginx `_headers` files are not used by this server.

Set server variables only:

- `VATAR_GAME_ID=6ff6e3755ad942bea038`
- `VATAR_MODE=test`
- `VATAR_SECRET` from the same draft's locally saved, ignored `.env.lagos-life`
- `DATABASE_URL` for a durable PostgreSQL database (or QuikDB-injected `QUIKDB_CLOUD_DB_URL`)
- `PUBLIC_ORIGIN=https://street-football.quikdb.net`
- `PORT=5173`

No webhook/results secret is needed for this single-player product. No `VITE_` secrets. Never commit credential files or connection strings.

The server continues serving free matches with purchases disabled if configuration is absent. A configured service refuses mismatched test/live secrets and needs a healthy database to start. `/health` reports whether purchases are configured; actual purchase verification must also be tested before submission.

QuikDB's live Databases page currently says “Creation coming soon” and offers no database provisioning. An existing external PostgreSQL database or another approved provider is required. A temporary localhost database is used only for tests and is not production storage.

## Validation and remaining work

71 tests pass, including forged/unpaid/mismatched receipts, ownership binding, retry after failed delivery, and refunds. An isolated real PostgreSQL check verifies concurrent idempotency, player binding, mode isolation, persistence across reconnect and revocation. The browser shop check also passes: mock purchase, one claim, owned colour selector, restore retaining the selection, Court Gold applied in a match, and no browser errors. These checks are not real platform payment approval.

Before review: provision the database, store the test key in the approved host, configure Node.js, deploy, run a real sandbox purchase, confirm server verification and delivery, test reload/restore, update the listing for the optional cosmetic, and submit. Live keys are issued only after platform approval; do not substitute them into a test deployment.
