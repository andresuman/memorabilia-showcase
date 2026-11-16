/**
 * Memorabilia Showcase — showcase and manage autographed and game-used sports memorabilia.
 * A Google Apps Script web app backed by a Google Sheet.
 *
 * Reads its tabs live, finding columns by header name (reordering columns breaks nothing):
 * - "Autographed Memorabilia": rows grouped by Item ID (one object, many signatures);
 * - "Game Used Memorabilia": one row per game-used (or team-issued, practice-used) object, signed ones referenced by Item ID;
 * - "Teams": one row per team: League, Stadium, Former Names and Color.
 * Photos and team logos come from Drive and are sent to the page as data URIs.
 * Videos of the play a game-used ball was used in come from Drive in pieces (see getVideoChunk).
 * The spreadsheet is read with the read-only permission (Sheets API); see readTab_.
 * The only writes are new photo files in the photos folders (never changes or deletes files).
 * Each deployment is private to its owner: the web app runs as the deployer, for the deployer only.
 */

// Setup: fill these in with your own spreadsheet and Drive folders (see README.md, "Setup").
const CONFIG = {
  SPREADSHEET_ID: 'PASTE_YOUR_SPREADSHEET_ID_HERE',
  SHEET_NAME: 'Autographed Memorabilia',
  PHOTOS_FOLDER_ID: 'PASTE_YOUR_AUTOGRAPHED_PHOTOS_FOLDER_ID_HERE', // photos of autographed items (AM-0001.jpg...)
  LOGOS_FOLDER_ID: 'PASTE_YOUR_TEAM_LOGOS_FOLDER_ID_HERE',         // team logos (<Team>.png)
  GU_SHEET_NAME: 'Game Used Memorabilia',
  TEAMS_SHEET_NAME: 'Teams',                                        // every team: League, Stadium, Former Names and Color
  GU_FOLDER_ID: 'PASTE_YOUR_GAME_USED_FOLDER_ID_HERE',              // Game Used photos (GU-0001.jpg) and videos (named by the ball's hologram: AB123456.mp4)
  VIDEO_CHUNK: 2 * 1024 * 1024,                                     // bytes per piece sent to the page
  MAX_PHOTO_WIDTH: 2048,
  CACHE_SECONDS: 21600                                              // 6 hours
};

/*
 * Images are sent to the page as data URIs instead of Drive links.
 * Drive links need Google cookies, which phones (Safari) block inside the
 * web app, so the images showed up broken there.
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Memorabilia Showcase')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Index.html is split into smaller files, each a complete <style> or <script> block (the pattern in the
 * Apps Script HTML Service best practices): Styles, JsCore, JsPanel, JsAutographed, JsHome, JsGameUsed,
 * JsCrop, JsApp. Index pulls them in with <?!= include('Name') ?>; the browser gets a single page.
 */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/**
 * Called from the page. The Autographed Memorabilia tab: items (one per Item ID) with their signatures and photos.
 * The story of the item (usage, its certificate) lives in Game Used, the source of truth: a signed item takes it from
 * the Game Used row whose Signed column names it (Autographed Memorabilia has no item usage or certificate columns).
 */
