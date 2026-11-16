#!/usr/bin/env node
/* Builds the page as Apps Script serves it (each <?!= include('Name') ?> replaced by Name.html), plus the
   data and the mock server, so it opens in a browser without Google. The preview covers the two collections:
   Autographed Memorabilia and Game Used Memorabilia.
   Usage: node tests/build-preview.js                                  (test data -> tests/out/preview.html)
          node tests/build-preview.js --data demo-data.js --out docs/demo.html   (demo data -> docs/demo.html) */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

/* The real sample photos, logos and videos (tests/sample-assets.json), inlined as base64 so the page the
   preview builds shows them without talking to Drive: photos and logos as data URIs (the page puts them
   straight in an <img>), videos as raw base64 (the mock serves them piece by piece, the way the server
   does). A photo is keyed by its item ID (AM-0001, GU-0003), a video by its hologram (AB123456), a logo by
   its team name. The assets live as text (base64) because the push tool only takes text files; the usable
   files are the ones in the Drive sample folders (see SETUP.md). If the file is missing the page just has
   no samples. */
function sampleAssets() {
  const file = path.join(__dirname, 'sample-assets.json');
  let assets = { photos: {}, videos: {}, logos: {} };
  if (fs.existsSync(file)) assets = JSON.parse(fs.readFileSync(file, 'utf8'));
  return '<script>\nwindow.__samplePhotos = ' + JSON.stringify(assets.photos || {}) +
    ';\nwindow.__sampleVideos = ' + JSON.stringify(assets.videos || {}) +
    ';\nwindow.__sampleLogos = ' + JSON.stringify(assets.logos || {}) + ';\n</script>\n';
}

function build(opts) {
  opts = opts || {};
  const dataFile = opts.data || 'fixtures.js';
  const outFile = opts.out ? path.join(root, opts.out) : path.join(__dirname, 'out', 'preview.html');
  const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
  let page = index.replace(/<\?!= include\('([A-Za-z]+)'\) \?>/g, function (_, name) {
    return fs.readFileSync(path.join(root, name + '.html'), 'utf8');
  });
  if (/<\?/.test(page)) throw new Error('Index.html has a template tag the preview does not understand.');
  // The data and the mock go in before the app's first script.
  const first = page.indexOf('<script>');
  if (first === -1) throw new Error('No <script> found in the page.');
  const inject = [dataFile, 'mock-gas.js'].map(function (f) {
    return '<script>\n' + fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n</script>\n';
  }).join('');
  page = page.slice(0, first) + inject + sampleAssets() + page.slice(first);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, page);
  return outFile;
}

if (require.main === module) {
  const args = process.argv.slice(2), opts = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--data') opts.data = args[i + 1];
    if (args[i] === '--out') opts.out = args[i + 1];
  }
  console.log('Built: ' + build(opts));
}
module.exports = build;
