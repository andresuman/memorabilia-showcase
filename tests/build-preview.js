#!/usr/bin/env node
/* Builds tests/out/preview.html: the page as Apps Script serves it (each <?!= include('Name') ?> replaced by
   Name.html), plus the test data and the mock server, so it opens in a browser without Google. The preview
   covers the two collections: Autographed Memorabilia and Game Used Memorabilia.
   Usage: node tests/build-preview.js   (then open tests/out/preview.html) */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
function build() {
  const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
  let page = index.replace(/<\?!= include\('([A-Za-z]+)'\) \?>/g, function (_, name) {
    return fs.readFileSync(path.join(root, name + '.html'), 'utf8');
  });
  if (/<\?/.test(page)) throw new Error('Index.html has a template tag the preview does not understand.');
  // The test data and the mock go in before the app's first script.
  const first = page.indexOf('<script>');
  if (first === -1) throw new Error('No <script> found in the page.');
  const inject = ['fixtures.js', 'mock-gas.js'].map(function (f) {
    return '<script>\n' + fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n</script>\n';
  }).join('');
  page = page.slice(0, first) + inject + page.slice(first);
  const out = path.join(__dirname, 'out');
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, 'preview.html');
  fs.writeFileSync(file, page);
  return file;
}

if (require.main === module) console.log('Preview: ' + build());
module.exports = build;
