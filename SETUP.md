# Set up Memorabilia Showcase

You don't need to know how to code. There is nothing to install and nothing to pay for — all you need is a Google account. Your collection lives in a spreadsheet and in Drive folders, and the app shows it as a website only you can open. The code runs in your Google account, in a tool called Google Apps Script.

Four steps, about 15 minutes: copy the spreadsheet, make folders for your photos, copy the code, and publish the app.

[Try the demo](https://andresuman.github.io/memorabilia-showcase/demo-app.html) first if you haven't — it is a small sample collection you can click through, with videos of the play. Its photos and team logos are placeholders, not real items — your own collection shows your real photos and logos.

## Step 1 — Copy the template spreadsheet

- Open the [template spreadsheet](https://docs.google.com/spreadsheets/d/1LbIGqyrgWK1JepBPatQtHc_QKta18Ph3gcqjYT63uiY/edit).
- Click **File → Make a copy**. This makes your own copy in your Drive — that copy is your collection's spreadsheet.
- It has three tabs: **Autographed Memorabilia** (one row per signature; rows with the same Item ID are one item), **Game Used Memorabilia** (one row per item), and **Teams** (one row per team, already filled in with all 32 NFL and 30 MLB teams).
- The template has a few sample items (real player and team names, made-up certificate numbers). Delete the sample rows and add your own — or keep them while you try the app out.
- You don't need the exact column rules to get started — the template has them all. They are in the [developer guide](https://github.com/andresuman/memorabilia-showcase/blob/main/DEVELOPERS.md) if you ever need them.

## Step 2 — Make folders for your photos

- In Google Drive, create a folder called **Autographed photos** for photos of autographed items.
- Create a folder called **Game Used** for photos and videos of game-used items.
- Create a folder called **Team Logos** for team logos, one per team.
- Only make the folders for the collections you use — autographs only means just the Autographed photos folder.
- Put the folders anywhere you like. The app finds them by their ID, so renaming or moving them later changes nothing.
- Name each photo by its Item ID: one file per item (`AM-0015.jpg`, `GU-0001.jpg`). Extra photos get a number at the end (`AM-0015-2.jpg`, `AM-0015-3.jpg`).
- A video of the play goes in the Game Used folder as an MP4 video, named by the ball's hologram (`AB123456.mp4` for Cert Number `AB123456/ABC`).
- A team logo is a 256 × 256 transparent PNG, named exactly like the Team column (`Chicago Cubs.png`).
- To try the app before adding your own items, copy the sample files into your folders: [sample autographed photos](https://drive.google.com/drive/folders/1t8b2KxvxxJXR3waaIj0MY8jyMCyo6fJN) (6 photos), [sample game-used photos and videos](https://drive.google.com/drive/folders/1NdxQgHQX-ANtyQTX5lFGnj_5foF30cn-) (6 photos plus the two videos), and [sample team logos](https://drive.google.com/drive/folders/134y3B1OYR_PKutPFloptfbL2qtkyZaCy) (Baltimore Ravens and Baltimore Orioles). They are placeholders — a solid color with the item ID — meant to be replaced with your own photos.
- Drive doesn't copy a whole folder in one click: open a sample folder, select the files, and use File → Make a copy, then move the copies into your folder.

## Step 3 — Copy the code into Apps Script

- Download the code as a ZIP file: [memorabilia-showcase-main.zip](https://github.com/andresuman/memorabilia-showcase/archive/refs/heads/main.zip). Unzip it.
- Open your spreadsheet, then click **Extensions → Apps Script**. This opens the code editor for a project connected to your sheet.
- Click **Code.gs** in the editor, delete the starter code, and paste in the contents of `Code.gs` from the folder you just unzipped.
- Create the HTML files. Click the **+** next to Files, choose **HTML**, and name it exactly (no extension). Do this once for each of these nine names, and paste each file's contents in:

```
Index
Styles
JsCore
JsPanel
JsAutographed
JsHome
JsGameUsed
JsCrop
JsApp
```

- For `appsscript.json`: click the gear icon (Project Settings), turn on **"Show 'appsscript.json' manifest file in editor"**, then open `appsscript.json` in the editor and paste in the contents of `appsscript.json` from the folder you just unzipped.

### Fill in your four IDs

- At the top of `Code.gs`, find the `CONFIG` block. Replace each placeholder with your own ID, keeping the quotes:

```
  SPREADSHEET_ID: 'PASTE_YOUR_SPREADSHEET_ID_HERE',
  PHOTOS_FOLDER_ID: 'PASTE_YOUR_AUTOGRAPHED_PHOTOS_FOLDER_ID_HERE',
  LOGOS_FOLDER_ID: 'PASTE_YOUR_TEAM_LOGOS_FOLDER_ID_HERE',
  GU_FOLDER_ID: 'PASTE_YOUR_GAME_USED_FOLDER_ID_HERE',
```

- To find a spreadsheet ID, look at its web address: the ID is the long string between `/d/` and `/edit`. For example, in `https://docs.google.com/spreadsheets/d/1LbIGqyrgWK1JepBPatQtHc_QKta18Ph3gcqjYT63uiY/edit`, the ID is `1LbIGqyrgWK1JepBPatQtHc_QKta18Ph3gcqjYT63uiY`.
- To find a folder ID, look at its web address: the ID is the string after `/folders/`. For example, in `https://drive.google.com/drive/folders/1t8b2KxvxxJXR3waaIj0MY8jyMCyo6fJN`, the ID is `1t8b2KxvxxJXR3waaIj0MY8jyMCyo6fJN`.
- Only fill in the IDs for the collections you use. Leave the others blank (`''`).

## Step 4 — Publish your web app

- In the Apps Script editor, click **Deploy → New deployment**.
- Choose **Web app** as the type, **Execute as: Me**, and **Who has access: Only myself**.
- Click **Deploy**, then copy the Web app URL. That URL is your collection's website.
- Open the URL. The first time, Google shows a warning ("Google hasn't verified this app"). That is expected — this is your own code, running on your own account, and Google hasn't reviewed it because it's only for you. Click **Advanced**, then **Go to [your project name] (unsafe)**, then **Allow**.
- The app only asks for three things: to read your spreadsheet, to read and save photos in your Drive folders, and to fetch the small preview images. It never writes to your spreadsheet.
- That's it — your collection is live. Bookmark the URL; the address stays the same.

## Only one collection?

- Autographs only? You only need the Autographed Memorabilia tab and the Autographed photos folder.
- Game-used items only? You only need the Game Used Memorabilia tab and the Game Used folder.
- Leave the IDs you don't use blank. A collection whose tab is missing simply does not appear: its card is not on the home page, and its screen says it is not set up yet.
- The Teams tab and the Team Logos folder are optional too — they only give the teams their colors and logos.

## If something doesn't work

- **A collection says it is not set up yet, or the page says the collection didn't load.** Check the tab name in your spreadsheet — it must be exactly `Autographed Memorabilia` or `Game Used Memorabilia` — and check the spreadsheet ID in `CONFIG` (step 3).
- **Photos don't show.** Check the file name matches the Item ID exactly (`AM-0015.jpg`, not `am-0015.jpg` or `AM-0015 (1).jpg`), that the photo is in the right folder, and that the folder ID in `CONFIG` is right.
- **The page shows an error about a file it can't find.** Check the nine HTML file names from step 3 — each must match exactly, with no `.html` at the end (`Index`, not `Index.html`).
- **The permissions screen appears again.** That is the screen from step 4 — click Advanced, then Go to your project, then Allow. It normally appears only once, the first time you open the app.
- **You changed the code but the web app looks the same.** The web app only updates when you make a new deployment: Deploy → New deployment → Web app (same settings as step 4). The URL stays the same.
- **The page is blank or shows an error.** Reload it once. If it is still blank, check the IDs in `CONFIG` first — a wrong or missing ID is the most common cause.

## Your collection stays private

Your collection stays private. It lives in your own spreadsheet and your own Drive folders, and the web app is set to **Only myself**, so only you can open it. Nothing about your collection is shared with anyone unless you choose to share it yourself. The app never writes to the spreadsheet — it reads the tabs and only creates new photo files in your Drive folders.

## For developers

[DEVELOPERS.md](https://github.com/andresuman/memorabilia-showcase/blob/main/DEVELOPERS.md) has the technical reference: the exact columns and their rules, how the pages work, the permissions in detail, the tests, and the one-click deploy with `clasp` for the terminal.

## License

MIT. See [LICENSE](https://github.com/andresuman/memorabilia-showcase/blob/main/LICENSE).
