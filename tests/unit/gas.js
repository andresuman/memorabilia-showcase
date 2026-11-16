/* A fake of the Google services Code.gs uses (Sheets, Drive, Cache, Lock, UrlFetch, Utilities), so Code.gs
   runs in Node: load(tabs, folders) gives its functions plus what the fakes saw. Shared by the server and
   contract tests. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const CODE = fs.readFileSync(path.join(__dirname, '..', '..', 'Code.gs'), 'utf8');
const SERIAL_2023_07_23 = 45130; // spreadsheet date serial

const AM_HEADER = ['Item ID', 'Signer', 'Sport', 'Team', 'Item Type', 'Item Model', 'Item Detail', 'Autograph Inscription',
  'Date Obtained', 'How Obtained', 'Gifted By', 'Obtained At', 'Autograph Authenticator', 'Autograph Cert Number',
  'Signed Item Price (USD)', 'Instagram Post', 'Notes'];

const GU_HEADER = ['Item ID', 'Item Type', 'Item Detail', 'Usage', 'Sport', 'Team', 'Player', 'Game Date', 'Season', 'Away Team', 'Home Team', 'Score', 'Result', 'Stadium', 'Attended',
  'At Bat', 'Pitching', 'Play', 'Authenticator', 'Cert Number', 'Photo Matched', 'Signed', 'Date Obtained', 'Obtained At', 'Price (USD)', 'Notes'];

const TEAMS_HEADER = ['Team', 'League', 'Stadium', 'Former Names', 'Color'];

function defaultTabs() {
  return {
    'Autographed Memorabilia': [AM_HEADER,
      ['AM-0001', 'Sam Rivers', 'Football', 'Bay City Breakers', 'Helmet', 'Speed', 'Black', '', SERIAL_2023_07_23, 'In Person', '', 'Team Store'],
      ['AM-0002', 'Al Stone', 'Baseball', 'Harbor City Herons', 'Batting Helmet', '', '', '', SERIAL_2023_07_23, 'In Person', '', 'Show', '', '', 59.5],
      ['AM-0002', 'Ben Cole', 'Baseball', 'Harbor City Herons', 'Batting Helmet', '', '', 'HOF 96', '07/01/2024', 'TTM', ' ', '', 'JSA', 12345],
      ['', 'row without an ID is skipped']],
    // AM-0002 is a team issued helmet: its usage and certificate are in Game Used.
    'Game Used Memorabilia': [GU_HEADER, ['GU-0001', 'Batting Helmet', '', 'Team Issued', 'Baseball', 'Harbor City Herons', '', '', '', '', '', '', '', '', '',
      '', '', '', 'MLB', 'JD1', '', 'AM-0002']],
    'Teams': [TEAMS_HEADER,
      ['Harbor City Herons', 'MLB', 'Seaside Stadium', '', '#E2560B'],
      ['Bay City Breakers', 'NFL', 'Bayfront Stadium', '', '#2E1F8A']]
  };
}

// Fake Google services. folders: folderId -> [file names]; created files are recorded.
function load(tabs, folders) {
  const created = [];
  const cache = {};
  const files = {};
  let n = 0;
  function makeFile(name, folderId, bytes) {
    const id = 'file' + (++n);
    const trashed = name.charAt(0) === '~'; // "~AM-0001.jpg": a file in the trash
    name = name.replace(/^~/, '');
    const f = {
      isTrashed: function () { return trashed; },
      getId: function () { return id; }, getName: function () { return name; },
      getMimeType: function () { return /\.(jpe?g|png)$/i.test(name) ? 'image/jpeg' : /\.mp4$/i.test(name) ? 'video/mp4' : 'text/plain'; },
      getSize: function () { return content().length; },
      getLastUpdated: function () { return new Date(f.updated || 0); }, // a test can set f.updated: the file was replaced
      getParents: function () { let done = false; return { hasNext: function () { return !done; }, next: function () { done = true; return { getId: function () { return folderId; } }; } }; },
      getBlob: function () { return blob(bytes || [0xFF, 0xD8, 0xFF], 'image/jpeg'); },
      getThumbnail: function () { return ctx.noThumb ? null : blob([0xFF, 0xD8, 0xFE], 'image/jpeg'); }
    };
    // A video's bytes: 0, 1, 2... (10 of them), so the pieces can be checked.
    function content() { return bytes || (/\.mp4$/i.test(name) ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0xFF, 0xD8, 0xFF]); }
    f.content = content;
    files[id] = f;
    return f;
  }
  function blob(bytes, type) { return { getBytes: function () { return bytes; }, getContentType: function () { return type; } }; }
  const byFolder = {};
  Object.keys(folders || {}).forEach(function (fid) { byFolder[fid] = folders[fid].map(function (name) { return makeFile(name, fid); }); });
  const iterate = function (arr) { let i = 0; return { hasNext: function () { return i < arr.length; }, next: function () { return arr[i++]; } }; };
  const ctx = {
    Sheets: { Spreadsheets: {
      Values: { get: function (id, range) {
        const name = range.slice(1, -1).replace(/''/g, "'");
        if (!(name in tabs)) throw new Error('Unable to parse range: ' + range);
        return { values: JSON.parse(JSON.stringify(tabs[name])) };
      } },
      get: function () { return { sheets: Object.keys(tabs).map(function (t, i) { return { properties: { title: t, sheetId: 100 + i } }; }) }; }
    } },
    DriveApp: {
      getFolderById: function (fid) {
        return {
          getFiles: function () { return iterate(byFolder[fid] || []); },
          createFile: function (b) { const f = makeFile(b.name, fid, b.bytes); (byFolder[fid] = byFolder[fid] || []).push(f); created.push({ folder: fid, name: b.name, size: b.bytes.length }); return f; }
        };
      },
      getFileById: function (id) { if (!files[id]) throw new Error('No file ' + id); return files[id]; }
    },
    CacheService: { getScriptCache: function () {
      return {
        get: function (k) { return k in cache ? cache[k] : null; },
        put: function (k, v) { cache[k] = String(v); },
        getAll: function (keys) { const o = {}; keys.forEach(function (k) { if (k in cache) o[k] = cache[k]; }); return o; },
        putAll: function (o) { Object.keys(o).forEach(function (k) { cache[k] = String(o[k]); }); },
        removeAll: function (keys) { keys.forEach(function (k) { delete cache[k]; }); }
      };
    } },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
    fetches: 0,
    rangeCode: 206, // what Drive answers to a byte range (200 = it sent the whole file)
    UrlFetchApp: { fetch: function (url, opts) {
      ctx.fetches++;
      const m = String(url).match(/\/drive\/v3\/files\/([^?]+)\?alt=media$/);
      if (m) {
        const all = files[decodeURIComponent(m[1])].content();
        const r = opts.headers.Range.match(/^bytes=(\d+)-(\d+)$/);
        const body = ctx.rangeCode === 206 ? all.slice(+r[1], +r[2] + 1) : all;
        return { getResponseCode: function () { return ctx.rangeCode; }, getContent: function () { return body; } };
      }
      if (ctx.thumbFail) return { getResponseCode: function () { return 404; }, getHeaders: function () { return {}; } };
      return { getResponseCode: function () { return 200; }, getHeaders: function () { return { 'Content-Type': 'image/jpeg' }; }, getBlob: function () { return blob([0xFF, 0xD8, 0xFF, 1], 'image/jpeg'); } };
    } },
    ScriptApp: { getOAuthToken: function () { return 'token'; } },
    Utilities: {
      formatDate: function (d) { return d.toISOString().slice(0, 10); },
      getUuid: function () { return 'uuid' + (++n); },
      base64Encode: function (bytes) { return Buffer.from(bytes).toString('base64'); },
      base64Decode: function (s) { return Array.from(Buffer.from(s, 'base64')); },
      newBlob: function (bytes, type, name) { return { bytes: bytes, type: type, name: name }; }
    },
    HtmlService: {}
  };
  vm.createContext(ctx);
  vm.runInContext(CODE + '\n;this.__api = { CONFIG, getCollection, getTeams, getGameUsed, getPhoto, getLogos, getVideoChunk, beginPhoto, putPhotoChunk, finishPhoto, columnHas_ };', ctx);
  let fileReads = 0;
  const getFileById = ctx.DriveApp.getFileById;
  ctx.DriveApp.getFileById = function (id) { fileReads++; return getFileById(id); };
  return Object.assign(ctx.__api, { ctx: ctx, created: created, files: files, fetches: function () { return ctx.fetches; }, fileReads: function () { return fileReads; } });
}


/* Equal as the page and the server see it (through JSON), with a readable diff when not. */
function norm(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function eq(actual, expected, what) { assert.deepStrictEqual(norm(actual), norm(expected), what); }

module.exports = { load, defaultTabs, AM_HEADER, GU_HEADER, TEAMS_HEADER, SERIAL_2023_07_23, eq };