function getCollection() {
  const t = readTable_(CONFIG.SHEET_NAME);
  // A Game Used tab that cannot be read (a renamed column) does not take this collection down with it: the items
  // show without their usage and certificate, and Things to check says why.
  let fromGu = {};
  const guTab = [];
  try { fromGu = gameUsedByAm_(); } catch (e) { guTab.push(e.message); }
  const col = t.col;
  const text = text_;
  const C = {
    id: col('Item ID'), signer: col('Signer'), sport: col('Sport'), team: col('Team'),
    type: col('Item Type'), model: col('Item Model'), detail: col('Item Detail'),
    inscription: col('Autograph Inscription'), date: col('Date Obtained'), how: col('How Obtained'),
    giftedBy: col('Gifted By'), at: col('Obtained At'),
    autoAuth: col('Autograph Authenticator'), autoCert: col('Autograph Cert Number'),
    price: col('Signed Item Price (USD)'), instagram: col('Instagram Post'), notes: col('Notes')
  };

  const photos = listImages_(CONFIG.PHOTOS_FOLDER_ID);
  const extras = extraPhotos_(photos);
  const videos = listFiles_(CONFIG.GU_FOLDER_ID, 'video/');

  const items = {};
  const order = [];
  const badIds = [];

  t.rows.forEach(function (r, i) {
    const id = text(r[C.id]);
    if (!id) return;
    if (!/^AM-\d{4}$/.test(id) && !items[id]) badIds.push(id + ' (row ' + (i + 2) + ')');

    if (!items[id]) {
      const price = r[C.price];
      const g = fromGu[id] || { usage: '', auth: '', cert: '' };
      items[id] = {
        id: id,
        type: text(r[C.type]),
        model: text(r[C.model]),
        detail: text(r[C.detail]),
        usage: g.usage,
        itemAuth: g.auth,
        itemCert: g.cert,
        price: typeof price === 'number' ? price : null,
        photos: photoIdsFor_(id, photos, extras),
        video: videoFor_(g.cert, videos),
        signatures: []
      };
      order.push(id);
    }

    items[id].signatures.push({
      signer: text(r[C.signer]),
      sport: text(r[C.sport]),
      team: text(r[C.team]),
      inscription: text(r[C.inscription]),
      date: date_(r[C.date]),
      how: text(r[C.how]),
      giftedBy: text(r[C.giftedBy]),
      at: text(r[C.at]),
      autoAuth: text(r[C.autoAuth]),
      autoCert: text(r[C.autoCert]),
      instagram: text(r[C.instagram]),
      notes: text(r[C.notes])
    });
  });

  // A photo belongs to an item when it is named by its Item ID, or Item ID-N for the extras.
  const checks = photoChecks_(photos, function (base) {
    const m = base.match(/^(.+)-\d+$/);
    return !!(items[base] || (m && items[m[1]]));
  });
  checks.badIds = badIds;
  checks.guTab = guTab;
  return {
    items: order.map(function (id) { return items[id]; }),
    checks: checks,
    links: {
      sheet: sheetLink_(CONFIG.SHEET_NAME),
      photos: 'https://drive.google.com/drive/folders/' + CONFIG.PHOTOS_FOLDER_ID,
      logos: 'https://drive.google.com/drive/folders/' + CONFIG.LOGOS_FOLDER_ID
    }
  };
}

/**
 * Called from the page. The Game Used Memorabilia tab: one row per object used in a game (or team issued,
 * practice used), signed or not. Signed = Item IDs from Autographed Memorabilia (who signed and their photos
 * come from there). Photos: "<Item ID>.jpg" (extras -2, -3...) in the Game Used folder; video: the ball's hologram.
 * Team and stadium are written as they were on the day of the game; Score is "away - home"; Result is how it
 * went for the item's Team (W, L or D: a Brewers ball from a game the Brewers won is a W). Item Detail is the
 * variant (White, Color Rush); Season is the
 * season of every item (the year it started: an NFL game in January counts in the season before); an item with no
 * game (team issued pants) has only the Season, never a made-up Game Date.
 */
function getGameUsed() {
  const t = readTable_(CONFIG.GU_SHEET_NAME);
  const col = t.col;
  const text = text_;
  const C = {
    id: col('Item ID'), type: col('Item Type'), detail: col('Item Detail', true), usage: col('Usage'), sport: col('Sport'), team: col('Team'), player: col('Player'),
    date: col('Game Date'), season: col('Season', true), away: col('Away Team'), home: col('Home Team'), score: col('Score'), result: col('Result'),
    stadium: col('Stadium'), attended: col('Attended'), inning: col('Inning', true), atBat: col('At Bat'), pitching: col('Pitching'), play: col('Play'),
    auth: col('Authenticator'), cert: col('Cert Number'), matched: col('Photo Matched'), signed: col('Signed'),
    bought: col('Date Obtained'), at: col('Obtained At'), price: col('Price (USD)'), notes: col('Notes')
  };
  const media = listFiles_(CONFIG.GU_FOLDER_ID, ['image/', 'video/']); // one pass over the folder
  const photos = media['image/'];
  const extras = extraPhotos_(photos);
  const videos = media['video/'];
  const items = [];
  const ids = {};
  const badIds = [];
  const badSigned = [];
  const yes = function (v) { return /^yes$/i.test(text(v)); };
  t.rows.forEach(function (r, i) {
    const id = text(r[C.id]);
    if (!id) return;
    if (!/^GU-\d{4}$/.test(id) || ids[id]) badIds.push(id + ' (row ' + (i + 2) + ')');
    signedTypos_(r[C.signed]).forEach(function (x) { badSigned.push(id + ' (row ' + (i + 2) + '): ' + x); });
    ids[id] = true;
    const price = r[C.price];
    items.push({
      id: id, type: text(r[C.type]), detail: text(r[C.detail]), usage: text(r[C.usage]), sport: text(r[C.sport]), team: text(r[C.team]), player: text(r[C.player]),
      date: date_(r[C.date]), season: text(r[C.season]), away: text(r[C.away]), home: text(r[C.home]), score: text(r[C.score]), result: text(r[C.result]).toUpperCase(),
      stadium: text(r[C.stadium]), attended: yes(r[C.attended]),
      inning: text(r[C.inning]), atBat: text(r[C.atBat]), pitching: text(r[C.pitching]), play: text(r[C.play]),
      auth: text(r[C.auth]), cert: text(r[C.cert]), photoMatched: yes(r[C.matched]), signed: itemIds_(r[C.signed]),
      bought: date_(r[C.bought]), at: text(r[C.at]), price: typeof price === 'number' ? price : null, notes: text(r[C.notes]),
      photos: photoIdsFor_(id, photos, extras), video: videoFor_(text(r[C.cert]), videos),
      order: i
    });
  });
  // A photo belongs to an item when it is named by its Item ID (or Item ID-N); a video by the hologram in its Cert Number.
  const checks = photoChecks_(photos, function (base) {
    const m = base.match(/^(.+)-\d+$/);
    return !!(ids[base] || (m && ids[m[1]]));
  });
  const holograms = {};
  items.forEach(function (it) { const h = hologram_(it.cert); if (h) holograms[h] = true; });
  checks.videos = photoChecks_(videos, function (base) { return !!holograms[base]; }).orphans;
  checks.badIds = badIds;
  checks.badSigned = badSigned;
  Object.assign(checks, gameUsedChecks_(items));
  return {
    items: items,
    checks: checks,
    links: { sheet: sheetLink_(CONFIG.GU_SHEET_NAME), photos: 'https://drive.google.com/drive/folders/' + CONFIG.GU_FOLDER_ID }
  };
}

