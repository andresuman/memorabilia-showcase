'use strict';
const { test, open, go, settle, eq } = require('./app');

test('things to check: a dot on the settings button and a list at the top of its menu, per collection', async function ({ page }) {
  await open(page, 'game-used');
  eq(await page.$$eval('.menu-btn.alert', function (b) { return b.length; }), 0, 'nothing to check, no dot');
  const shown = await page.evaluate(function () {
    state.checks.am = { orphans: ['AM-016.jpg'], copies: ['AM-0001 (1).jpg'], dupes: [['AM-0002.jpg', 'AM-0002.png']], badIds: ['AM-016 (row 45)'], videos: ['YP999999.mp4'] };
    state.checks.gu = { orphans: [], copies: [], dupes: [], badIds: [], videos: [], seasons: ['GU-0004 (row 6): 2012, game in 2023'], noSeason: ['GU-0001 (row 2)', 'GU-0002 (row 3)'], teams: ['GU-0004 (row 6): Harbor City Herons'],
      noGame: ['GU-0005 (row 7)'], usage: ['GU-0005 (row 7): "Game used", not "Game Used"'], signedTwice: ['AM-0002: GU-0004, GU-0007'] };
    findGu('GU-0004').type = 'Helmet'; findGu('GU-0002').price = 20;
    updateChecks();
    const read = function (sel) { const b = document.querySelector(sel); return b.hidden ? null : [b.querySelector('b').textContent].concat(Array.from(b.querySelectorAll('li > b')).map(function (x) { return x.textContent; })); };
    const out = [read('#am-checks'), read('#gu-checks'),
      Array.from(document.querySelectorAll('.menu-btn.alert')).map(function (b) { return b.id; })];
    out.push(Array.from(document.querySelectorAll('#gu-checks small')).map(function (x) { return x.textContent; }).slice(-2));
    state.checks = {}; findGu('GU-0004').type = 'Batting Helmet'; findGu('GU-0002').price = null; updateChecks();
    out.push(document.querySelectorAll('.menu-btn.alert').length);
    return out;
  });
  eq(shown, [
    ['5 things to check', '1 photo matches no item', '1 copy made by Drive', '1 name used twice', '1 Item ID not like AM-0000', '1 video matches no item'],
    ['9 things to check', '1 Season does not match its game', '2 games with no Season', '1 Team not in its game', '1 “I was there” with no game', '1 Usage written another way',
      '1 signed item in two rows', '1 Item Type differs from Autographed', '1 price in both tabs'],
    ['menu-btn', 'gu-menu-btn'],
    ['Use the same Item Type in both tabs: GU-0004 Helmet / AM-0002 Batting Helmet',
      'Keep one price: Game Used if bought unsigned, Autographed if signed: GU-0002 $20.00 / AM-0004 $38.75'],
    0
  ], 'and every dot cleared once fixed');
});

test('things to check: a Game Used tab that could not be read, in Autographed Memorabilia', async function ({ page }) {
  await open(page);
  await page.evaluate(function () { state.checks.am = { orphans: [], copies: [], dupes: [], badIds: [], guTab: ['Column "Usage" was not found in the Game Used Memorabilia tab.'] }; updateChecks(); });
  eq(await page.evaluate(function () { return [$('#am-checks li b').textContent, /Column "Usage"/.test($('#am-checks').textContent), $('#menu-btn').classList.contains('alert')]; }),
    ['1 Game Used tab could not be read', true, true]);
});

test('things to check: what is not an Item ID in a Signed column', async function ({ page }) {
  await open(page);
  await page.evaluate(function () { state.checks.gu = { orphans: [], copies: [], dupes: [], badSigned: ['GU-0002 (row 3): AM-03'] }; updateChecks(); });
  eq(await page.evaluate(function () { return [$('#gu-checks li b').textContent, /GU-0002 \(row 3\): AM-03/.test($('#gu-checks').textContent), $('#gu-menu-btn').classList.contains('alert')]; }),
    ['1 Signed entry to fix', true, true]);
});

