# Memorabilia Showcase

Showcase and manage your autographed and game-used sports memorabilia — a web app backed by a Google Sheet. No coding needed to use it: your collection lives in a spreadsheet and in Drive folders, and the app shows it as a website.

**[Try the demo](https://andresuman.github.io/memorabilia-showcase/demo.html)** — a small sample collection you can click through, no account needed. It uses real player and team names so it reads like a real collection, and it shows the real sample photos, team logos and videos of the play; the certificate numbers are made up and the items are examples, not real items. Three sample items have no photo on purpose, so you can see what an item without a photo looks like.

Two collections, linked to each other:

- **Autographed Memorabilia** — your signed items, grouped by item, with every signature (who signed, when, where, how it was obtained, certificate, price, Instagram post) and photos.
- **Game Used Memorabilia** — items used in a game (or team issued, or practice used), with who used them, the game as a scoreboard, the play they were used in, the certificate and photo match, and the video of the play when there is one.

A signed item links to its game-used piece ("Also in Game Used") and back. You can browse, search and filter both collections, add photos from the app, and each collection's settings menu lists things to check (a photo whose name matches no item, a typo in a Signed column, a price in both tabs, and more). The app only reports; it renames or deletes nothing.

## Start in 4 steps

1. **Copy the template spreadsheet** — [Memorabilia Showcase — Template](https://docs.google.com/spreadsheets/d/1LbIGqyrgWK1JepBPatQtHc_QKta18Ph3gcqjYT63uiY/copy) (File → Make a copy). It has the three tabs with the right headers and a few sample items (real player and team names, made-up certificate numbers). The Teams tab already lists all 32 NFL and 30 MLB teams with their colors and stadiums. Delete the sample rows and add your own — or keep them while you try the app out.
2. **Make folders in Google Drive for your photos** — one for autographed photos, one for game-used photos and videos, one for team logos. Photos are named by Item ID (`AM-0015.jpg`, `GU-0001.jpg`). To try the app right away, copy the sample files into your folders: [sample autographed photos](https://drive.google.com/drive/folders/1t8b2KxvxxJXR3waaIj0MY8jyMCyo6fJN), [sample game-used photos and videos](https://drive.google.com/drive/folders/1NdxQgHQX-ANtyQTX5lFGnj_5foF30cn-) and [sample team logos](https://drive.google.com/drive/folders/134y3B1OYR_PKutPFloptfbL2qtkyZaCy).
3. **Point the code at your sheet and folders** — paste the spreadsheet ID and the folder IDs into the `CONFIG` block at the top of `Code.gs`. ([Where to find the IDs](SETUP.md#3-point-the-code-at-your-sheet-and-folders).)
4. **Deploy** — on a Mac, double-click `deploy.command`; it runs the tests, pushes the files and publishes your web app. ([By hand](SETUP.md#4-deploy), if you'd rather.)

That's it. Open your web app URL and it shows your collection.

## One collection only

You don't need both collections. Autographs only? You only need the Autographed Memorabilia tab and the autographed photos folder. Game-used items only? Only the Game Used Memorabilia tab and its folder. Leave the IDs you don't use blank. A collection whose tab is missing simply does not appear.

## Your collection stays private

The code is public, but your collection stays private. Each person deploys their own copy: their own spreadsheet, their own photos, their own web app, set to **Only myself**. Nothing about your collection is shared with anyone unless you choose to share it yourself.

The app never writes to the spreadsheet. It reads the tabs (read-only) and only creates new photo files in your Drive folders.

## Full guide

[SETUP.md](SETUP.md) has the complete reference: every column and its rules, the folders and file names, the permissions the app asks for, how the pages work, and the tests.

## License

MIT. See [LICENSE](LICENSE).