/**
 * The Teams tab, one row per team of any collection: League (MLB, NFL...), Stadium, Former Names (separated by commas
 * or semicolons: a 2016 ball says "Cleveland Indians") and Color (#RRGGBB). The one place for what belongs to a team.
 */
function teams_(badColor) {
  const t = readTable_(CONFIG.TEAMS_SHEET_NAME);
  const C = { team: t.col('Team'), league: t.col('League', true), stadium: t.col('Stadium', true), former: t.col('Former Names', true), color: t.col('Color', true) };
  const out = [];
  t.rows.forEach(function (r, i) {
    const team = text_(r[C.team]);
    if (!team) return;
    const color = text_(r[C.color]);
    if (color && !/^#[0-9a-f]{6}$/i.test(color) && badColor) badColor.push(team + ' (row ' + (i + 2) + '): ' + color);
    out.push({ team: team, league: text_(r[C.league]), stadium: text_(r[C.stadium]),
      former: text_(r[C.former]).split(/\s*[;,]\s*/).filter(Boolean), color: /^#[0-9a-f]{6}$/i.test(color) ? color : '' });
  });
  return out;
}

/**
 * Called from the page: the Teams tab (see teams_), so every team takes its color from the spreadsheet; and what to
 * check, so a team never shows wrong unseen (the app only reports): noColor, a team the collection names
 * (signatures, Game Used) with no color in the tab; badColor, a Color that is not #RRGGBB; noLogo, a team the
 * collection names with no logo file (it shows its sport icon); logoOrphans, a logo file that is no team or former
 * name of the tab.
 */
function getTeams() {
  const badColor = [];
  const teams = teams_(badColor);
  const colored = {}, seen = {};
  teams.forEach(function (t) {
    [t.team].concat(t.former).forEach(function (n) {
      seen[n] = true;
      if (t.color) colored[n] = true;
    });
  });
  const used = teamsInUse_(teams) || {};
  const logos = listImages_(CONFIG.LOGOS_FOLDER_ID);
  return {
    teams: teams,
    checks: {
      noColor: Object.keys(used).filter(function (n) { return !colored[n]; }).sort(),
      badColor: badColor,
      noLogo: Object.keys(used).filter(function (n) { return !logos[n]; }).sort(),
      logoOrphans: Object.keys(logos).filter(function (n) { return !seen[n]; }).sort()
    },
    links: { sheet: sheetLink_(CONFIG.TEAMS_SHEET_NAME) }
  };
}

/**
 * What to check in the Game Used tab beyond photos and IDs, so a typo or a forgotten cell does not go unseen (the
 * app only reports; it fixes nothing): a Season that is neither the year of the game nor the one before (the year
 * the season started: an NFL game in January counts in the season before), a game with no Season, a Team that is
 * not one of the two teams, a Result that does not match the Score for the item's Team, "I was there" with no game, a
 * Usage written two ways, two rows naming the same signed item.
 * Items with no game are not checked for their game.
 */
function gameUsedChecks_(items) {
  const out = { seasons: [], noSeason: [], teams: [], results: [], noGame: [], usage: usageSpellings_(items), signedTwice: [] };
  const byAm = {};
  items.forEach(function (it) { it.signed.forEach(function (am) { (byAm[am] = byAm[am] || []).push(it.id); }); });
  Object.keys(byAm).forEach(function (am) { if (byAm[am].length > 1) out.signedTwice.push(am + ': ' + byAm[am].join(', ')); });
  items.forEach(function (it) {
    const where = it.id + ' (row ' + (it.order + 2) + ')';
    const year = Number(it.date.slice(0, 4));
    if (it.attended && !it.date) out.noGame.push(where);
    if (it.date && !it.season) out.noSeason.push(where);
    if (it.date && it.season && Number(it.season) !== year && Number(it.season) !== year - 1) out.seasons.push(where + ': ' + it.season + ', game in ' + year);
    if (it.team && (it.away || it.home) && it.team !== it.away && it.team !== it.home) out.teams.push(where + ': ' + it.team);
    // The Result, read from the Score (away - home) for the item's Team.
    const score = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(it.score);
    if (score && it.result && it.team && (it.team === it.away || it.team === it.home)) {
      const mine = Number(score[it.team === it.away ? 1 : 2]), theirs = Number(score[it.team === it.away ? 2 : 1]);
      const should = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
      if (it.result !== should) out.results.push(where + ': ' + it.result + ', the ' + it.team + ' ' + mine + ' - ' + theirs);
    }
  });
  return out;
}

/**
 * A Usage written two ways ("Game used" next to "Game Used"): the rows with the less common spelling, so a typo
 * shows without a fixed list of usages in the code.
 */
function usageSpellings_(items) {
  const groups = {};
  items.forEach(function (it) {
    if (!it.usage) return;
    const k = it.usage.toLowerCase().replace(/\s+/g, ' ');
    const g = groups[k] = groups[k] || {};
    (g[it.usage] = g[it.usage] || []).push(it);
  });
  const out = [];
  Object.keys(groups).forEach(function (k) {
    const spellings = Object.keys(groups[k]).sort(function (a, b) { return groups[k][b].length - groups[k][a].length; });
    spellings.slice(1).forEach(function (w) {
      groups[k][w].forEach(function (it) { out.push(it.id + ' (row ' + (it.order + 2) + '): "' + w + '", not "' + spellings[0] + '"'); });
    });
  });
  return out;
}

/** Usage, Authenticator and Cert Number of the Game Used items, by the Autographed Memorabilia IDs in their Signed column. */
function gameUsedByAm_() {
  const t = readTable_(CONFIG.GU_SHEET_NAME);
  const C = { usage: t.col('Usage'), auth: t.col('Authenticator'), cert: t.col('Cert Number'), signed: t.col('Signed') };
  const out = {};
  t.rows.forEach(function (r) {
    itemIds_(r[C.signed]).forEach(function (id) {
      if (!out[id]) out[id] = { usage: text_(r[C.usage]), auth: text_(r[C.auth]), cert: text_(r[C.cert]) };
    });
  });
  return out;
}

/**
 * Lists image files in a folder, keyed by file name without extension ("AM-0015.jpg" and "AM-0015-2.jpg" under
 * their own keys). Files in the trash are left out (Drive still lists them as children of the folder).
 */
function listImages_(folderId, want) {
  return listFiles_(folderId, 'image/', want);
}

/**
 * Same as listImages_ for any kind of file (kind = the start of its MIME type, 'image/' or 'video/'); videos also
 * carry their size. With a list of kinds, one pass over the folder returns { kind: files } for each.
 * want(base), if given, picks the files by name before anything else is asked of them (each question is a call).
 */
function listFiles_(folderId, kind, want) {
  const kinds = [].concat(kind);
  const out = {};
  kinds.forEach(function (k) { out[k] = {}; });
  const done = function () { return Array.isArray(kind) ? out : out[kind]; };
  if (!folderId) return done();
  let folder;
  try { folder = DriveApp.getFolderById(folderId); } catch (e) { return done(); }
  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    const base = f.getName().replace(/\.[^.]+$/, '').trim();
    if (want && !want(base)) continue;
    const type = String(f.getMimeType());
    const k = kinds.find(function (x) { return type.indexOf(x) === 0; });
    if (!k || f.isTrashed()) continue;
    const entry = { id: f.getId(), name: f.getName(), updated: f.getLastUpdated().getTime() };
    if (k === 'video/') entry.size = f.getSize(); // the page needs it to know how many pieces to ask for
    (out[k][base] = out[k][base] || []).push(entry);
  }
  return done();
}

/* ---------- Videos ----------
   A game-used ball can have a video of the play it was used in, trimmed by the owner and kept in the Game Used folder
   as an H.264 MP4 named by the ball's MLB hologram (AB123456.mp4). It matches the Game Used item whose Cert Number
   starts with that hologram ("AB123456/ABC"), and the Autographed Memorabilia item it names in Signed. The page fetches it in pieces (getVideoChunk), puts them back
   together and keeps the video in the browser, so it never needs a shared link or a YouTube upload. */

/** "AB123456/ABC" → "AB123456" (the hologram, before the slash). */
function hologram_(cert) {
  return text_(cert).split('/')[0].trim().toUpperCase();
}

/**
 * The video of an item, if any: { ref, size, pieces } (ref like a photo reference, see photoRef_; pieces = how many
 * getVideoChunk has for it, so the piece size lives only here).
 */
function videoFor_(cert, videos) {
  const h = hologram_(cert);
  const f = h && videos[h] ? videos[h][0] : null;
  return f ? { ref: photoRef_(f), size: f.size, pieces: Math.max(1, Math.ceil(f.size / CONFIG.VIDEO_CHUNK)) } : null;
}

/**
 * Called from the page: piece number index of a video (VIDEO_CHUNK bytes, the last one shorter), as base64 text.
 * Only videos in the Game Used folder can be read this way. Each piece is read on its own from Drive (a byte range),
 * so a piece never needs the whole file in memory.
 */
function getVideoChunk(ref, index) {
  const fileId = String(ref).split('~')[0];
  index = Number(index);
  const file = DriveApp.getFileById(fileId);
  if (!isInFolder_(file, CONFIG.GU_FOLDER_ID) || String(file.getMimeType()).indexOf('video/') !== 0) {
    throw new Error('That file is not a video in the Game Used folder.');
  }
  const size = file.getSize();
  const start = index * CONFIG.VIDEO_CHUNK;
  if (!(index >= 0 && Math.floor(index) === index && start < size)) throw new Error('That piece of the video does not exist.');
  const end = Math.min(size, start + CONFIG.VIDEO_CHUNK) - 1;
  const res = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + start + '-' + end },
    muteHttpExceptions: true
  });
  const code = res.getResponseCode();
  let bytes;
  if (code === 206) bytes = res.getContent();
  else if (code === 200) bytes = res.getContent().slice(start, end + 1); // the whole file came back
  else throw new Error('The video could not be read from Drive (' + code + ').');
  if (bytes.length !== end - start + 1) throw new Error('A piece of the video arrived incomplete.');
  return Utilities.base64Encode(bytes);
}

