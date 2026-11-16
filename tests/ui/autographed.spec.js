'use strict';
const { test, open, go, settle, eq } = require('./app');

test('autographed: grid, team logos, inscriptions, search ignoring accents', async function ({ page }) {
  await open(page, 'autographed');
  eq(await page.$$eval('#grid .card', function (c) { return c.length; }), 5);
  // The team is a logo on the photo (bottom left), not text in the description line.
  eq(await page.$$eval('#grid .card[data-id="AM-0001"] .crest .dot', function (x) { return x.map(function (e) { return e.dataset.team; }); }), ['Bay City Breakers']);
  eq(await page.$eval('#grid .card[data-id="AM-0001"] .what', function (e) { return /Breakers/.test(e.textContent); }), false);
  // Behind a logo every circle is white (crest, chip, panel tag); the team color is only behind a sport icon.
  eq(await page.evaluate(function () {
    return ['#grid .crest .dot', '#teams .team-chip:not(.all) .dot'].map(function (sel) {
      const d = document.querySelector(sel); return [!!d.querySelector('img'), getComputedStyle(d).backgroundColor];
    });
  }), [[true, 'rgb(255, 255, 255)'], [true, 'rgb(255, 255, 255)']], 'white circle behind a logo');
  // An inscription: quotes icon (not the pen), the words, one line on the card.
  const ins = await page.$$eval('#grid .card .ins', function (x) { return x.map(function (e) { return [!!e.querySelector('svg'), e.querySelector('.t').textContent, getComputedStyle(e.querySelector('.t')).whiteSpace]; }); });
  eq(ins.length > 0 && ins.every(function (i) { return i[0] && i[1] && i[2] === 'nowrap'; }), true, JSON.stringify(ins));
  await page.fill('#q', 'STÔNE'); await settle(page);
  eq(await page.$$eval('#grid .card', function (c) { return c.map(function (x) { return x.dataset.id; }).sort(); }), ['AM-0002', 'AM-0004']);
});

test('filters behave the same everywhere: pressing a chip again turns it off; "Clear filters" and the empty list', async function ({ page }) {
  await open(page, 'autographed');
  const team = await page.$eval('#teams .team-chip:not(.all)', function (e) { return e.dataset.team; });
  const pressed = function (sel) { return page.$eval(sel + ' [aria-pressed="true"]', function (e) { return e.textContent.replace(/\s*\d+$/, ''); }); };
  await page.click('#teams .team-chip[data-team="' + team + '"]'); await settle(page);
  eq(await page.$eval('#clear', function (e) { return !e.hidden && e.textContent; }), 'Clear filters');
  await page.click('#teams .team-chip[data-team="' + team + '"]'); await settle(page);
  eq(await pressed('#teams'), 'All teams', 'pressed again: back to All teams');
  eq(await page.$eval('#clear', function (e) { return e.hidden; }), true);
  // The Filters drawer belongs to Autographed Memorabilia: changing screens closes it.
  await page.evaluate(function () { sheets[0].open(true); }); await settle(page);
  await go(page, 'game-used');
  eq(await page.$eval('#more', function (e) { return e.classList.contains('open'); }), false, 'drawer closed');
  for (const v of [['autographed', '#q', '#clear', 'am']]) {
    await go(page, v[0]);
    await page.fill(v[1], 'zzzz'); await settle(page);
    eq(await page.$eval('#view-' + v[3] + ' .empty', function (e) { return e.querySelector('h2').textContent + ' / ' + e.querySelector('button').textContent; }),
      'Nothing matches yet / Clear filters', v[0] + ': same empty list');
    eq(await page.$eval(v[2], function (e) { return e.textContent; }), 'Clear filters');
    await page.click('#view-' + v[3] + ' .empty button'); await settle(page);
    eq(await page.$eval(v[1], function (e) { return e.value; }), '', v[0] + ': the button clears the search');
  }
});

