/* Screenshots of every screen, to look at (tests/out/shots): npm run shots. They check nothing, so the tests skip them. */
'use strict';
const path = require('path');
const { test, open, go, settle } = require('./app');

const SCREENS = [['home', ''], ['autographed', 'autographed'], ['item', 'AM-0004'], ['game-used', 'game-used'], ['game-used-item', 'game-used/GU-0001']];

test('screenshots of every screen', { tag: '@both' }, async function ({ page }, info) {
  test.skip(!process.env.SHOTS, 'only with npm run shots');
  const dir = path.join(__dirname, '..', 'out', 'shots');
  await open(page);
  for (const [name, h] of SCREENS) {
    await go(page, h);
    await page.screenshot({ path: path.join(dir, info.project.name + '-' + name + '.png') });
  }
  await go(page, 'AM-0004');
  await page.click('#d-stage .media.on-video');
  await page.waitForFunction(function () { return /^blob:/.test(document.querySelector('#video video').getAttribute('src') || ''); }); await settle(page);
  await page.screenshot({ path: path.join(dir, info.project.name + '-video.png') });
});