/**
 * What to check in a photos folder (the app only reports it; nothing is renamed or deleted):
 * orphans = files whose name matches nothing (known(base) is false), copies = "AM-0015 (1).jpg" made by Drive
 * when a file goes up twice (always ignored by the app), dupes = one name used by more than one file
 * (only one of them shows), each as a list of file names.
 */
function photoChecks_(photos, known) {
  const out = { orphans: [], copies: [], dupes: [] };
  Object.keys(photos).sort().forEach(function (base) {
    const names = photos[base].map(function (f) { return f.name; }).sort();
    if (/ \(\d+\)$/.test(base)) out.copies = out.copies.concat(names);
    else if (!known(base)) out.orphans = out.orphans.concat(names);
    else if (names.length > 1) out.dupes.push(names);
  });
  return out;
}

/**
 * How the page refers to a photo: "<Drive file ID>~<last-updated time>". getPhoto caches by this, so a photo
 * replaced in Drive under the same name (same file ID, new content) gets a new cache key and shows up at the
 * next reload instead of after the cache expires. Plain file IDs (no "~") work too.
 */
function photoRef_(f) {
  return f.id + '~' + f.updated;
}

/** The extra photos of each item, in numeric order: { 'AM-0015': [ref of AM-0015-2, ref of AM-0015-3...] }. */
function extraPhotos_(photos) {
  const out = {};
  Object.keys(photos).forEach(function (k) {
    const m = k.match(/^(.+)-(\d+)$/);
    if (m) (out[m[1]] = out[m[1]] || []).push({ n: Number(m[2]), ref: photoRef_(photos[k][0]) });
  });
  Object.keys(out).forEach(function (id) {
    out[id] = out[id].sort(function (a, b) { return a.n - b.n; }).map(function (e) { return e.ref; });
  });
  return out;
}

