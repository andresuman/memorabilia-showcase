'use strict';
const { test, open, go, settle, eq } = require('./app');

// One collection only: the other collection's tab is missing, so the server reports it as missing
// instead of throwing. Home shows only the collection that is set up, and the missing one's screen
// says it is not set up yet, with a way to try again.
async function patchMissing(page, name, tab) {
  await page.evaluate(function (a) {
    window.__patchData = function (dataName, d) {
      if (dataName === a.name) return { items: [], missing: a.tab, checks: {}, links: {} };
      return d;
    };
    reloadAll();
  }, { name: name, tab: tab });
  await settle(page);
}

test('one collection only: no Game Used tab — home shows one card, the screen says it is not set up', async function ({ page }) {
  await open(page);
  await patchMissing(page, 'TEST_GU', 'Game Used Memorabilia');
  eq(await page.$$eval('#hub .hub-card', function (c) { return c.length; }), 1);
  eq(await page.$eval('#hub .hub-card h2', function (e) { return e.textContent; }), 'Autographed Memorabilia');
  await go(page, 'game-used');
  eq(await page.$eval('#gu-grid .empty', function (e) { return e.querySelector('h2').textContent + ' / ' + e.querySelector('button').textContent; }),
    'No Game Used Memorabilia yet / Try again');
});

test('one collection only: no Autographed Memorabilia tab — home shows one card, the screen says it is not set up', async function ({ page }) {
  await open(page);
  await patchMissing(page, 'TEST_COLLECTION', 'Autographed Memorabilia');
  eq(await page.$$eval('#hub .hub-card', function (c) { return c.length; }), 1);
  eq(await page.$eval('#hub .hub-card h2', function (e) { return e.textContent; }), 'Game Used Memorabilia');
  await go(page, 'autographed');
  eq(await page.$eval('#grid .empty', function (e) { return e.querySelector('h2').textContent + ' / ' + e.querySelector('button').textContent; }),
    'No Autographed Memorabilia yet / Try again');
});

test('one collection only: neither tab — home says no collections are set up', async function ({ page }) {
  await open(page);
  await page.evaluate(function () {
    window.__patchData = function (name, d) {
      if (name === 'TEST_COLLECTION') return { items: [], missing: 'Autographed Memorabilia', checks: {}, links: {} };
      if (name === 'TEST_GU') return { items: [], missing: 'Game Used Memorabilia', checks: {}, links: {} };
      return d;
    };
    reloadAll();
  });
  await settle(page);
  eq(await page.$$eval('#hub .hub-card', function (c) { return c.length; }), 0);
  eq(await page.$eval('#hub .empty h2', function (e) { return e.textContent; }), 'No collections set up yet');
});
