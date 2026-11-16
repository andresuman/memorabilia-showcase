# Developers

The technical reference for Memorabilia Showcase. [SETUP.md](SETUP.md) is the step-by-step setup for everyone; this file is for anyone who wants to change the code, run the tests, or understand how it works.

## Columns

The app finds columns by header name, so reordering them breaks nothing, but renaming one does.

### Autographed Memorabilia

One row per signature; rows with the same Item ID are one item.

| Item ID | Signer | Sport | Team | Item Type | Item Model | Item Detail | Autograph Inscription | Date Obtained | How Obtained | Gifted By | Obtained At | Autograph Authenticator | Autograph Cert Number | Signed Item Price (USD) | Instagram Post | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- Item ID looks like `AM-0001`. How Obtained is one of: In Person, Gift, TTM, Purchased.
- Date Obtained is a date; Signed Item Price (USD) is currency. Instagram Post is a link to the post.
- Obtained At is written `Where [in City] - Occasion by Promoter`; only the place is required.

### Game Used Memorabilia

One row per item.

| Item ID | Item Type | Item Detail | Usage | Sport | Team | Player | Game Date | Season | Away Team | Home Team | Score | Result | Stadium | Attended | Inning | At Bat | Pitching | Play | Authenticator | Cert Number | Photo Matched | Signed | Date Obtained | Obtained At | Price (USD) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- Item ID looks like `GU-0001`. Usage is one of: Game Used, Practice Used, Team Issued.
- Game Date is a date; Season is the year the season started (an NFL game in January counts in the season before). Item Detail, Season and Inning may be left out entirely (the column can be missing).
- Score is written `away - home`, like `9 - 25`. Result is W, L or D, for the item's Team.
- Attended and Photo Matched are `Yes` when they apply.
- Signed names the Autographed Memorabilia Item IDs of the signatures on this item, separated by commas (like `AM-0015`). Game Used is the source of truth for an item's usage and certificate: a signed item takes them from the Game Used row that names it.
- The price lives where the purchase was: in Game Used when the item was bought unsigned, in Signed Item Price when it was bought already signed.
- Cert Number and Score look like numbers to Sheets, so format those columns as plain text.

### Teams

One row per team of any collection.

| Team | League | Stadium | Former Names | Color |
|---|---|---|---|---|

- Color is written like `#2E1F8A`. Former Names holds old names of the team, separated by commas (a 2016 ball that says "Cleveland Indians" counts for the Guardians). Only Team is required; the other columns may be missing.

### One collection only

You don't need both collections. Someone with autographs only needs the Autographed Memorabilia tab and the Autographed photos folder; someone with game-used items only needs the Game Used Memorabilia tab and the Game Used folder. Leave the IDs of the collections you don't use blank (`''`) in `CONFIG`. The Teams tab and the Team Logos folder are optional too (they only give the teams their colors and logos). A collection whose tab is missing simply does not appear: its card is not on the home page, and its screen says it is not set up yet.

## Deploy with clasp