/** Main photo first (AM-0015), then extras in numeric order (AM-0015-2, AM-0015-3...). Returns photo references. */
function photoIdsFor_(id, photos, extras) {
  return (photos[id] ? [photoRef_(photos[id][0])] : []).concat(extras[id] || []);
}

/**
 * Called from the page right after the collection shows up.
 * Team logos as data URIs, cached so most visits never touch Drive.
 * A replaced logo gets a new cache key because its last-updated time changes.
 */
function getLogos() {
  // Only the teams the collection names (the folder holds every team): fewer files to read from Drive
  // when the cache is empty, and a lighter answer for the phone. If the tabs cannot be read, every logo.
  const used = teamsInUse_();
  const logos = listImages_(CONFIG.LOGOS_FOLDER_ID, used && function (base) { return !!used[base]; });
  const cache = CacheService.getScriptCache();
  const keyFor = function (name) { const f = logos[name][0]; return 'l:' + f.id + ':' + f.updated; };
  const names = Object.keys(logos);
  const hits = cache.getAll(names.map(keyFor));
  const out = {};
  const fresh = {};
  names.forEach(function (name) {
    const key = keyFor(name);
    if (hits[key]) { out[name] = hits[key]; return; }
    try {
      const uri = dataUri_(DriveApp.getFileById(logos[name][0].id).getBlob());
      out[name] = uri;
      if (uri.length < 95000) fresh[key] = uri;
    } catch (e) { /* that team keeps its sport icon */ }
  });
  if (Object.keys(fresh).length) cache.putAll(fresh, CONFIG.CACHE_SECONDS);
  return out;
}

