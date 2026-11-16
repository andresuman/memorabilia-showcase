/* The page tests run on made-up data (tests/fixtures.js) instead of the server. This checks that the made-up
   data has the shape Code.gs really sends, so a field renamed or added on one side fails here instead of
   passing in both suites and breaking the app:
   - the fixtures use no field the server does not send;
   - every field the server sends on an item or team is in the fixtures (so the pages
     are tested with it), except "checks" and "links", which the fixtures may leave out;
   - a field has the same kind of value on both sides (text, number, list...); null is always allowed.
   Usage: node --test tests/unit/*.test.js */
'use strict';
const test = require('node:test');
const assert = require('assert');
const gas = require('./gas');
require('../fixtures');

function shape(v, out, p) {
  const t = v === null || v === undefined ? 'null' : Array.isArray(v) ? 'list' : typeof v === 'object' ? 'record' : typeof v;
  (out[p] = out[p] || new Set()).add(t);
  if (t === 'list') v.forEach(function (x) { shape(x, out, p + '[]'); });
  if (t === 'record') Object.keys(v).forEach(function (k) { shape(v[k], out, p + '.' + k); });
  return out;
}
function compare(name, server, fixture) {
  const s = shape(server, {}, name), f = shape(fixture, {}, name), problems = [];
  Object.keys(f).forEach(function (p) {
    if (!s[p]) { problems.push(p + ' is in the fixtures but the server never sends it'); return; }
    f[p].forEach(function (t) { if (t !== 'null' && !s[p].has(t)) problems.push(p + ' is ' + t + ' in the fixtures, ' + Array.from(s[p]).join(' or ') + ' from the server'); });
  });
  Object.keys(s).forEach(function (p) {
    if (!f[p] && !/\.(checks|links)(\.|$)/.test(p)) problems.push(p + ' comes from the server but the fixtures never have it');
  });
  assert.deepStrictEqual(problems, []);
}

// Tabs and folders that make the server send every field it can (photos, a video, an Instagram post...).
function rich() {
  const tabs = gas.defaultTabs();
  const gu = gas.GU_HEADER.concat(['Inning']);
  const row = ['GU-0001', 'Baseball', 'White', 'Game Used', 'Baseball', 'Harbor City Herons', 'Al Stone', gas.SERIAL_2023_07_23, 2023, 'Cedar Falls Falcons', 'Harbor City Herons', '4 - 1', 'W',
    'Seaside Stadium', 'Yes', 'A One', 'P Two', 'Ball', 'MLB', 'YP000001/ABC', 'Yes', 'AM-0002', gas.SERIAL_2023_07_23, 'Seaside Stadium', 12.5, 'Note.', 'Bottom of 1st'];
  tabs['Game Used Memorabilia'] = [gu, row];
  tabs['Teams'] = [['Team', 'League', 'Stadium', 'Former Names', 'Color'],
    ['Harbor City Herons', 'MLB', 'Seaside Stadium', '', '#E2560B'], ['Northgate Knights', 'MLB', 'Knight Field', 'Northgate Nomads', '#0E3386']];
  tabs['Autographed Memorabilia'][1] = tabs['Autographed Memorabilia'][1].concat(['', '', 20, 'https://www.instagram.com/p/BBB/', 'Note.']);
  const C = gas.load(gas.defaultTabs(), {}).CONFIG;
  const folders = { [C.PHOTOS_FOLDER_ID]: ['AM-0002.jpg'], [C.GU_FOLDER_ID]: ['GU-0001.jpg', 'YP000001.mp4'] };
  return gas.load(tabs, folders);
}

const api = rich();
test('Autographed Memorabilia: fixtures and server agree', function () { compare('collection', api.getCollection(), globalThis.TEST_COLLECTION); });
test('Game Used: fixtures and server agree', function () { compare('gu', api.getGameUsed(), globalThis.TEST_GU); });
test('Teams: fixtures and server agree', function () { compare('teams', api.getTeams(), globalThis.TEST_TEAMS); });
test('the mock server (tests/mock-gas.js) answers exactly the functions Code.gs offers the page', function () {
  const fs = require('fs'), path = require('path');
  const gs = fs.readFileSync(path.join(__dirname, '..', '..', 'Code.gs'), 'utf8');
  const mock = fs.readFileSync(path.join(__dirname, '..', 'mock-gas.js'), 'utf8');
  // The page can call any top-level function whose name does not end in _ (doGet and include are for Apps Script).
  const offered = (gs.match(/^function (\w+)\(/gm) || []).map(function (l) { return l.slice(9, -1); })
    .filter(function (n) { return !/_$/.test(n) && n !== 'doGet' && n !== 'include'; }).sort();
  const mocked = (mock.match(/^ {6}(\w+): function/gm) || []).map(function (m) { return m.trim().split(':')[0]; })
    .filter(function (n) { return !/^with/.test(n); }).sort();
  assert.deepStrictEqual(mocked, offered);
});
