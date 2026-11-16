/* Tests for Code.gs, run in Node with the Google services replaced by fakes (tests/unit/gas.js).
   Usage: node --test tests/unit/*.test.js   (needs nothing installed) */
'use strict';
const test = require('node:test');
const assert = require('assert');
const { load, defaultTabs, AM_HEADER, GU_HEADER, SERIAL_2023_07_23, eq } = require('./gas');
const throws = function (fn, pattern) { assert.throws(fn, pattern); };

const api0 = load(defaultTabs(), {});
const AM = api0.CONFIG.PHOTOS_FOLDER_ID;
const folders = { [AM]: ['AM-0002.jpg', 'AM-0002-3.jpg', 'AM-0002-2.jpg', 'notes.txt'] };
const messy = { [AM]: ['AM-0002.jpg', 'AM-0002.png', 'AM-0002-2.jpg', 'AM-0002 (1).jpg', 'AM-002.jpg', 'am-0001.jpg', 'AM-0009.jpg'] };

test('getCollection groups rows by Item ID, keeps signatures in order, skips rows without ID', function () {
  const c = load(defaultTabs(), folders).getCollection();
  eq(c.items.map(function (i) { return i.id; }), ['AM-0001', 'AM-0002']);
  eq(c.items[1].signatures.map(function (s) { return s.signer; }), ['Al Stone', 'Ben Cole']);
});
test('getCollection reads dates, prices, certificates and trims text', function () {
  const c = load(defaultTabs(), folders).getCollection();
  const it = c.items[1];
  eq(c.items[0].signatures[0].date, '2023-07-23', 'serial date');
  eq(it.signatures[1].date, '07/01/2024', 'text date kept');
  eq(it.price, 59.5, 'price from the first row');
  eq(c.items[0].price, null, 'no price');
  eq([it.itemAuth, it.itemCert, it.usage], ['MLB', 'JD1', 'Team Issued']);
  eq([it.signatures[1].autoCert, it.signatures[1].giftedBy, it.signatures[1].inscription], ['12345', '', 'HOF 96']);
});
test('getCollection lists photos: main first, then -2, -3 in order; ignores non-images', function () {
  const c = load(defaultTabs(), folders).getCollection();
  // Files are numbered in folder order: AM-0002.jpg = file1, AM-0002-3.jpg = file2, AM-0002-2.jpg = file3.
  // Each reference carries the file's last-updated time ("~0" in these fakes).
  eq(c.items[1].photos, ['file1~0', 'file3~0', 'file2~0']);
  eq(c.items[0].photos, []);
});
test('photos: files in the trash are left out; extras sort by number (-10 after -3); an odd Item ID breaks nothing', function () {
  const tabs = defaultTabs();
  tabs['Autographed Memorabilia'].push(['AM-0(1', 'Typo Row']);
  const api = load(tabs, { [AM]: ['AM-0002.jpg', 'AM-0002-10.jpg', 'AM-0002-3.jpg', '~AM-0002-2.jpg', '~AM-0001.jpg', 'AM-0(1.jpg'] });
  const c = api.getCollection();
  eq(c.items[1].photos, ['file1~0', 'file3~0', 'file2~0'], 'main, -3, -10; -2 is in the trash');
  eq(c.items[0].photos, [], 'AM-0001.jpg is in the trash');
  eq(c.items[2].photos, ['file6~0'], 'an Item ID with ( still gets its photo');
  eq([c.checks.orphans, c.checks.badIds], [[], ['AM-0(1 (row 6)']]);
});
test('getLogos: data URIs by team, then from the cache until a logo changes', function () {
  const api = load(defaultTabs(), { [api0.CONFIG.LOGOS_FOLDER_ID]: ['Bay City Breakers.png', 'notes.txt'] });
  const first = api.getLogos();
  eq([Object.keys(first), /^data:image\/jpeg;base64,/.test(first['Bay City Breakers'])], [['Bay City Breakers'], true]);
  const reads = api.fileReads();
  eq(api.getLogos(), first, 'same answer');
  eq(api.fileReads(), reads, 'the second time nothing is read from Drive');
  api.files.file1.updated = 5000; // the logo was replaced in Drive
  api.getLogos();
  eq(api.fileReads(), reads + 1, 'a replaced logo is read again');
});
test('getLogos: only the teams the collection names (signatures, Game Used team and both teams of the game)', function () {
  const tabs = defaultTabs();
  tabs['Game Used Memorabilia'][1][9] = 'Cedar Falls Falcons'; // the away team of a game
  const api = load(tabs, { [api0.CONFIG.LOGOS_FOLDER_ID]: ['Bay City Breakers.png', 'Cedar Falls Falcons.png', 'Harbor City Herons.png', 'Golden Bay Gulls.png', 'Lake City Lumberjacks.png'] });
  eq(Object.keys(api.getLogos()).sort(), ['Bay City Breakers', 'Cedar Falls Falcons', 'Harbor City Herons']);
  // A tab that cannot be read: every logo, so nothing goes missing.
  const t2 = defaultTabs(); t2['Game Used Memorabilia'][0] = t2['Game Used Memorabilia'][0].map(function (h) { return h === 'Home Team' ? 'Home' : h; });
  const api2 = load(t2, { [api0.CONFIG.LOGOS_FOLDER_ID]: ['Bay City Breakers.png', 'Golden Bay Gulls.png'] });
  eq(Object.keys(api2.getLogos()).sort(), ['Bay City Breakers', 'Golden Bay Gulls']);
});
test('getPhoto: the width asked is kept between 120 and 2048 px', function () {
  const api = load(defaultTabs(), folders);
  api.getPhoto('file1', 5);
  api.getPhoto('file1', 120);
  eq(api.fetches(), 1, '5 px is asked as 120 px (same cached copy)');
  api.getPhoto('file1', 99999);
  api.getPhoto('file1', 2048);
  eq(api.fetches(), 2, 'a huge width is asked as 2048 px');
});
test('getCollection links the spreadsheet tab by its gid', function () {
  eq(/#gid=100$/.test(load(defaultTabs(), folders).getCollection().links.sheet), true);
});
test('a missing column is a clear error', function () {
  const tabs = defaultTabs();
  tabs['Autographed Memorabilia'][0] = AM_HEADER.filter(function (h) { return h !== 'Signer'; });
  throws(function () { load(tabs, folders).getCollection(); }, /Column "Signer" was not found in the Autographed Memorabilia tab/);
});
test('an empty tab says the collection is missing, not an error', function () {
  const tabs = defaultTabs();
  tabs['Game Used Memorabilia'] = [];
  const g = load(tabs, folders).getGameUsed();
  eq([g.missing, g.items], ['Game Used Memorabilia', []]);
});
test('checks: photos that match nothing, Drive copies, a name used twice, Item IDs not like AM-0000', function () {
  const tabs = defaultTabs();
  const g = load(tabs, folders).getCollection();
  eq(g.checks, { orphans: [], copies: [], dupes: [], badIds: [], guTab: [] }, 'a clean folder');
  tabs['Autographed Memorabilia'].push(['AM-016', 'Typo Row']);
  const c = load(tabs, messy).getCollection();
  eq([c.checks.orphans, c.checks.copies, c.checks.dupes], [['AM-0009.jpg', 'AM-002.jpg', 'am-0001.jpg'], ['AM-0002 (1).jpg'], [['AM-0002.jpg', 'AM-0002.png']]]);
  eq(c.checks.badIds, ['AM-016 (row 6)']);
});
test('videos: an autographed item gets the video named by the hologram in the Cert Number of its Game Used row (before the slash, any case)', function () {
  const tabs = defaultTabs();
  tabs['Game Used Memorabilia'][1][19] = 'yp000001/ABC';
  const VID = api0.CONFIG.GU_FOLDER_ID;
  const c = load(tabs, { [VID]: ['YP000001.mp4', 'JD1.jpg', 'YP999999.mp4', '~JD9.mp4'] }).getCollection();
  eq(c.items[1].video, { ref: 'file1~0', size: 10, pieces: 1 }, 'AM-0002 has YP000001/ABC');
  eq(c.items[0].video, null, 'no certificate, no video');
});
test('a signed item takes its usage and certificate from Game Used (the source of truth)', function () {
  const tabs = defaultTabs();
  const gu = GU_HEADER.map(function () { return ''; });
  gu[0] = 'GU-0001'; gu[3] = 'Game Used'; gu[18] = 'MLB'; gu[19] = 'YP000002/XYZ'; gu[21] = 'AM-0002';
  tabs['Game Used Memorabilia'] = [GU_HEADER, gu];
  const VID = api0.CONFIG.GU_FOLDER_ID;
  const c = load(tabs, { [VID]: ['YP000002.mp4'] }).getCollection();
  const it = c.items[1];
  eq([it.usage, it.itemAuth, it.itemCert, it.video && it.video.ref], ['Game Used', 'MLB', 'YP000002/XYZ', 'file1~0'], 'from its Game Used row, video too');
  eq([c.items[0].usage, c.items[0].itemCert], ['', ''], 'not in Game Used: no usage, no certificate');
});
test('a Game Used tab that cannot be read does not take Autographed Memorabilia down: items without usage, and a check', function () {
  const tabs = defaultTabs();
  tabs['Game Used Memorabilia'] = [['Item ID', 'Item Type']]; // the Usage column was renamed away
  const c = load(tabs, {}).getCollection();
  eq([c.items.length > 0, c.items[1].usage, c.items[1].itemCert], [true, '', '']);
  eq(c.checks.guTab, ['Column "Usage" was not found in the Game Used Memorabilia tab.']);
});
test('one collection only: no Autographed Memorabilia tab — the collection is missing, Game Used is unaffected', function () {
  const tabs = defaultTabs();
  delete tabs['Autographed Memorabilia'];
  const api = load(tabs, folders);
  eq([api.getCollection().missing, api.getCollection().items], ['Autographed Memorabilia', []]);
  eq(api.getGameUsed().items.length, 1);
});
test('one collection only: no Game Used tab and no Game Used folder — Autographed Memorabilia still shows', function () {
  const tabs = defaultTabs();
  delete tabs['Game Used Memorabilia'];
  const c = load(tabs, {}).getCollection();
  eq([c.missing, c.items.length, c.items[1].usage, c.items[1].video], [null, 2, '', null]);
});
test('one collection only: no Game Used Memorabilia tab — the collection is missing', function () {
  const tabs = defaultTabs();
  delete tabs['Game Used Memorabilia'];
  const g = load(tabs, folders).getGameUsed();
  eq([g.missing, g.items], ['Game Used Memorabilia', []]);
});
test('getGameUsed: the Inning column wherever it is (none: empty); the Play cell keeps its line breaks', function () {
  const header = GU_HEADER.concat(['Inning']);
  const row = header.map(function () { return ''; });
  row[0] = 'GU-0001'; row[1] = 'Baseball'; row[header.indexOf('Play')] = 'Ball - x.\nFoul - y.'; row[header.indexOf('Inning')] = ' Bottom of 1st ';
  const tabs = defaultTabs(); tabs['Game Used Memorabilia'] = [header, row];
  const a = load(tabs).getGameUsed().items[0];
  eq([a.inning, a.play], ['Bottom of 1st', 'Ball - x.\nFoul - y.']);
  eq(load(defaultTabs()).getGameUsed().items[0].inning, '');
});
test('getGameUsed: one item per row, games, yes columns, signed IDs, photos, videos and what to check', function () {
  const tabs = defaultTabs();
  tabs['Game Used Memorabilia'] = [GU_HEADER,
    ['GU-0001', 'Baseball', '', 'Game Used', 'Baseball', 'Harbor City Herons', '', SERIAL_2023_07_23, '', 'Cedar Falls Falcons', 'Harbor City Herons', '4 - 1', 'l',
      'Seaside Stadium', 'Yes', 'Leo Vance', 'Dario Fontaine', 'Double', 'MLB', 'yp000002/ABC', '', 'AM-0002, junk', SERIAL_2023_07_23, 'Herons Authentics', 12.5, 'Note.'],
    ['GU-0002', 'Gloves', 'Black', 'Game Used', 'Football', 'Bay City Breakers', 'Sam Rivers', '', 2021, '', '', '', '', '', '', '', '', '', 'Metabilia', 10001, 'yes'],
    ['GU-0002', 'Towel'],
    ['GU-3', 'Towel'],
    ['GU-0004', 'Baseball', '', 'Game Used', 'Baseball', 'Herons', '', SERIAL_2023_07_23, 2012, 'Cedar Falls Falcons', 'Harbor City Herons'],
    ['GU-0005', 'Baseball', '', 'Game Used', 'Baseball', 'Harbor City Herons', '', SERIAL_2023_07_23, 2022, 'Harbor City Herons', 'Cedar Falls Falcons', '2 - 5', 'W'],
    ['GU-0006', 'Baseball', '', 'game  used', 'Baseball', 'Harbor City Herons', '', '', '', '', '', '', '', '', 'Yes', '', '', '', '', '', '', 'AM-0002; AM-003 AM-0001'],
    ['', 'no ID: skipped']];
  const GU = api0.CONFIG.GU_FOLDER_ID;
  const g = load(tabs, { [GU]: ['GU-0001.jpg', 'GU-0001-2.jpg', 'YP000002.mp4', 'YP999999.mp4', 'GU-0099.jpg'] }).getGameUsed();
  eq(g.items.map(function (x) { return x.id; }), ['GU-0001', 'GU-0002', 'GU-0002', 'GU-3', 'GU-0004', 'GU-0005', 'GU-0006']);
  const a = g.items[0], b = g.items[1];
  eq([a.date, a.away, a.home, a.score, a.result, a.attended, a.atBat, a.pitching, a.play], ['2023-07-23', 'Cedar Falls Falcons', 'Harbor City Herons', '4 - 1', 'L', true, 'Leo Vance', 'Dario Fontaine', 'Double']);
  eq([a.signed, a.bought, a.at, a.price, a.photoMatched, a.photos], [['AM-0002'], '2023-07-23', 'Herons Authentics', 12.5, false, ['file1~0', 'file2~0']]);
  eq(a.video, { ref: 'file3~0', size: 10, pieces: 1 }, 'the video named by its hologram');
  eq([b.player, b.cert, b.photoMatched, b.attended, b.price, b.video], ['Sam Rivers', '10001', true, false, null, null]);
  eq([a.detail, a.season, b.detail, b.season], ['', '', 'Black', '2021'], 'variant and season');
  eq([g.checks.orphans, g.checks.videos, g.checks.badIds], [['GU-0099.jpg'], ['YP999999.mp4'], ['GU-0002 (row 4)', 'GU-3 (row 5)']]);
  eq([g.checks.noSeason, g.checks.seasons, g.checks.teams], [['GU-0001 (row 2)'], ['GU-0004 (row 6): 2012, game in 2023'], ['GU-0004 (row 6): Herons']],
    'a game with no season, a season far from its game (the year before is fine), a team not in its game; an item with no game is not checked');
  eq(g.checks.results, ['GU-0005 (row 7): W, the Harbor City Herons 2 - 5'], 'a result that the score contradicts for the item\'s team (GU-0001: 4 - 1 against, L, is right)');
  eq([g.items[6].signed, g.checks.badSigned], [['AM-0002', 'AM-0001'], ['GU-0001 (row 2): junk', 'GU-0006 (row 8): AM-003']],
    'Signed: IDs separated by commas, semicolons or spaces; a typo is reported and the good IDs still count');
  eq([g.checks.noGame, g.checks.usage, g.checks.signedTwice], [['GU-0006 (row 8)'], ['GU-0006 (row 8): "game  used", not "Game Used"'], ['AM-0002: GU-0001, GU-0006']],
    '"I was there" with no game, a usage written another way (no fixed list), one signed item in two rows');
  eq(/#gid=\d+$/.test(g.links.sheet), true);
});
test('getTeams: every team with its color (a color only when it is #RRGGBB), and the teams the collection names with no color', function () {
  const tabs = defaultTabs();
  tabs['Game Used Memorabilia'][1][9] = 'Northgate Nomads'; // the away team of a game: a former name
  tabs['Game Used Memorabilia'][1][10] = 'Harbor City Herons';
  tabs['Teams'] = [['Team', 'League', 'Stadium', 'Former Names', 'Color'],
    ['Harbor City Herons', 'MLB', 'Seaside Stadium', '', '#E2560B'],
    ['Northgate Knights', 'MLB', 'Knight Field', 'Northgate Nomads', '#00385D'],
    ['Bay City Breakers', 'NFL', '', '', 'purple'],
    ['Golden Bay Gulls', 'MLB', '', 'Bay City Breakers', '#0E3386']];
  const LOGOS = api0.CONFIG.LOGOS_FOLDER_ID;
  const t = load(tabs, { [LOGOS]: ['Harbor City Herons.png', 'Northgate Nomads.png', 'Golden Bay Gulls.png', 'Lake City Lumberjacks.png'] }).getTeams();
  eq(t.teams.map(function (x) { return [x.team, x.league, x.color]; }), [['Harbor City Herons', 'MLB', '#E2560B'], ['Northgate Knights', 'MLB', '#00385D'], ['Bay City Breakers', 'NFL', ''], ['Golden Bay Gulls', 'MLB', '#0E3386']]);
  eq([t.checks.noColor, t.checks.badColor], [[], ['Bay City Breakers (row 4): purple']],
    'a former name counts as known (the Breakers take the Gulls\' color through the mistake below); a color that is not #RRGGBB is reported');
  eq([t.checks.noLogo, t.checks.logoOrphans],
    [['Bay City Breakers'], ['Lake City Lumberjacks']],
    'teams the collection names with no logo; a logo no team claims');
  eq(/#gid=\d+$/.test(t.links.sheet), true);
});
test('getVideoChunk: pieces of the video from Drive byte ranges, only from the videos folder', function () {
  const VID = api0.CONFIG.GU_FOLDER_ID;
  const api = load(defaultTabs(), { [VID]: ['YP000001.mp4', 'cover.jpg'], [AM]: ['AM-0001.mp4'] });
  api.CONFIG.VIDEO_CHUNK = 4;
  const piece = function (i) { return Array.from(Buffer.from(api.getVideoChunk('file1~0', i), 'base64')); };
  eq([piece(0), piece(1), piece(2)], [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]], 'three pieces, the last one shorter');
  const gu = GU_HEADER.map(function () { return ''; }); gu[0] = 'GU-0009'; gu[19] = 'YP000001/ABC';
  const tabs = defaultTabs(); tabs['Game Used Memorabilia'] = [GU_HEADER, gu];
  const api2 = load(tabs, { [VID]: ['YP000001.mp4'] }); api2.CONFIG.VIDEO_CHUNK = 4;
  eq(api2.getGameUsed().items[0].video.pieces, 3, 'the page is told how many pieces there are');
  throws(function () { api.getVideoChunk('file1~0', 3); }, /does not exist/);
  throws(function () { api.getVideoChunk('file1~0', -1); }, /does not exist/);
  throws(function () { api.getVideoChunk('file1~0', 0.5); }, /does not exist/);
  throws(function () { api.getVideoChunk('file2', 0); }, /not a video in the Game Used folder/);
  throws(function () { api.getVideoChunk('file3', 0); }, /not a video in the Game Used folder/);
  api.ctx.rangeCode = 200; // Drive ignored the range and sent the whole file
  eq(piece(1), [4, 5, 6, 7], 'cut from the whole file');
  api.ctx.rangeCode = 403;
  throws(function () { api.getVideoChunk('file1', 0); }, /could not be read from Drive \(403\)/);
});
test('columnHas_ finds exact cell values only', function () {
  const api = load(defaultTabs(), folders);
  eq([api.columnHas_('Autographed Memorabilia', 'Item Type', 'Helmet'), api.columnHas_('Autographed Memorabilia', 'Item Type', 'Helm'),
    api.columnHas_('Autographed Memorabilia', 'No Such Column', 'Helmet')], [true, false, false]);
});
test('getPhoto serves files from the photos folders only', function () {
  const api = load(defaultTabs(), Object.assign({}, folders, { elsewhere: ['secret.jpg'] }));
  eq(/^data:image\/jpeg;base64,/.test(api.getPhoto('file1', 400)), true); // AM-0002.jpg
  const other = 'file' + (Object.keys(folders).reduce(function (n, k) { return n + folders[k].length; }, 0) + 1);
  throws(function () { api.getPhoto(other, 400); }, /not in a photos folder/);
});
test('getPhoto gives the frame Drive keeps of a video (its play tile), never the video itself', function () {
  const VID = api0.CONFIG.GU_FOLDER_ID;
  const api = load(defaultTabs(), { [VID]: ['YP000001.mp4'] });
  eq(Buffer.from(api.getPhoto('file1~0', 128).split(',')[1], 'base64')[3], 1, "Drive's thumbnail of the video");
  api.ctx.thumbFail = true;
  eq(Array.from(Buffer.from(api.getPhoto('file1~1', 128).split(',')[1], 'base64')), [0xFF, 0xD8, 0xFE], 'its standard thumbnail, not the small video');
  api.ctx.noThumb = true;
  throws(function () { api.getPhoto('file1~2', 128); }, /no frame of that video yet/);
});
test('getPhoto caches each photo version: a photo replaced in Drive (new last-updated time) is fetched again', function () {
  const api = load(defaultTabs(), folders);
  api.getPhoto('file1~100', 400);
  api.getPhoto('file1~100', 400);
  eq(api.fetches(), 1, 'same version: from the cache');
  api.getPhoto('file1~200', 400);
  eq(api.fetches(), 2, 'new version: fetched again');
  api.getPhoto('file1~200', 800);
  eq(api.fetches(), 3, 'another size: fetched');
});
test('upload: an item photo arrives in pieces and is saved with the next free name', function () {
  const api = load(defaultTabs(), folders);
  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6]).toString('base64');
  const t = api.beginPhoto('AM-0002');
  api.putPhotoChunk(t, 0, jpeg.slice(0, 8));
  api.putPhotoChunk(t, 1, jpeg.slice(8));
  const res = api.finishPhoto(t, 2);
  eq(res.name, 'AM-0002-4.jpg', 'AM-0002, -2 and -3 exist');
  eq(/^file\d+~0$/.test(res.fileId), true, 'a photo reference');
  eq(api.created, [{ folder: AM, name: 'AM-0002-4.jpg', size: 10 }]);
  throws(function () { api.finishPhoto(t, 2); }, /expired/);
});
test('upload: a Game Used item photo goes to the Game Used folder as GU-0001.jpg', function () {
  const tabs = defaultTabs();
  tabs['Game Used Memorabilia'] = [GU_HEADER, ['GU-0001', 'Baseball']];
  const api = load(tabs, folders);
  throws(function () { api.beginPhoto('GU-0002'); }, /not in the spreadsheet/);
  const t = api.beginPhoto('GU-0001');
  api.putPhotoChunk(t, 0, Buffer.from([0xFF, 0xD8, 0xFF, 1]).toString('base64'));
  eq(api.finishPhoto(t, 1).name, 'GU-0001.jpg');
  eq(api.created.map(function (c) { return c.folder; }), [api0.CONFIG.GU_FOLDER_ID]);
});
test('upload: refuses unknown items, non-JPEG files and damaged pieces', function () {
  const api = load(defaultTabs(), folders);
  throws(function () { api.beginPhoto('AM-0999'); }, /not in the spreadsheet/);
  throws(function () { api.beginPhoto('../x'); }, /Unknown item/);
  const t = api.beginPhoto('AM-0001');
  throws(function () { api.putPhotoChunk(t, 0, 'not base64!'); }, /damaged/);
  api.putPhotoChunk(t, 0, Buffer.from([0x89, 0x50, 0x4E, 0x47]).toString('base64'));
  throws(function () { api.finishPhoto(t, 1); }, /must be a JPEG/);
  const t2 = api.beginPhoto('AM-0001');
  api.putPhotoChunk(t2, 0, Buffer.from([0xFF, 0xD8]).toString('base64'));
  throws(function () { api.finishPhoto(t2, 2); }, /incomplete/); // the second piece never arrived
  throws(function () { api.finishPhoto(t2, 0); }, /incomplete/);
  eq(api.created, []);
});