/**
 * The teams the page can show a logo for: the Team of each signature (Autographed Memorabilia), the Team and the two
 * teams of the game of each Game Used item. { name: true }, or null when a tab cannot be read.
 * teams: the Teams tab already read (getTeams), so it is not read twice.
 */
function teamsInUse_(teams) {
  const used = {};
  const add = function (v) { const t = text_(v); if (t) used[t] = true; };
  try {
    [[CONFIG.SHEET_NAME, ['Team']], [CONFIG.GU_SHEET_NAME, ['Team', 'Away Team', 'Home Team']]].forEach(function (x) {
      const t = readTable_(x[0]);
      const cols = x[1].map(function (c) { return t.col(c); });
      t.rows.forEach(function (r) { cols.forEach(function (i) { add(r[i]); }); });
    });
  } catch (e) { return null; }
  return used;
}

/**
 * Called from the page for each photo as it scrolls into view (ref = a photo reference, see photoRef_).
 * Returns a resized copy of the photo (or, for a video, the frame Drive keeps of it) as a data URI.
 * Only files inside the photos folders (Autographed Memorabilia, Game Used) can be read this way.
 */
function getPhoto(ref, width) {
  width = Math.max(120, Math.min(CONFIG.MAX_PHOTO_WIDTH, Math.round(Number(width) || 600)));
  const fileId = String(ref).split('~')[0];
  const key = 'p:' + ref + ':' + width; // the reference carries the last-updated time (see photoRef_)
  const cache = CacheService.getScriptCache();
  const hit = cache.get(key);
  if (hit) return hit;

  const file = DriveApp.getFileById(fileId);
  if (![CONFIG.PHOTOS_FOLDER_ID, CONFIG.GU_FOLDER_ID].some(function (f) { return isInFolder_(file, f); })) {
    throw new Error('That file is not in a photos folder.');
  }

  let blob = null;
  try {
    // Drive's own resized copy, fetched with this script's authorization (no browser cookies involved).
    const res = UrlFetchApp.fetch('https://drive.google.com/thumbnail?id=' + fileId + '&sz=w' + width, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
      followRedirects: true
    });
    const type = String(res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'] || '');
    if (res.getResponseCode() === 200 && type.indexOf('image/') === 0) blob = res.getBlob();
  } catch (e) { /* fall back below */ }

  if (!blob) {
    if (String(file.getMimeType()).indexOf('image/') === 0) {
      const original = file.getBlob();
      // Small originals can go as they are; large ones use Drive's standard thumbnail.
      blob = original.getBytes().length <= 2.5 * 1024 * 1024 ? original : file.getThumbnail();
    } else {
      // A video (the frame on its play tile): only Drive's thumbnail, never the video itself.
      blob = file.getThumbnail();
      if (!blob) throw new Error('Drive has no frame of that video yet.');
    }
  }

  const uri = dataUri_(blob);
  if (uri.length < 95000) cache.put(key, uri, CONFIG.CACHE_SECONDS);
  return uri;
}

