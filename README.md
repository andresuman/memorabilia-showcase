# Memorabilia Showcase

Showcase and manage your autographed and game-used sports memorabilia — a Google Apps Script web app backed by a Google Sheet. No coding needed to use it: your collection lives in a spreadsheet and in Drive folders, and the app shows it as a website.

**[See it in action](https://andresuman.github.io/memorabilia-showcase/demo.html)** — the one-minute walkthrough, a sample collection you can try, and the setup guide, all on one page. No account needed.

Two collections, linked to each other:

- **Autographed Memorabilia** — your signed items, grouped by item, with every signature (who signed, when, where, how it was obtained, certificate, price, Instagram post) and photos.
- **Game Used Memorabilia** — items used in a game (or team issued, or practice used), with who used them, the game as a scoreboard, the play they were used in, the certificate and photo match, and the video of the play when there is one.

A signed item links to its game-used piece ("Also in Game Used") and back. You can browse, search and filter both collections, add photos from the app, and each collection's settings menu lists things to check (a photo whose name matches no item, a typo in a Signed column, a price in both tabs, and more). The app only reports; it renames or deletes nothing.

## Your collection stays private

The code is public, but your collection stays private. Each person deploys their own copy: their own spreadsheet, their own photos, their own web app, set to **Only myself**. Nothing about your collection is shared with anyone unless you choose to share it yourself.

## Full guide

[SETUP.md](SETUP.md) walks through the setup step by step, in plain language. [DEVELOPERS.md](DEVELOPERS.md) has the technical reference: the exact columns and their rules, how the pages work, the permissions, the tests, and the one-click deploy for the terminal.

## License

MIT. See [LICENSE](LICENSE).
