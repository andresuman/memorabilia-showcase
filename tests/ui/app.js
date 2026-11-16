/* What every page test uses: a fresh page per test (on the phone or the computer screen, see playwright.config.js)
   with the preview (tests/out/preview.html: the app, the test data and the mock server), and helpers.

   No fixed waits: settle(page) waits until the page is quiet (no short timer pending, no animation running, no
   browser database write open), which is when a person would look. see() asks again until the answer is right,
   for what settles in its own time (a photo decoding). A JavaScript error fails the test it happened in. */
'use strict';
const path = require('path');
const base = require('playwright/test');

const URL = 'file://' + path.join(__dirname, '..', 'out', 'preview.html');

// Runs in the page before the app: counts what is still going on.
function tracker() {
  const timers = new Set();
  const st = window.setTimeout, ct = window.clearTimeout;
  window.setTimeout = function (fn, ms) {
    const args = Array.prototype.slice.call(arguments, 2);
    const id = st.call(window, function () { timers.delete(id); if (typeof fn === 'function') fn.apply(window, args); }, ms);
    if (!(ms >= 1000)) timers.add(id); // a toast staying up for seconds is not work in progress
    return id;
  };
  window.clearTimeout = function (id) { timers.delete(id); return ct.call(window, id); };
  let open = 0;
  const tx = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function () {
    const t = tx.apply(this, arguments);
    open++;
    const done = function () { open--; };
    t.addEventListener('complete', done); t.addEventListener('error', done); t.addEventListener('abort', done);
    return t;
  };
  window.__busy = function () {
    const moving = document.getAnimations().filter(function (a) {
      return a.playState === 'running' && a.effect && a.effect.getTiming().iterations !== Infinity; // a spinner never ends
    }).length;
    return { timers: timers.size, animations: moving, writes: open };
  };
}

const test = base.test.extend({
  page: async function ({ page }, use) {
    const errors = [];
    page.on('pageerror', function (e) { errors.push(e.message); });
    page.on('console', function (m) { if (m.type() === 'error' && !/fonts\.g/.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(tracker);
    await use(page);
    base.expect(errors, 'no JavaScript errors on the page').toEqual([]);
  }
});
const expect = base.expect;

/** Until the page is quiet for two frames in a row. */
async function settle(page) {
  await page.evaluate(function () {
    return new Promise(function (done, fail) {
      const until = Date.now() + 10000;
      let quiet = 0;
      (function tick() {
        const b = window.__busy();
        quiet = b.timers || b.animations || b.writes ? 0 : quiet + 1;
        if (quiet >= 2) return done();
        if (Date.now() > until) return fail(new Error('the page is still busy after 10 s: ' + JSON.stringify(b)));
        requestAnimationFrame(tick);
      })();
    });
  });
}

/** Opens the app (at a screen, optionally), once the spreadsheet answers are in. */
async function open(page, hash) {
  await page.goto(URL + (hash ? '#' + hash : ''));
  await page.waitForFunction(function () { return state.items.length && state.gu; });
  await settle(page);
}
async function reopen(page) {
  await page.reload();
  await page.waitForFunction(function () { return state.items.length && state.gu; });
  await settle(page);
}
async function go(page, h) { await page.evaluate(function (x) { location.hash = x; }, h); await settle(page); }
function hash(page) { return page.evaluate(function () { return decodeURIComponent(location.hash); }); }

/** Fingers on the screen: [{x,y}] per step; the last step lifts them. */
async function touch(page, points) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points[0] });
  for (let i = 1; i < points.length; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points[i] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page);
}
function steps(from, to, n) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(from.map(function (p, k) { return { x: p.x + (to[k].x - p.x) * i / n, y: p.y + (to[k].y - p.y) * i / n }; }));
  return out;
}

/** Equal as the page sees it (through JSON). */
function norm(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function eq(actual, expected, what) { expect(norm(actual), what).toEqual(norm(expected)); }
/** Asks fn again until its answer equals expected (5 s at most). */
async function see(fn, expected, what) { await expect.poll(async function () { return norm(await fn()); }, { message: what }).toEqual(norm(expected)); }

/** A JPEG made in the page, as a file for the photo picker. */
async function jpeg(page, name, w, h) {
  const b64 = await page.evaluate(function (s) {
    const c = document.createElement('canvas'); c.width = s[0]; c.height = s[1];
    const x = c.getContext('2d'); x.fillStyle = '#2E1F8A'; x.fillRect(0, 0, s[0], s[1]); x.fillStyle = '#E2560B'; x.fillRect(s[0] / 4, s[1] / 4, s[0] / 2, s[0] / 2);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }, [w || 300, h || 200]);
  return { name: name, mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') };
}

module.exports = { test, expect, URL, open, reopen, go, hash, settle, touch, steps, eq, see, jpeg };