/*
 * Adding a photo from the page.
 * The page resizes the photo (longest side 2000 px), re-encodes it as JPEG (which also
 * drops the location data the phone stores in the original) and sends it in small
 * pieces: one large request from a phone never reached the script. Pieces wait in
 * the script cache until the last one arrives, then the file is created in the photos
 * folder as AM-0015.jpg, or AM-0015-2.jpg, -3... when the item already has photos (Game Used items, GU-0001.jpg,
 * in the Game Used folder).
 * Only creates files; never changes or deletes existing ones.
 */
const UPLOAD = { CHUNK_MAX: 200000, PIECE: 90000, TTL: 3600, MAX_BYTES: 8 * 1024 * 1024 };

/** Step 1: checks the item (AM-0015 in Autographed Memorabilia, GU-0001 in Game Used) and returns an upload ticket. */
function beginPhoto(itemId) {
  itemId = String(itemId || '').trim();
  if (!/^(AM|GU)-\d{4}$/.test(itemId)) throw new Error('Unknown item.');
  if (!itemExists_(itemId)) throw new Error('Item ' + itemId + ' is not in the spreadsheet.');
  const ticket = Utilities.getUuid();
  CacheService.getScriptCache().put('u:' + ticket, itemId, UPLOAD.TTL);
  return ticket;
}

/** Step 2, once per piece: a slice of the photo's base64 text. */
function putPhotoChunk(ticket, index, chunk) {
  const cache = CacheService.getScriptCache();
  if (!cache.get('u:' + ticket)) throw new Error('The upload expired. Please try again.');
  index = Number(index);
  chunk = String(chunk || '');
  if (!(index >= 0 && index < 400) || chunk.length > UPLOAD.CHUNK_MAX || !/^[A-Za-z0-9+/=]*$/.test(chunk)) {
    throw new Error('A piece of the photo arrived damaged.');
  }
  const pieces = {};
  let n = 0;
  for (let i = 0; i < chunk.length; i += UPLOAD.PIECE) pieces['u:' + ticket + ':' + index + ':' + (n++)] = chunk.slice(i, i + UPLOAD.PIECE);
  pieces['u:' + ticket + ':' + index] = String(n);
  cache.putAll(pieces, UPLOAD.TTL);
  return true;
}

/** Step 3: puts the pieces back together and saves the file. */
function finishPhoto(ticket, total) {
  const cache = CacheService.getScriptCache();
  const itemId = cache.get('u:' + ticket);
  if (!itemId) throw new Error('The upload expired. Please try again.');
  total = Number(total);
  if (!(total > 0 && total <= 400)) throw new Error('The photo arrived incomplete.');

  const counts = cache.getAll(Array.from({ length: total }, function (_, i) { return 'u:' + ticket + ':' + i; }));
  const keys = [];
  for (let i = 0; i < total; i++) {
    const n = Number(counts['u:' + ticket + ':' + i]);
    if (!n && n !== 0) throw new Error('The photo arrived incomplete. Please try again.');
    for (let j = 0; j < n; j++) keys.push('u:' + ticket + ':' + i + ':' + j);
  }
  const parts = cache.getAll(keys);
  let b64 = '';
  keys.forEach(function (k) {
    if (parts[k] === undefined || parts[k] === null) throw new Error('The photo arrived incomplete. Please try again.');
    b64 += parts[k];
  });
  cache.removeAll(keys.concat(Object.keys(counts), ['u:' + ticket]));
  const bytes = Utilities.base64Decode(b64);
  return savePhotoBytes_(itemId, bytes);
}

function savePhotoBytes_(itemId, bytes) {
  checkJpeg_(bytes);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const folderId = itemFolder_(itemId);
    const existing = listImages_(folderId);
    let name = itemId;
    if (existing[itemId]) {
      let n = 2;
      while (existing[itemId + '-' + n]) n++;
      name = itemId + '-' + n;
    }
    const file = DriveApp.getFolderById(folderId)
      .createFile(Utilities.newBlob(bytes, 'image/jpeg', name + '.jpg'));
    return { fileId: photoRef_({ id: file.getId(), updated: file.getLastUpdated().getTime() }), name: file.getName() };
  } finally {
    lock.releaseLock();
  }
}

