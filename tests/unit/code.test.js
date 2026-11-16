/* Checks on the code that neither a browser nor the tests that run it would report, and on the rules of the
   project that must never slip. Usage: node --test tests/unit/*.test.js   (needs nothing installed) */
'use strict';
const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = function (f) { return fs.readFileSync(path.join(root, f), 'utf8'); };
const files = fs.readdirSync(root).filter(function (f) { return /^Js\w+\.html$/.test(f); }).sort();
const index = read('Index.html');
const gs = read('Code.gs');

// Top level of each script = two spaces of indentation inside <script>.
const seen = {}, twice = [];
files.forEach(function (f) {
  read(f).split('\n').forEach(function (line, i) {
    const m = line.match(/^  (?:function|const|let|var|class) ([A-Za-z_$][\w$]*)/);
    if (!m) return;
    const where = f + ':' + (i + 1);
    if (seen[m[1]]) twice.push('"' + m[1] + '": ' + seen[m[1]] + ' and ' + where); else seen[m[1]] = where;
  });
});
const pageSrc = files.map(read).join('\n') + index;
const uses = function (src, n) { return (src.match(new RegExp('(^|[^\\w$.])' + n.replace(/\$/g, '\\$') + '(?![\\w$])', 'gm')) || []).length; };

test('page: no top-level name is defined twice (the scripts share one scope: the later one would silently win)', function () {
  assert.deepStrictEqual(twice, []);
});

test('page: no top-level name clashes with a browser global', function () {
  const globals = ['status', 'name', 'top', 'parent', 'self', 'length', 'origin', 'event', 'history', 'location', 'close', 'open', 'print', 'stop', 'find', 'focus', 'blur', 'scroll'];
  assert.deepStrictEqual(globals.filter(function (g) { return seen[g]; }).map(function (g) { return g + ' (' + seen[g] + ')'; }), []);
});

test('page: every script is included in Index.html, as one <script> block in strict mode', function () {
  const problems = [];
  files.forEach(function (f) {
    if (index.indexOf("include('" + f.replace('.html', '') + "')") === -1) problems.push(f + ' is not included');
    const src = read(f).trim();
    if (!/^<script>\s*'use strict';/.test(src) || !/<\/script>$/.test(src)) problems.push(f + ' is not one strict <script> block');
  });
  assert.deepStrictEqual(problems, []);
});

test('nothing left behind: every top-level name of the page is used, every Code.gs function is called', function () {
  const unused = Object.keys(seen).filter(function (n) { return uses(pageSrc, n) < 2; }).map(function (n) { return n + ' (' + seen[n] + ')'; });
  (gs.match(/^function (\w+)/gm) || []).map(function (l) { return l.slice(9); }).forEach(function (n) {
    if (n === 'doGet') return; // Apps Script calls it
    if (/_$/.test(n) ? uses(gs, n) < 2 : uses(pageSrc + gs, n) < 2) unused.push('Code.gs: ' + n);
  });
  assert.deepStrictEqual(unused, []);
});

test('least privilege: the app asks only for read-only Sheets, Drive and fetching URLs', function () {
  const manifest = JSON.parse(read('appsscript.json'));
  assert.deepStrictEqual(manifest.oauthScopes.slice().sort(), [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/spreadsheets.readonly'
  ]);
  assert.deepStrictEqual(manifest.webapp, { executeAs: 'USER_DEPLOYING', access: 'MYSELF' }, 'the web app runs as the deployer, for the deployer only');
});

test('least privilege: Code.gs reads the spreadsheet through the Sheets API only, never SpreadsheetApp (it needs write access)', function () {
  assert.strictEqual(/SpreadsheetApp/.test(gs.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), false);
});

test('the app only creates photo files: no Drive call in Code.gs changes, moves or deletes a file', function () {
  const code = gs.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  const calls = code.match(/\.(setTrashed|setName|setContent|setDescription|moveTo|addFile|removeFile|createFolder|setSharing|addEditor|addViewer|makeCopy)\(/g) || [];
  assert.deepStrictEqual(calls, []);
  const made = code.match(/\.createFile\([^;]*/g) || [];
  assert.ok(made.length > 0);
  made.forEach(function (c) { assert.match(c, /^\.createFile\(Utilities\.newBlob\(bytes, 'image\/jpeg', \w+ \+ '\.jpg'\)\)$/, 'a file Code.gs creates is a JPEG photo'); });
});

test('every reload button spins while the app checks the spreadsheet', function () {
  const css = read('Styles.html');
  const rule = (css.match(/^.*\.syncing #\w+-?reload svg.*$/m) || [''])[0];
  const buttons = (index.match(/id="([\w-]*reload)"/g) || []).map(function (m) { return m.slice(4, -1); });
  assert.ok(buttons.length > 1);
  assert.deepStrictEqual(buttons.filter(function (id) { return rule.indexOf('.syncing #' + id + ' svg') === -1; }), []);
});