test('settings menu: opens from the gear, links set, closes with Esc or a tap outside', { tag: '@both' }, async function ({ page }) {
  await open(page, 'autographed');
  await page.click('#menu-btn'); await settle(page);
  eq(await page.evaluate(function () { return [document.querySelector('#menu').classList.contains('open'), document.querySelector('#menu-btn').getAttribute('aria-expanded')]; }), [true, 'true']);
  eq(await page.$eval('#lnk-sheet', function (a) { return a.hasAttribute('aria-disabled'); }), true, 'no link from the test data: stays disabled');
  await page.keyboard.press('Escape'); await settle(page);
  eq(await page.$eval('#menu', function (m) { return m.classList.contains('open'); }), false, 'Esc');
  await page.click('#menu-btn'); await settle(page);
  await page.mouse.click(5, 600); await settle(page);
  eq(await page.$eval('#menu', function (m) { return m.classList.contains('open'); }), false, 'click outside');
  eq(await page.evaluate(function () {
    setMenuLinks([['sheet', '#lnk-sheet']], { sheet: 'https://example.com/sheet' });
    const a = document.querySelector('#lnk-sheet'); return [a.getAttribute('href'), a.hasAttribute('aria-disabled')];
  }), ['https://example.com/sheet', false], 'a link from the server');
});

test('keyboard: the focus stays on a chip or legend entry after it is pressed (the lists are drawn again)', { tag: '@desktop' }, async function ({ page }) {
  await open(page);
  const cases = [['game-used', '#gu-chips .team-chip:nth-child(2)'], ['game-used', '#gu-progress .seg'], ['autographed', '#teams .team-chip:nth-child(2)']];
  for (const c of cases) {
    await go(page, c[0]);
    await page.focus(c[1]);
    const was = await page.evaluate(function () { return document.activeElement.textContent; });
    await page.keyboard.press('Enter'); await settle(page);
    eq(await page.evaluate(function () { return [document.activeElement.textContent, document.activeElement.getAttribute('aria-pressed')]; }), [was, 'true'], c.join(' '));
    await page.keyboard.press('Enter'); await settle(page);
  }
});

test('keyboard: "/" goes to the search of the screen (not behind the photo framing); Tab stays inside an open panel', { tag: '@desktop' }, async function ({ page }) {
  await open(page);
  for (const [h, q] of [['autographed', 'q'], ['game-used', 'gu-q']]) {
    await go(page, h);
    await page.evaluate(function () { document.activeElement.blur(); });
    await page.keyboard.press('/');
    eq(await page.evaluate(function () { return document.activeElement.id; }), q, h);
  }
  // Not while a photo is being framed (it can be open with no panel, from a card's Add photo).
  await go(page, 'game-used');
  await page.evaluate(function () { cropEl().hidden = false; document.activeElement.blur(); });
  await page.keyboard.press('/');
  eq(await page.evaluate(function () { return document.activeElement.id; }), '', '"/" does nothing behind the photo framing');
  await page.evaluate(function () { cropEl().hidden = true; });
  await go(page, 'AM-0002');
  const inside = await page.evaluate(function () {
    const box = document.querySelector('#sheet');
    const all = Array.from(box.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')).filter(function (el) { return el.getClientRects().length && !el.closest('[hidden]'); });
    all[all.length - 1].focus();
    return all.length;
  });
  eq(inside > 3, true, 'the panel has controls');
  await page.keyboard.press('Tab');
  eq(await page.evaluate(function () { return document.querySelector('#sheet').contains(document.activeElement); }), true, 'Tab from the last control stays in the panel');
  await page.keyboard.press('Shift+Tab');
  eq(await page.evaluate(function () { return document.querySelector('#sheet').contains(document.activeElement); }), true, 'Shift+Tab too');
});