/** Rejects anything that is not a JPEG of a sensible size (every JPEG starts with FF D8). */
function checkJpeg_(bytes) {
  if (bytes.length > UPLOAD.MAX_BYTES) throw new Error('The photo is too large.');
  if (bytes.length < 3 || (bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8) throw new Error('The photo must be a JPEG image.');
}

function itemExists_(itemId) {
  return columnHas_(itemId.indexOf('GU-') === 0 ? CONFIG.GU_SHEET_NAME : CONFIG.SHEET_NAME, 'Item ID', itemId);
}

/** Where an item's photos go: Game Used items (GU-0001) in the Game Used folder, the others in Autographed Memorabilia. */
function itemFolder_(itemId) {
  return itemId.indexOf('GU-') === 0 ? CONFIG.GU_FOLDER_ID : CONFIG.PHOTOS_FOLDER_ID;
}

/* ---------- Reading the spreadsheet (read-only) ---------- */

/*
 * The tabs are read through the Sheets API (advanced service "Sheets"), which works with the
 * read-only permission. SpreadsheetApp would need full edit access to the whole spreadsheet.
 * Values come unformatted: numbers as numbers, dates as serial numbers (see serialToIso_),
 * text as text. Empty cells at the end of a row are left out (undefined).
 */
function readTab_(name) {
  let res;
  try {
    res = Sheets.Spreadsheets.Values.get(CONFIG.SPREADSHEET_ID, "'" + name.replace(/'/g, "''") + "'", {
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'SERIAL_NUMBER'
    });
  } catch (e) {
    throw new Error('Tab "' + name + '" could not be read from the spreadsheet. ' + e.message);
  }
  return res.values || [];
}

/**
 * A tab as a table: rows below the header, and col(name) = the column index of a header
 * (columns are found by name, so reordering them breaks nothing). A missing column is an error,
 * unless optional, then -1.
 */
function readTable_(name) {
  const values = readTab_(name);
  if (!values.length) throw new Error('Tab "' + name + '" is empty: it needs at least the header row.');
  const header = values.shift().map(function (h) { return String(h).trim(); });
  return {
    rows: values,
    col: function (column, optional) {
      const i = header.indexOf(column);
      if (i === -1 && !optional) throw new Error('Column "' + column + '" was not found in the ' + name + ' tab.');
      return i;
    }
  };
}

/** A cell as trimmed text ('' when empty). */
function text_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

/** A date cell as "yyyy-MM-dd" (dates arrive as serial numbers; anything else is kept as text). */
function date_(v) {
  return typeof v === 'number' ? serialToIso_(v) : text_(v);
}

/**
 * "AM-0008, AM-0062" → ['AM-0008', 'AM-0062']. The IDs may be separated by commas, semicolons or spaces; anything
 * that is not an Item ID is left out here and reported by signedTypos_, so a typo never just makes an item unsigned.
 */
function itemIds_(v) {
  return signedParts_(v).filter(function (x) { return /^AM-\d{4}$/.test(x); });
}

/** What is written in a Signed cell that is not an Item ID ("AM-002"). */
function signedTypos_(v) {
  return signedParts_(v).filter(function (x) { return !/^AM-\d{4}$/.test(x); });
}

function signedParts_(v) {
  return text_(v).split(/[\s,;]+/).filter(Boolean);
}

/** Link to a tab of the spreadsheet (its gid comes from the spreadsheet's metadata, cached). */
function sheetLink_(name) {
  const cache = CacheService.getScriptCache();
  let gids = null;
  try { gids = JSON.parse(cache.get('gids') || 'null'); } catch (e) { gids = null; }
  if (!gids) {
    gids = {};
    try {
      Sheets.Spreadsheets.get(CONFIG.SPREADSHEET_ID, { fields: 'sheets.properties(sheetId,title)' }).sheets
        .forEach(function (sh) { gids[sh.properties.title] = sh.properties.sheetId; });
      cache.put('gids', JSON.stringify(gids), CONFIG.CACHE_SECONDS);
    } catch (e) { /* the link just opens the first tab */ }
  }
  return 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit' + (name in gids ? '#gid=' + gids[name] : '');
}

/** True when the column with this header has a cell equal to value. */
function columnHas_(tab, header, value) {
  const t = readTable_(tab);
  const col = t.col(header, true);
  return col !== -1 && t.rows.some(function (r) { return text_(r[col]) === value; });
}

/** Spreadsheet date serial (days since 1899-12-30) to "yyyy-MM-dd". */
function serialToIso_(serial) {
  return Utilities.formatDate(new Date(Math.round((serial - 25569) * 86400000)), 'UTC', 'yyyy-MM-dd');
}

function isInFolder_(file, folderId) {
  const parents = file.getParents();
  while (parents.hasNext()) { if (parents.next().getId() === folderId) return true; }
  return false;
}

function dataUri_(blob) {
  return 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes());
}
