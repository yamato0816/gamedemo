# CHAOS RELIC EDU: pilot features (2026-10-19)

This is an experimental addition to the existing game, not a school production release.

## What works in this branch

- **Solo + CPU**: Click `🤖 ソロ・CPU対戦` on the landing page. This creates a local `GameEngine` room with three bots and does not use PeerJS, Firebase, or the Cloudflare relay for gameplay. Click `対戦開始` in the lobby; to test a custom card, publish it in the solo lobby first.
- **Portable decks**: Click `ZIP・JSONを読み込む`, or drop local ZIP/JSON files on the deck panel. Files are read in the browser, normalized using `GameEngine.card`, and copied into the existing local card library. JSON may be a single card, an array, or an object with a `cards` array. ZIPs may contain JSON files, or student ZIPs inside a ZIP downloaded from a school Drive folder (one nested level).
- **ZIP export**: Click `保存済みカードをZIP出力`. It creates a ZIP containing `chaos-relic-deck.json` (no student account or real name). Store it on the school's own Drive/server and share it using the school's usual tools.
- **Classroom match (prototype)**: Click `🏫 教師向け承認制ルーム` to create an online match where only the host may publish cards. Guests are automatically assigned neutral `生徒01`-style labels. Teacher imports and reviews cards, then clicks `確認済みカードを一括公開`; students joining that room receive the class cards. Existing game limit is eight participants per match, *including the teacher*. This is not yet the requested class parent / group child lobby.
- **No dedicated student database**: Local files are handled in the browser. An online room still temporarily transfers scripts, descriptions and game-state data through the selected transport, and connection logs may exist. Never include student names, faces, or grades in cards or archives.

## Teacher workflow

1. Each student authors a card in the Forge and exports their local ZIP, then submits it using approved school Drive/server procedures.
2. Download the Drive folder as ZIP (or select student ZIPs individually), open Chaos Relic EDU and import them.
3. Review titles, descriptions and code in the saved-card library; delete or correct inappropriate content before publishing.
4. For a single group (max seven guests plus host), create a teacher-moderated room and publish the approved batch. Other groups may import the same ZIP and play a solo CPU match when school networking blocks the relay.
5. Download and retain student documents and grading data only with school-approved tools. This experiment does **not** store marks in the game or connect to Google accounts.

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
- Provide an emergency stop/disconnect option, clear procedures for inappropriate content, and a means for staff to handle reports without public confrontation.
- Teachers should be able to limit publishing, and future versions must add session access controls, removals, student reporting workflows, per-classroom deck sharing, and abuse logging with minimal retention.
- Obtain permission from the school for external websites, personal data handling and network tests, even for a free pilot.

## Current limits and testing

- A full offline PWA is **not** implemented. The web page must first load over an allowed network. Solo gameplay itself makes no peer/server calls after that load.
- ZIP decompression in browsers requires modern `DecompressionStream('deflate-raw')` support; ZIPs exported by this tool are uncompressed, and JSON is a fallback. Total extracted input is capped at 8MB and 100 cards; nested ZIP is limited to one layer.
- Runtime regression test: `node tests/edu-local.test.js`. The GitHub workflow `Edu feature checks` runs selected existing and new tests on pull requests.
- Class parent room with branch group rooms, teacher-specific role authentication, automatic submissions, Google Apps Script and Drive sync, and robust school-network fallback are **future work**.
