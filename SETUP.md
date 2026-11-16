# Set up Memorabilia Showcase

Memorabilia Showcase is a Google Apps Script project. That means the code lives in your Google account and runs there — there is no server to set up, nothing to install, and nothing to pay for. You copy the code into Google Apps Script, point it at your spreadsheet and your Drive folders, and publish it as a web app that only you can open. Your collection stays in your Google account, private to you.

[Try the demo](https://andresuman.github.io/memorabilia-showcase/demo-app.html) first if you haven't — it is a small sample collection you can click through, and it shows the real sample photos, team logos and videos of the play.

## 1. Copy the template spreadsheet

Copy the [template spreadsheet](https://docs.google.com/spreadsheets/d/1LbIGqyrgWK1JepBPatQtHc_QKta18Ph3gcqjYT63uiY/copy) (File → Make a copy). It has the three tabs with the right headers and a few sample items (real player and team names, made-up certificate numbers). The Teams tab already lists all 32 NFL and 30 MLB teams with their colors and stadiums. Delete the sample rows and add your own — or keep them while you try the app out.

The three tabs are: **Autographed Memorabilia** (one row per signature; rows with the same Item ID are one item), **Game Used Memorabilia** (one row per item), and **Teams** (one row per team). The exact columns and their rules are in the [developer guide](https://github.com/andresuman/memorabilia-showcase/blob/main/DEVELOPERS.md) — you don't need them to get started, the template has them all.

## 2. Make the Drive folders

In Google Drive, create the folders for the collections you use (three at most, anywhere — the app finds them by their ID, so renaming or moving them later changes nothing):

- **Autographed photos** — photos of autographed items.
- **Game Used** — photos and videos of game-used items.
- **Team Logos** — team logos, one per team.

Photos are named by Item ID: one file per item (`AM-0015.jpg`, `GU-0001.jpg`); extra photos get a suffix (`AM-0015-2.jpg`, `AM-0015-3.jpg`). A video of the play goes in the Game Used folder as an H.264 MP4 named by the ball's hologram (`AB123456.mp4` for Cert Number `AB123456/ABC`). Team logos are 256 × 256 transparent PNGs named exactly like the Team column (`Chicago Cubs.png`).

To try the app before adding your own items, copy the sample files into your folders: [sample autographed photos](https://drive.google.com/drive/folders/1t8b2KxvxxJXR3waaIj0MY8jyMCyo6fJN) (6 photos), [sample game-used photos and videos](https://drive.google.com/drive/folders/1NdxQgHQX-ANtyQTX5lFGnj_5foF30cn-) (6 photos plus the two videos), and [sample team logos](https://drive.google.com/drive/folders/134y3B1OYR_PKutPFloptfbL2qtkyZaCy) (Baltimore Ravens and Baltimore Orioles). They are placeholders — a solid color with the item ID — meant to be replaced with your own photos. Drive doesn't copy a whole folder in one click: open a sample folder, select the files, and use File → Make a copy, then move the copies into your folder.

## 3. Get the code and put it in Apps Script

Download the code as a ZIP file: [memorabilia-showcase-main.zip](https://github.com/andresuman/memorabilia-showcase/archive/refs/heads/main.zip). Unzip it — you don't need a GitHub account, and you don't need to install anything. Inside are the code files (`Code.gs`, the `.html` files, and `appsscript.json`).

Open your spreadsheet, then Extensions → Apps Script. That opens the code editor for a project connected to your sheet. Delete the starter code in `Code.gs` and paste in the contents of the repo's `Code.gs`. Then create one HTML file for each of the repo's `.html` files: click the **+** next to Files, choose HTML, and name it exactly (no extension): `Index`, `Styles`, `JsCore`, `JsPanel`, `JsAutographed`, `JsHome`, `JsGameUsed`, `JsCrop`, `JsApp`. Paste each file's contents in. For `appsscript.json`, open Project Settings (the gear icon), turn on "Show 'appsscript.json' manifest file in editor", then open `appsscript.json` in the editor and paste in the repo's `appsscript.json`.

Now fill in the four IDs at the top of `Code.gs`, in the `CONFIG` block. Replace each placeholder with your own ID, keeping the quotes:

```
  SPREADSHEET_ID: 'PASTE_YOUR_SPREADSHEET_ID_HERE',
  PHOTOS_FOLDER_ID: 'PASTE_YOUR_AUTOGRAPHED_PHOTOS_FOLDER_ID_HERE',
  LOGOS_FOLDER_ID: 'PASTE_YOUR_TEAM_LOGOS_FOLDER_ID_HERE',
  GU_FOLDER_ID: 'PASTE_YOUR_GAME_USED_FOLDER_ID_HERE',
```

To find an ID, look at the web address (URL) of the spreadsheet or folder. For a spreadsheet, the ID is the long string between `/d/` and `/edit` — for example, in `https://docs.google.com/spreadsheets/d/1LbIGqyrgWK1JepBPatQtHc_QKta18Ph3gcqjYT63uiY/edit`, the ID is `1LbIGqyrgWK1JepBPatQtHc_QKta18Ph3gcqjYT63uiY`. For a Drive folder, the ID is the string after `/folders/` — for example, in `https://drive.google.com/drive/folders/1t8b2KxvxxJXR3waaIj0MY8jyMCyo6fJN`, the ID is `1t8b2KxvxxJXR3waaIj0MY8jyMCyo6fJN`. Copy the whole ID into the right line. Only the IDs of the collections you use are needed — leave the others blank (`''`).

## 4. Publish the web app

In the Apps Script editor, click Deploy → New deployment. Choose **Web app** as the type, **Execute as: Me**, and **Who has access: Only myself**. Click Deploy, then copy the Web app URL — that is your collection's website. Open it.

The first time you open it, Google shows a warning that the app isn't verified ("Google hasn't verified this app"). That is expected: this is your own code, running on your own account, and Google hasn't reviewed it because it's only for you. Click **Advanced**, then **Go to [your project name] (unsafe)**, then **Allow**. The app only asks for three things: to read your spreadsheet, to read and save photos in your Drive folders, and to fetch the small preview images. It never writes to your spreadsheet.

That's it — your collection is live at that URL. Bookmark it; the address stays the same.

## One collection only

You don't need both collections. Autographs only? You only need the Autographed Memorabilia tab and the autographed photos folder. Game-used items only? Only the Game Used Memorabilia tab and its folder. Leave the IDs you don't use blank. A collection whose tab is missing simply does not appear: its card is not on the home page, and its screen says it is not set up yet. The Teams tab and the Team Logos folder are optional too — they only give the teams their colors and logos.

## If something doesn't work

- **A collection says it is not set up yet, or the page says the collection didn't load.** Check the tab name in your spreadsheet — it must be exactly `Autographed Memorabilia` or `Game Used Memorabilia` — and check the spreadsheet ID in `CONFIG` (see step 3 for how to find it).
- **Photos don't show.** Check the file name matches the Item ID exactly (`AM-0015.jpg`, not `am-0015.jpg` or `AM-0015 (1).jpg`), and that the photo is in the right folder. Then check the folder ID in `CONFIG`.
- **The permissions screen appears again, or the app asks for access.** That is the screen from step 4 — click Advanced, then Go to your project, then Allow. It appears once, the first time you open the app.
- **You changed the code but the web app looks the same.** The web app only updates when you make a new deployment: Deploy → New deployment → Web app (same settings as step 4). The URL stays the same.
- **The page is blank or shows an error.** Reload it once. If it persists, check the IDs in `CONFIG` first — a wrong or missing ID is the most common cause.

## Your collection stays private

The code is public, but your collection stays private. Each person deploys their own copy: their own spreadsheet, their own photos, their own web app, set to **Only myself**. Nothing about your collection is shared with anyone unless you choose to share it yourself. The app never writes to the spreadsheet — it reads the tabs and only creates new photo files in your Drive folders.

## For developers

[DEVELOPERS.md](https://github.com/andresuman/memorabilia-showcase/blob/main/DEVELOPERS.md) has the technical reference: the exact columns and their rules, how the pages work, the permissions in detail, the tests, and the one-click deploy with `clasp` for the terminal.

## License

MIT. See [LICENSE](https://github.com/andresuman/memorabilia-showcase/blob/main/LICENSE).