test('autographed: sort and the Filters sheet (phone) or panel (computer), with its count and Reset', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'autographed');
  const phone = info.project.name === 'phone';
  const ids = function () { return page.$$eval('#grid .card', function (c) { return c.map(function (x) { return x.dataset.id; }); }); };
  const newest = ['AM-0005', 'AM-0002', 'AM-0003', 'AM-0004', 'AM-0001'];
  eq(await ids(), newest, 'newest first: by the latest signature (AM-0002 was last signed in 2025)');
  await page.click('#filters-btn'); await settle(page);
  eq(await page.$eval('#more', function (m) { return m.classList.contains('open'); }), true, 'it opens from its button');
  if (!phone) {
    eq(await page.evaluate(function () {
      const m = document.querySelector('#more'), b = document.querySelector('#filters-btn');
      return [m.parentNode.classList.contains('bar1'), Math.abs(m.getBoundingClientRect().left - b.getBoundingClientRect().left) < 2, document.querySelector('#more-scrim').hidden];
    }), [true, true, true], 'a panel under the button, the page not dimmed');
  }
  await page.selectOption('#sort', 'old'); await settle(page);
  eq(await ids(), ['AM-0001', 'AM-0002', 'AM-0004', 'AM-0003', 'AM-0005'], 'oldest first: by the first signature (AM-0002 was first signed in 2023)');
  await page.click('#f-cert'); await settle(page);
  eq(await page.$eval('#filters-n', function (n) { return [n.hidden, n.textContent]; }), [false, '1'], 'one filter on');
  eq(await page.$eval('#count', function (c) { return [c.getAttribute('aria-live'), /Showing/.test(c.textContent)]; }), ['polite', true], 'the count is announced, not the whole grid');
  if (phone) {
    await page.click('#more-reset'); await settle(page);
    await page.click('#more-done'); await settle(page);
    eq(await page.$eval('#more', function (m) { return m.classList.contains('open'); }), false, 'Done closes it');
  } else {
    await page.click('#f-cert'); await page.selectOption('#sort', 'new'); await settle(page);
    await page.mouse.click(5, 500); await settle(page);
    eq(await page.$eval('#more', function (m) { return m.classList.contains('open'); }), false, 'a click outside closes it');
    await page.click('#filters-btn'); await settle(page);
    await page.keyboard.press('Escape'); await settle(page);
    eq(await page.$eval('#more', function (m) { return m.classList.contains('open'); }), false, 'Esc closes it');
  }
  eq([await ids(), await page.$eval('#filters-n', function (n) { return n.hidden; })], [newest, true], 'back to newest, no filter');
});

test('item panel: the signatures lead; the item in a line, tag and seal; "Also in" then "More from"', { tag: '@both' }, async function ({ page }) {
  await open(page, 'AM-0001');
  const h3 = await page.$$eval('#sheet h3', function (x) { return x.map(function (e) { return e.textContent; }); });
  eq(h3, ['Signed by', 'More from Sam Rivers'], 'the signatures lead, then the other items the signer signed');
  // Every section label keeps its room above, whatever comes before it: "More from" right after "Signed by"
  // is the first link section below the item's own content, so it gets the extra room (40px, not 30px).
  eq(await page.$$eval('#sheet h3', function (x) { return x.slice(1).map(function (e) { return Math.round(e.getBoundingClientRect().top - (e.previousElementSibling || e.parentNode.previousElementSibling).getBoundingClientRect().bottom); }); }), [40], 'room above each section');
  const head = function () { return page.evaluate(function () {
    return [document.querySelector('#sheet .team-tags').textContent].concat(Array.from(document.querySelectorAll('#sheet .line-fact')).map(function (e) { return e.textContent; }));
  }); };
  eq(await page.$eval('#q', function (e) { return e.placeholder; }), 'Search autographs');
  eq(await page.$$eval('#sheet .mh-signed [data-go]', function (x) { return x.map(function (e) { return e.dataset.go; }); }), ['AM-0003']);
  eq(await page.$eval('#sheet .id', function (e) { return e.textContent; }), 'AM-0001 · 2023 · Black', 'the detail in the line above the name');
  await go(page, 'AM-0002');
  eq(await page.$eval('#sheet h3', function (e) { return e.textContent; }), 'Signed by 3 people');
  eq(await head(), ['Harbor City HeronsTeam Issued', 'Item authenticated by MLB · JD000001'], 'usage as a tag next to the team, the certificate as a seal line');
  eq(await page.$eval('#sheet .id', function (e) { return e.textContent; }), 'AM-0002 · 2023–2025', 'years of the first and last signature');
  eq(await page.$eval('#grid .card[data-id="AM-0002"] .id', function (e) { return e.textContent; }), 'AM-0002 · 2023–2025', 'same on the card');
  // Signature rows: certificate first; a purchase's price after its place, a gift's value on its own line.
  const rows = function () { return page.$$eval('#sheet .sig .row', function (x) { return x.map(function (e) { return e.textContent; }); }); };
  await go(page, 'AM-0004');
  eq(await rows(), ['Certified by JSA AA00001', 'Obtained at eBay for $38.75', 'View on Instagram']);
  eq(await page.$$eval('#sheet .sig .icon-fact svg', function (x) { return x.length; }), 2, 'certificate and place with icons, no words');
  await go(page, 'AM-0005');
  eq(await rows(), ['Gift from A Friend'], 'a gift\'s value stays in the spreadsheet');
  eq(await page.$$eval('#sheet .sig .icon-fact svg', function (x) { return x.length; }), 1, 'gift with an icon');
  // Weight: the item is the title; who signed leads the signatures; the section labels stay small and gray.
  eq(await page.evaluate(function () {
    const px = function (sel) { return parseFloat(getComputedStyle(document.querySelector(sel)).fontSize); };
    return [px('#d-title') > px('#sheet .sig .name'), px('#sheet .sig .name') > px('#sheet .info h3'),
      getComputedStyle(document.querySelector('#sheet .info h3')).color === getComputedStyle(document.querySelector('#sheet .sig .when')).color];
  }), [true, true, true], 'title > signer name > section label (gray)');
  await go(page, 'AM-0004');
  eq(await page.$eval('#sheet .note a', function (e) { return [e.textContent, e.target, e.getAttribute('href'), !!e.querySelector('svg')]; }), ['Instagram', '_blank', 'https://www.instagram.com/p/example', true]);
  eq(await page.$eval('#sheet .note', function (e) { return e.textContent; }), 'A second post, Instagram, shows the show.');
});