For the terminal, instead of the by-hand path in [SETUP.md](SETUP.md): you need a Google account, and [clasp](https://github.com/google/clasp) (`npm install -g @google/clasp`, then `clasp login`).

**One-click (macOS):** double-click `deploy.command`. The first run asks for your Apps Script project: paste the Script ID of a project you made at [script.google.com](https://script.google.com) (open its Project Settings to find it), or press Enter and it creates one for you. It runs the tests, pushes the files, and publishes a new version of the web app (the URL stays the same). After cloning, run `chmod +x deploy.command` first (the file mode is not preserved by every way of getting the code).

## How the page is split

`Index.html` keeps the HTML and pulls in the other files with `<?!= include('Name') ?>` (`include()` in `Code.gs` uses `HtmlService.createHtmlOutputFromFile`, the pattern in the Apps Script HTML Service best practices). Each file is a complete block: `Styles.html` is one `<style>`, each `Js*.html` is one `<script>` in strict mode. The scripts share the page scope, so the order in `Index.html` matters: JsCore, JsPanel, JsAutographed, JsHome, JsGameUsed, JsCrop, JsApp. Only `JsApp` runs code right away (it starts the app), so it goes last; the others only define functions and register click handlers. Top-level names must be unique across the files and must not clash with browser globals (`window.status`, `window.name`…). A new collection gets its own `Js<Name>.html`, added to `Index.html` before `JsApp`; its detail panel uses `openPanel()` from `JsPanel.html`.

## Permissions

The scopes are listed in `appsscript.json` (`oauthScopes`), so Google never adds others on its own:

- `spreadsheets.readonly`: reads the tabs through the Sheets API (advanced service `Sheets`, enabled in `appsscript.json`). The app never writes to the spreadsheet. Don't use `SpreadsheetApp`: it demands full edit access even to read.
- `drive`: reads photos and logos, and saves new photos (Drive has no narrower scope that can also see files added by hand).
- `script.external_request`: fetches the resized Drive thumbnails (only `drive.google.com/thumbnail`).

If a new feature needs another scope, add it here and in `appsscript.json` on purpose.

## Conventions

- **Item photos:** one file per item, named by Item ID (`AM-0015.jpg`); extra photos get a suffix (`AM-0015-2.jpg`, `AM-0015-3.jpg`). Game Used items the same way in the Game Used folder (`GU-0001.jpg`); a signed one also shows the photos of its Autographed Memorabilia item.
- **Photos added from the app:** several at a time for an item (picked from the photo library, sent one after the other with the next free names); one per game-used item the same way. The camera opened from the page takes one at a time and has no square option, so each photo first opens in a square frame (drag and pinch, or mouse and wheel): **Use square** saves what is inside the frame, **Keep original** the whole photo, **Cancel** drops the batch. Each is resized in the browser (longest side 2000 px, JPEG 85%, location data dropped) and sent in pieces of ~180 KB.
- **Photo sizes and the browser cache:** each photo is asked for at the size it is shown (cards 240 px, panel the width of the photo area rounded to 200 px, thumbnails and link rows 64 px, all × screen density up to 2; the full-screen viewer 2048 px), so the small copies fit the server cache. Copies up to 1400 px are also kept in the browser (IndexedDB "memorabilia-showcase", at most 600, oldest dropped first), so a photo seen once appears at once the next time; nothing there is visible or synced, and clearing the browser data just empties it.
- **Opening with the last data:** the app keeps the last answer of each spreadsheet call in the browser (IndexedDB, store "data") and opens with it at once, while it asks the spreadsheet again; the reload buttons spin until the answer arrives, and the page is redrawn only if something changed (lists keep their scroll, an open panel stays open). The data stays in that browser only (not visible, not synced).
- **Things to check:** each collection's settings button (gear) gets a yellow dot when something needs a look, and its menu lists it at the top, each with what to do and the exact names: photos whose name matches no item, copies Drive made ("AM-0015 (1).jpg", which the app ignores), one name used by two files (only one shows), Item IDs not like AM-0000 or GU-0000 (with the spreadsheet row), videos that match no hologram, what is written in a Signed column that is not an Item ID, Signed IDs that are not in Autographed Memorabilia and, in Game Used, the data of a game: a Season that is neither the year of the game nor the one before, a game with no Season, a Team that is not the Away Team or the Home Team (items with no game are not checked). Also in Game Used: "I was there" (Attended) with no Game Date; a Usage written two ways ("Game used" next to "Game Used", found by comparing the values in the tab, with no fixed list); two Game Used rows naming the same signed item; an Item Type that differs from the signed item in Autographed Memorabilia; a price in both tabs for the same item (one purchase, one price). The app only reports; it renames or deletes nothing.
- **Videos of the play:** a game-used ball can have the video of the play it was used in, trimmed by the owner (the app never cuts it). It goes in the Game Used folder, private like the photos, as an H.264 MP4 (what the iPhone plays; 720p, the same length and framing, a few MB) named by the ball's hologram: `AB123456.mp4` for Cert Number `AB123456/ABC`. A video matches the Game Used item (and its signed Autographed Memorabilia item) whose Cert Number starts with that hologram; one that matches none is listed in Game Used's Things to check. Converting a screen recording: `ffmpeg -i in.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart AB123456.mp4`.
- **Replacing a photo:** put the new file in Drive under the same name (or replace the file); the app shows it after a reload. Photos and logos are cached by the server for up to 6 hours (the most Apps Script allows), keyed by file and last-updated time, so a replaced file gets a new key. Drive's own thumbnails can still take a few minutes to catch up.
- **Team logos:** 256 × 256 transparent PNG, named exactly like the Team column (`Chicago Cubs.png`). See `tools/process_logos.py`.

## Pages

- `#` home: one card per collection: Autographed Memorabilia, Game Used.
- `#autographed`: Autographed Memorabilia; `#AM-0015` opens one item.
- `#game-used`: Game Used Memorabilia, one card per item used in a game (or team issued, practice used), signed or not, newest season first (the Season column: the year the season started, so a game in January counts in the season before); in a season, newest game first and an item with no game after its games, at the start of its season; items with no season last. `#game-used/GU-0001` opens one item.

## Tests

The `tests` folder checks the app before a deploy, without touching the spreadsheet or Drive. It uses a small made-up collection (`tests/fixtures.js`: no real names, prices or photos) and a stand-in for the Apps Script server (`tests/mock-gas.js`). Three layers, from the fastest:

- `npm run test:unit` (Node's own test runner, needs only Node installed, under a second):
  - `tests/unit/code.test.js`: what a browser would not report and the project's rules: the same top-level name in two `Js*.html` files (the later one silently replaces the first), a name that clashes with a browser global, code nobody uses any more, every reload button spinning while the app checks the spreadsheet; least privilege (only the three permissions of *Permissions*, the web app for the deployer only, no `SpreadsheetApp`), and Code.gs creating only JPEG photos (no rename, move or delete in Drive).
  - `tests/unit/server.test.js`: `Code.gs` in Node, with the Google services replaced by fakes (`tests/unit/gas.js`): reading the tabs by column name, dates, prices, photos and their order, files in the trash, the things to check, logos and the cache, photo sizes, videos, the photo upload and its checks.
  - `tests/unit/contract.test.js`: the test data (and the demo data, `tests/demo-data.js`) has the shape `Code.gs` really sends (no field on one side only, the same kind of value), and the stand-in server answers exactly the functions `Code.gs` offers. Without it a field renamed on one side would pass both suites and break the app.
- `npm run test:ui` (Playwright, in Chromium): the pages, a fresh browser page per test so no test depends on another. Every test runs on an iPhone-sized screen; those tagged `@both` (layout, the Filters sheet or panel, touch or mouse) on a computer screen too, and the keyboard ones (`@desktop`) only there. No fixed waits: a test goes on when the page is quiet (no short timer, animation or browser database write in progress). A JavaScript error fails the test it happened in.
- `npm test` runs both; `npm run shots` saves screenshots of every screen on both sizes to `tests/out/shots/` (to look at; they check nothing); `npm run preview` builds `tests/out/preview.html`, the page with the test data, to open in a browser; `npm run demo` rebuilds the two public demo pages: `docs/demo.html` (the landing page, no app) and `docs/demo-app.html` (the bare demo, built from the sample data in `tests/demo-data.js`, inlining the sample photos, logos and videos from `tests/sample-assets.json` into it).

Playwright once: `npm install`, then `npx playwright install chromium`. `deploy.command` runs every test once before each deploy (the page tests when Playwright is installed); a failing test stops the deploy and names itself. Only `Code.gs`, the `.html` files at the top of the repository and `appsscript.json` go to Apps Script (`.claspignore`), so nothing in `tests` is published.

## The demo page

`docs/demo.html` is the public demo page, served by GitHub Pages. It is a standalone landing page, built by `npm run demo` (`node tests/build-preview.js --landing --out docs/demo.html`) — no app, no data. `npm run demo` also builds `docs/demo-app.html` (`node tests/build-preview.js --data demo-data.js --out docs/demo-app.html`): the bare demo, built from the sample data (`tests/demo-data.js`: real player and team names, made-up certificate numbers), with the sample photos, logos and videos from `tests/sample-assets.json` inlined, which the landing's **Try the demo** button opens in a new tab. **Don't edit `docs/demo.html` or `docs/demo-app.html` by hand** — the next build overwrites them.

The landing page has:

- The walkthrough video (`docs/memorabilia-showcase-video.mp4`, next to the page, played inline), two calls to action — **Try the demo** (opens the bare demo, `docs/demo-app.html`, in a new tab) and **Create your collection** (scrolls to the setup guide) — and the GitHub logo and repo name (`andresuman/memorabilia-showcase`), linking to the code.
- The setup guide at the bottom of the page: [SETUP.md](SETUP.md) rendered to HTML by a small converter in `tests/build-preview.js` (headings, paragraphs, lists, links, bold, inline code, fenced code blocks — no tables; links open in a new tab). SETUP.md is the single source: edit it, rebuild the demo, and the page follows. The converter skips SETUP.md's first heading and demotes the rest one level, so the guide sits under the page's own "Create your collection" heading.

The landing page defines the few CSS variables it uses (the same values as `Styles.html` `:root`) so it looks the same without the app. The preview (`npm run preview`, `tests/out/preview.html`) is the bare app with the test data, so the UI tests see exactly what a deployed copy shows.

## Files

| File | What it is |
|---|---|
| `README.md` | Short front page: what it is, the two collections, the privacy point, and a link to the demo page. The demo, the video and the setup steps live on the demo page and in `SETUP.md`, not here. |
| `LICENSE` | MIT License. The copyright line is the only personal name in the tree. |
| `.gitignore` | Keeps local files out of the repo: node_modules, test output, and your clasp config (`.clasp.json`). |
| `SETUP.md` | Setup guide for everyone, in plain language (also rendered into the demo page). |
| `DEVELOPERS.md` | This file: the technical reference. |
| `Code.gs` | Server (Apps Script): reads the **Autographed Memorabilia**, **Game Used Memorabilia** and **Teams** tabs by column name, and serves team logos and photos from Drive as data URIs. |
| `Index.html` | Page structure (HTML). Pulls in the files below with `<?!= include('Name') ?>`; the browser still gets one single page. |
| `Styles.html` | All the CSS. |
| `JsCore.html` | Shared JavaScript: team colors (from the Teams tab), state, helpers used by every screen (search, links in notes, item lookup), photos, loading, reload. |
| `JsPanel.html` | The detail panel shared by the collections: its frame (previous / next / close), the photo area (thumbnails, swipe between photos, blurred fill around photos that are not square) and the full-screen viewer with zoom. Each collection builds its photo and text and calls `openPanel()`. |
| `JsHome.html`, `JsAutographed.html`, `JsGameUsed.html` | One file per screen. |
| `JsCrop.html` | Framing a photo before it is saved: square frame to drag and pinch, "Use square" or "Keep original". |
| `JsApp.html` | Routing between screens, menus, events, phone gestures, adding photos, start. |
| `appsscript.json` | Apps Script manifest: time zone, V8, web app (Execute as Me / Only myself), the Sheets advanced service and the only permissions the app may use (see *Permissions*). The time zone is set to America/New_York — change it there if you're elsewhere. |
| `deploy.command`, `.clasp.json.example`, `.claspignore` | One-click deploy with clasp (see above). Copy `.clasp.json.example` to `.clasp.json` and put your Script ID in it, or let `deploy.command` do it on its first run. `.clasp.json` is gitignored and never committed. |
| `docs/demo.html` | The public demo page: a standalone landing page — the walkthrough video, the calls to action, the GitHub logo and repo name, and the setup guide. No app, no data. Rebuilt with `npm run demo`. Served by GitHub Pages. |
| `docs/demo-app.html` | The bare demo: the app with the sample data (`tests/demo-data.js`: real player and team names, made-up certificate numbers), with the sample photos, logos and videos from `tests/sample-assets.json` inlined. Opened in a new tab by the landing's **Try the demo** button. Rebuilt with `npm run demo`. Served by GitHub Pages. |
| `docs/memorabilia-showcase-video.mp4` | The one-minute walkthrough video, played inline on the demo page, with its music credit under it. |
| `tests/sample-assets.json` | The sample photos, logos and videos the demo page shows, as base64 text (the same files the Drive sample folders hold, where you can get them as files): a photo per item, named by Item ID, the two videos named by hologram, the two team logos. |
| `tools/process_logos.py` | Team logo processing script (256 × 256, transparent background). |
| `tests/`, `package.json` | Tests and a preview with made-up data (see *Tests*). Not published. |

## Icons

Every icon in the app comes from [Phosphor Icons](https://phosphoricons.com), MIT License (noted in `JsCore.html`): the big home card icons (signature, trophy) in the **light** weight, and the small interface icons (search, reload, settings, menu links, filters, previous/next/close, camera, signature, quotes, the dropdown arrows, the back arrow, the item facts (info, medal, seal-check, user, users, shopping-bag, map-pin, ticket)) in the **regular** weight. New icons must come from the same set: light for big decorative icons, regular for buttons.

## History

Built from a personal project of the same shape: an Apps Script showcase for one collector's autographed and game-used memorabilia, trimmed to the two collections any collector has, with the personal parts left out.

## License

MIT. See [LICENSE](LICENSE).
