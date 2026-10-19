# CHAOS RELIC EDU: pilot features (2026-10-19)

This is an experimental addition to the existing game, not a school production release.

## What works in this branch

- **Solo + CPU**: Click `🤖 ソロ・CPU対戦` on the landing page. This creates a local `GameEngine` room with three bots and does not use PeerJS, Firebase, or the Cloudflare relay for gameplay. Click `対戦開始` in the lobby; to test a custom card, publish it in the solo lobby first.
- **Portable decks**: Click `暗号化カード・ZIPを読み込む`, or drop `.crcard`/ZIP/legacy JSON files on the deck panel. All files are read in the browser and validated with `GameEngine.card`. Class ZIPs can include students' `.crcard` submissions directly or one nested ZIP layer downloaded from school Drive. Legacy plaintext JSON can still be imported, but is no longer exported from the UI.
- **ZIP export**: Students use `🔒 この1枚を暗号化して出力` in the deck panel or `🔒 1枚提出` next to a saved card. The output is one binary `.crcard` file, not JSON. Teachers may use `🔒 暗号化ZIPを出力` for a backup/archive containing encrypted individual `.crcard` files. All exports require the same class submission password, at least 12 characters. The password is prompted each time and is not saved by the app.
- **Classroom match (prototype)**: Click `🏫 教師向け承認制ルーム` to create an online match where only the host may publish cards. Guests are automatically assigned neutral `生徒01`-style labels. Teacher imports and reviews cards, then clicks `確認済みカードを一括公開`; students joining that room receive the class cards. Existing game limit is eight participants per match, *including the teacher*. This is not yet the requested class parent / group child lobby.
- **Read-only code browser**: The top navigation's `🔎 カードコード図鑑` lets students read exact Python-like scripts for authored cards, and the actual `engine.js` JavaScript handling built-in effects. Where no script exists, the Python-like configuration is clearly labeled an **illustrative reference**, not the real implementation.\n- **No dedicated student database**: Local files are handled in the browser. An online room still temporarily transfers scripts, descriptions and game-state data through the selected transport, and connection logs may exist. Never include student names, faces, or grades in cards or archives.

## Teacher workflow

1. The teacher shares a unique 12+ character submission password for this class via school-approved means. Each student creates a card, exports ONE encrypted `.crcard` file, and submits it through school Drive/server.
2. Download the Drive folder as ZIP (or select `.crcard` files individually), open Chaos Relic EDU and import. The teacher enters the class password once for the batch.
3. Review titles, descriptions and code in the saved-card library; delete or correct inappropriate content before publishing.
4. For a single group (max seven guests plus host), create a teacher-moderated room and publish the approved batch. Other groups may import the same ZIP and play a solo CPU match when school networking blocks the relay.
5. Download and retain student documents and grading data only with school-approved tools. This experiment does **not** store marks in the game or connect to Google accounts.


### Cloudflare Workers Git integration (important)

When the `gamedemo` Worker is connected to this GitHub repository in the Cloudflare dashboard, **do not build from the repository root**: it is a static website and does not contain the relay's `wrangler.jsonc`. A root-level automatic deploy could replace the relay implementation on the same Worker URL.

Go to **gamedemo → Settings → Builds** and configure:

- **Root directory:** `relay-worker`
- **Production branch:** `main`
- **Build command:** leave empty
- **Deploy command:** `npx wrangler deploy`

The `relay-worker/wrangler.jsonc` name matches the production service (`gamedemo`) and declares the `ROOMS` Durable Object. If the service has already been overwritten, redeploy the correct Worker from the `relay-worker` directory after saving the build settings: `npx wrangler deploy`.

`GET /health` must return `CHAOS RELIC relay ready`. A normal **HTTP** request to a valid `/room/XXXXXXX` path should return `426 WebSocket upgrade required`, not `404`. For actual play, use a **WebSocket** connection; an HTTP GET is only a routing diagnostic.

## Cloudflare relay setup

The repository contains `relay-worker/src/worker.js` and `relay-worker/wrangler.jsonc`.
The latter defines a SQLite-backed Durable Object namespace `ROOMS` and a migration; do not remove these settings.

1. Sign up for Cloudflare, install Node.js, and open a terminal in your local repository.
2. Run:
   ```sh
   cd relay-worker
   npx wrangler login
   npx wrangler deploy
   ```
3. Copy the actual deployed `https://<your-worker>.<subdomain>.workers.dev` URL from Wrangler. Check `https://<your-worker>.<subdomain>.workers.dev/health` returns `CHAOS RELIC relay ready`.
4. Set the root `relay-config.js` to `window.CHAOS_RELAY_URL = 'wss://<your-worker>.<subdomain>.workers.dev';` and publish the website changes. **Do not put API tokens or private keys in this client config.**
5. On the site, check the `📡 通信` setting and select Cloudflare relay. The room creator and joiner must use the same transport. Test from two different devices/networks.
6. The existing relay only relays **WebSocket** connections, not fallback HTTPS long-polling. It is host-authoritative; if the host tab closes, that match is interrupted. Classroom parent/child groups are **not implemented** in this prototype.

Cloudflare currently offers SQLite-backed Durable Objects on Workers Free (subject to limits). Verify your plan's included requests and current pricing before use. For school deployment, consider `ALLOWED_ORIGIN`, request throttles, and school review of the service and its destination URL. The school may block WebSocket or the domain.

## Safeguarding requirements before using this with minors

- No chat or messages between participants; keep it disabled in EDU mode.
- Teacher approval of every exported card prior to publication, and avoid collecting real names in custom content.
- A classroom host can click `🛑 授業を終了` even during animated cards. The stop is sent to all connected players and prevents restarting that room; staff still need an incident-response protocol and a private reporting route.
- Teachers should be able to limit publishing, and future versions must add session access controls, removals, student reporting workflows, per-classroom deck sharing, and abuse logging with minimal retention.
- Obtain permission from the school for external websites, personal data handling and network tests, even for a free pilot.

## Current limits and testing

- A full offline PWA is **not** implemented. The web page must first load over an allowed network. Solo gameplay itself makes no peer/server calls after that load.
- **Submission encryption**: Web Crypto AES-256-GCM with a random 16-byte salt and 12-byte nonce for each card; PBKDF2-SHA-256, 250,000 iterations, is used to derive the key from the class password. The file format starts with ASCII `CRCARD01`. The password is never included in the file or saved by this app. AES-GCM detects accidental and unauthorized modifications by someone **without** the password.
- **Encryption is not source-code execution prevention or author authentication.** A student who knows the shared class password can deliberately make or re-encrypt a different submission. Teacher approval, constrained `PyCards` parsing, size limits, and safe UI rendering remain mandatory. Students sharing the password can also decrypt one another's submissions if they receive the files. For stronger protection, use teacher-held signing keys and per-student permissions in a later phase.
- ZIP decompression in browsers requires modern `DecompressionStream('deflate-raw')` support; ZIPs exported by this tool are uncompressed, and JSON is a fallback. Total extracted input is capped at 8MB and 100 cards; nested ZIP is limited to one layer.
- Runtime regression tests: `node tests/edu-local.test.js` and `node tests/edu-encryption.test.js`. The GitHub workflow `Edu feature checks` runs selected existing and new tests on pull requests.
- Class parent room with branch group rooms, teacher-specific role authentication, automatic submissions, Google Apps Script and Drive sync, and robust school-network fallback are **future work**.