test('team colors come from the Teams tab (a former name takes its team\'s color); a team with no color is gray and a check', async function ({ page }) {
  await open(page, 'autographed');
  const dot = function () { return page.$eval('#teams .team-chip[data-team="Bay City Breakers"]', function (c) { return getComputedStyle(c).getPropertyValue('--c').trim(); }); };
  eq([await dot(), await page.evaluate(function () { return [teamInfo('Northgate Nomads').color, teamInfo('Nowhere FC').color]; })], ['#2E1F8A', ['#00385D', '#5B6472']]);
  await page.evaluate(function () {
    window.__patchData = function (n, d) {
      if (n === 'TEST_TEAMS') { d.teams.forEach(function (t) { if (t.team === 'Bay City Breakers') t.color = '#123456'; }); d.checks.noColor = ['Nowhere FC']; d.checks.noLogo = ['Nowhere FC']; }
      return d;
    };
    reloadAll();
  });
  await page.waitForFunction(function () { return teamInfo('Bay City Breakers').color === '#123456'; });
  await settle(page);
  eq([await dot(), await page.$eval('#am-checks', function (b) { return !b.hidden && /1 team with no color/.test(b.textContent) && /Nowhere FC/.test(b.textContent) && /Add <Team>\.png to Team Logos/.test(b.textContent); })],
    ['#123456', true], 'a new color draws the screens again; the check is in the collection menu, its text shown as written (<Team> is not taken for a tag)');
});

test('an item whose ID is not like AM-0000 still opens from its card', async function ({ page }) {
  await open(page, 'autographed');
  await page.evaluate(function () { amItem('AM-0005').id = 'AM-15'; render(true); });
  await page.evaluate(function () { document.querySelector('.card[data-id="AM-15"]').click(); }); await settle(page);
  eq(await page.evaluate(function () { return [state.screen, $('#scrim').classList.contains('open'), $('#sheet .id').textContent.split(' · ')[0]]; }), ['am', true, 'AM-15']);
  await page.keyboard.press('Escape'); await settle(page);
  eq(await page.evaluate(function () { return [state.screen, state.currentId]; }), ['am', null], 'and closes back to the list');
});

test('a signature with no date: last in the names, no loose separator on the link cards', async function ({ page }) {
  await open(page);
  await page.evaluate(function () { amItem('AM-0002').signatures[1].date = ''; amItem('AM-0001').signatures[0].date = ''; });
  const row = function () { return page.$$eval('#sheet .mh-signed li:first-child b, #sheet .mh-signed li:first-child small', function (x) { return x.map(function (e) { return e.textContent; }); }); };
  await go(page, 'game-used/GU-0004');
  eq(await row(), ['Al Stone, Cal Dunn and Ben Cole', 'AM-0002 · Aug 21, 2023'], 'the first dated signature leads; the one with no date goes last');
  await go(page, 'AM-0003');
  eq(await row(), ['Speed Helmet', 'Black · AM-0001'], 'no date at all: just the detail and the ID');
  eq((await page.$$eval('#sheet .mh-signed small', function (x) { return x.map(function (e) { return e.textContent; }); })).filter(function (t) { return / · $/.test(t); }), [], 'More from: no line ends in a separator');
});
