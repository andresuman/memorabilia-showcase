'use strict';
const { test, open, eq } = require('./app');

test('home: one card per collection, with the right numbers', { tag: '@both' }, async function ({ page }) {
  await open(page);
  const text = await page.$$eval('.hub-card', function (c) { return c.map(function (x) { return x.textContent.replace(/\s+/g, ' ').trim(); }); });
  eq(text.length, 2);
  eq(await page.$$eval('#hub .hub-art', function (arts) {
    // Each icon's drawing ends the same distance from its card's right edge (cropped to what it draws).
    return unique(arts.map(function (a) {
      const svg = a.querySelector('svg'), box = svg.querySelector('path').getBoundingClientRect();
      return Math.round(a.getBoundingClientRect().right - box.right);
    })).length;
  }), 1, 'the big icons line up on the right');
  eq(/^5 ?items/.test(text[0]) && /7 signatures from 5 people/.test(text[0]), true, text[0]);
  eq(/^6 ?items/.test(text[1]) && /2 signed, 4 unsigned/.test(text[1]), true, text[1] + ' (Game Used second)');
});
