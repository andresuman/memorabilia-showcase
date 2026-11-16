'use strict';
const { test, open, go, hash, settle, eq, jpeg } = require('./app');

const ids = function (page) { return page.$$eval('#gu-grid .card', function (c) { return c.map(function (x) { return x.dataset.gu; }); }); };
const n = function (page) { return page.$$eval('#gu-grid .card', function (c) { return c.length; }); };
const sel = function (page, id, v) { return page.$eval(id, function (e, v) { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, v); };

test('game used: order, chips, legend and the Filters sheet, which add up; Reset and Clear filters', async function ({ page }) {
  await open(page, 'game-used');
  eq(await ids(page), ['GU-0003', 'GU-0001', 'GU-0002', 'GU-0006', 'GU-0005', 'GU-0004'], 'by season, newest first; in a season, newest game first and an item with no game after its games; no season last');
  eq(await page.$eval('#gu-summary', function (e) { return e.textContent; }), '6 items from 4 games.');
  // Chips: the teams, with their logo slot and color, most items first (as in Autographed Memorabilia).
  eq(await page.$$eval('#gu-chips button', function (b) { return b.map(function (x) { return x.textContent; }); }), ['All teams', 'Harbor City Herons 4', 'Bay City Breakers 2']);
  eq(await page.$$eval('#gu-chips .team-chip:not(.all)', function (x) { return x.map(function (e) { return [e.style.getPropertyValue('--c'), !!e.querySelector('.dot[data-team]')].join(); }); }),
    ['#E2560B,true', '#2E1F8A,true'], 'on the color of their cards');
  eq(await page.$$eval('#gu-progress .seg', function (b) { return b.map(function (x) { return x.textContent; }); }), ['2signed', '4unsigned']);
  await page.click('#gu-progress [data-gu-signed="unsigned"]'); await settle(page);
  eq(await n(page), 4, 'the legend filters');
  // The Filters sheet: every list comes from the tab, and its filters add up with the chip and the legend.
  eq(await page.$$eval('#gu-more select', function (x) { return x.map(function (e) { return [].map.call(e.options, function (o) { return o.textContent; }).join('|'); }); }),
    ['All sports|Baseball|Football', 'All types|Baseball|Batting Helmet|Gloves|Pants', 'Any usage|Game Used|Team Issued', 'All seasons|2025|2023|2020', 'Any result|Win|Loss', 'Newest first|Oldest first']);
  await page.click('#gu-chips [data-gu-team="Harbor City Herons"]'); await settle(page);
  eq(await n(page), 2, 'team and legend together');
  await sel(page, '#gu-f-result', 'Win'); await settle(page);
  eq([await n(page), await page.$eval('#gu-filters-n', function (e) { return e.hidden ? '' : e.textContent; }), await page.$eval('#gu-count', function (e) { return e.textContent; })], [1, '1', 'Showing 1 of 6 items'], 'and the result');
  await sel(page, '#gu-f-result', 'Loss');
  await page.evaluate(function () { document.querySelector('#gu-f-attended').click(); }); await settle(page);
  eq([await n(page), await page.$eval('#gu-filters-n', function (e) { return e.textContent; }), await page.$eval('#gu-f-attended', function (e) { return e.getAttribute('aria-pressed'); })], [0, '2', 'true'], 'nothing matches all of them');
  // Reset clears the sheet only; the chip and the legend stay. Clear filters clears everything.
  await page.evaluate(function () { document.querySelector('#gu-more-reset').click(); }); await settle(page);
  eq([await n(page), await page.$eval('#gu-filters-n', function (e) { return e.hidden; }), await page.$eval('#gu-chips [aria-pressed="true"]', function (e) { return e.dataset.guTeam; })], [2, true, 'Harbor City Herons']);
  await page.click('#gu-clear'); await settle(page);
  eq([await n(page), await page.$eval('#gu-clear', function (e) { return e.hidden; })], [6, true]);
  await sel(page, '#gu-sort', 'old'); await settle(page);
  eq(await ids(page), ['GU-0005', 'GU-0006', 'GU-0002', 'GU-0001', 'GU-0003', 'GU-0004'], 'oldest first: an item with no game opens its season; no season still last');
  // On the phone, a bottom sheet: toggles on one line each, the proofs side by side, Tab kept inside.
  await page.click('#gu-filters-btn'); await settle(page);
  eq(await page.$eval('#gu-more', function (e) { return e.classList.contains('open') && e.parentNode === document.body; }), true, 'a bottom sheet on the phone');
  eq(await page.$$eval('#gu-more .toggle:not([hidden])', function (x) {
    return x.every(function (e) { const r = document.createRange(); r.selectNodeContents(e); return new Set([].map.call(r.getClientRects(), function (c) { return Math.round(c.top); })).size <= 2 && r.getBoundingClientRect().height < 26; });
  }), true, 'each Show only toggle on one line');
  eq(await page.evaluate(function () {
    const top = function (id) { return Math.round(document.querySelector(id).getBoundingClientRect().top); };
    return [top('#gu-f-video') === top('#gu-f-matched'), top('#gu-f-attended') > top('#gu-f-video')];
  }), [true, true], 'the proofs side by side (Video, Photo matched), I was there below');
  await page.focus('#gu-sort'); await page.keyboard.press('Tab');
  eq(await page.evaluate(function () { return document.querySelector('#gu-more').contains(document.activeElement); }), true, 'Tab stays in the Game Used sheet');
  await page.click('#gu-more-done'); await settle(page);
  eq(await page.$eval('#gu-more', function (e) { return e.classList.contains('open'); }), false);
});

test('game used: what each card says (who, the game, the date; ID, year and type above; the gold tag and its proofs)', { tag: '@both' }, async function ({ page }) {
  await open(page, 'game-used');
  const who = function (id) { return page.$eval('#gu-grid .card[data-gu="' + id + '"]', function (c) { return [c.querySelector('.who').textContent].concat([].map.call(c.querySelectorAll('.what .ln'), function (l) { return l.textContent; })); }); };
  eq(await who('GU-0002'), ['Al Stone', 'at Golden Bay Gulls', 'Jun 2, 2023'], 'a signed one: who signed it; under it the opponent, then the date');
  eq(await who('GU-0003'), ['Cole Barrett', 'vs Lake City Lumberjacks', 'Sep 14, 2025'], 'who used it');
  eq(await who('GU-0001'), ['vs Cedar Falls Falcons', 'Jun 15, 2025'], 'neither: the game, and only its date under it (the stadium is in the panel)');
  eq(await who('GU-0006'), ['Pants'], 'no game: what it is, and no line under it');
  eq(await page.$eval('#gu-grid .card[data-gu="GU-0002"] .what', function (w) { const l = w.querySelectorAll('.ln'); return l[1].getBoundingClientRect().top > l[0].getBoundingClientRect().top; }), true, 'the date on a line of its own');
  eq(await page.$eval('#gu-grid .card[data-gu="GU-0006"] .id', function (e) { return e.textContent; }), 'GU-0006 · 2023 · White', 'above: ID, the season as its year, the variant (the type is the name)');
  eq(await page.$eval('#gu-grid .card[data-gu="GU-0003"] .id', function (e) { return e.textContent; }), 'GU-0003 · 2025 · Gloves', 'one shape above every name: ID, year, type');
  eq(await page.$eval('#gu-grid .card[data-gu="GU-0001"] .id', function (e) { return e.textContent; }), 'GU-0001 · 2025 · Baseball', 'what it is, above the game');
  eq(await page.evaluate(function () {
    const g = findGu('GU-0003'); g.date = '2026-01-10'; renderGu(true); // a playoff game in January
    return document.querySelector('#gu-grid .card[data-gu="GU-0003"] .id').textContent;
  }), 'GU-0003 · 2025 · Gloves', 'the year is the Season (a January game belongs to the season before)');
  eq(await page.evaluate(function () {
    const g = findGu('GU-0001'); g.video = { ref: 'vid-x~0', size: 10, pieces: 1 }; g.photoMatched = true; renderGu(true);
    return document.querySelector('#gu-grid .card[data-gu="GU-0001"] .badge.gold').getAttribute('aria-label');
  }), 'Game Used, Video, Photo matched', 'both proofs: the video first, as in the Show only filters');
  eq(await page.$eval('#gu-grid .card[data-gu="GU-0004"] .badges', function (b) {
    const k = b.querySelectorAll('.badge');
    return [k[0].textContent, k[1].textContent, k[1].getAttribute('aria-label'), !!k[1].querySelector('svg'), k[0].offsetTop === k[1].offsetTop];
  }), ['Team Issued', '', 'Signed', true, true], 'usage in words, signed as the signature icon, on one line');
  eq(await page.$$eval('#gu-grid .snap[data-add]', function (b) { return b.map(function (x) { return x.dataset.add; }); }), ['GU-0001', 'GU-0002', 'GU-0006', 'GU-0005'], 'add photo on the ones with no photo (here or in Autographed)');
  eq(await page.evaluate(function () {
    const card = getComputedStyle(document.querySelector('#gu-grid .badge.gold')).backgroundColor;
    go('game-used/' + state.gu.find(function (x) { return x.usage === 'Game Used'; }).id);
    return card === getComputedStyle(document.querySelector('#sheet .use-tag.gold')).backgroundColor;
  }), true, 'the panel tag has the same gold as the badge on the card');
});

test('game used: the panel (scoreboard from his side, the moment, who used it, the proof, where it came from)', { tag: '@both' }, async function ({ page }) {
  await open(page, 'game-used/GU-0006');
  eq(await page.evaluate(function () { return [document.querySelector('#sheet .info .id').textContent, document.querySelector('#d-title').textContent, !!document.querySelector('#sheet .line-fact')]; }),
    ['GU-0006 · 2023 · White', 'Pants', false], 'the variant in the small line, the type as the title, the year said once');
  await go(page, 'game-used/GU-0001');
  eq(await page.$$eval('#sheet .sb-row', function (r) { return r.map(function (x) { return x.textContent + (x.classList.contains('won') ? ' (won)' : ''); }); }),
    ['Cedar Falls Falcons2', 'Harbor City Herons11 (won)']);
  eq(await page.$eval('#sheet .sb-head', function (e) { return [e.textContent, e.firstElementChild.classList.contains('result')]; }), ['Win', true], 'the result first, no "Final"');
  eq(await page.$eval('#sheet .moment', function (e) { return e.textContent; }), 'Bottom of 3rdAt BatLeo VancePitchingDario FontaineBall');
  eq(await page.evaluate(function () { return [document.querySelectorAll('#sheet .video-tile').length, document.querySelector('#d-stage .media').classList.contains('on-video')]; }), [0, true], 'the video alone: in the photo area, no thumbnails');
  await go(page, 'game-used/GU-0004');
  eq(await page.$$eval('#sheet .line-fact', function (x) { return x.map(function (e) { return e.textContent + (e.classList.contains('who') ? ' (larger)' : ''); }); }),
    ['Issued to Nate Coleman (larger)', 'Authenticated by MLB · JD000001'], 'who first (issued to, not used by), then the proof');
  eq(await page.$eval('#sheet .team-tags', function (e) { return e.textContent; }), 'Harbor City HeronsTeam Issued');
  eq(await page.$eval('#sheet h3', function (e) { return e.textContent; }), 'Also in Autographed Memorabilia', 'the signatures last, in the other collection');
  eq(await page.$eval('#sheet .mh-signed b', function (e) { return e.textContent; }), 'Al Stone, Ben Cole and Cal Dunn', 'up to three names');
  eq(await page.$eval('#sheet .bought', function (e) { return e.textContent; }), 'Obtained Aug 29, 2021Obtained at Seaside Stadium', 'obtained: some are gifts or caught (the bag shows; the word is for screen readers)');
  await go(page, 'game-used/GU-0003');
  eq(await page.$$eval('#sheet .line-fact', function (x) { return x.map(function (e) { return e.textContent; }); }),
    ['Used by Cole Barrett', 'Authenticated by Metabilia · AB000001', 'Photo matched'], 'who, then the certificate and the photo match');
  await go(page, 'game-used/GU-0002');
  await page.click('#sheet .mh-signed [data-go="AM-0004"]'); await settle(page);
  eq(await hash(page), '#AM-0004');
  eq(await page.$$eval('#sheet .mh-signed [data-go^="game-used/"]', function (x) { return x.map(function (e) { return e.dataset.go; }); }), ['game-used/GU-0002'], 'Also in Game Used, back to the ball');
});

test('game used: a photo added from the panel is saved under its Item ID; closing a panel goes back to its card', async function ({ page }) {
  await open(page, 'game-used/GU-0005');
  eq(await page.$$eval('#sheet .stage-add', function (b) { return b.map(function (x) { return x.dataset.add; }); }), ['GU-0005']);
  await page.evaluate(function () { startAdd('GU-0005'); });
  await page.setInputFiles('#picker', [await jpeg(page, 'g.jpg', 400, 400)]);
  await page.waitForSelector('#crop.open');
  await page.click('.crop-ok');
  await page.waitForFunction(function () { return /Photo saved as GU-0005\.jpg/.test(document.querySelector('#toast').textContent); });
  eq(await page.evaluate(function () { return [findGu('GU-0005').photos.length, window.__saved.pop().id]; }), [1, 'GU-0005'], 'saved under its Item ID');
  await go(page, 'game-used');
  await page.evaluate(function () { document.querySelector('#gu-grid .card[data-gu="GU-0001"]').click(); }); await settle(page);
  await page.keyboard.press('Escape'); await settle(page);
  eq(await page.evaluate(function () { return document.activeElement.dataset.gu; }), 'GU-0001', 'closing goes back to the card');
});

test('game used: sports in the sheet from the tab; names first signed first; "Also in Game Used" with the variant in its small line', async function ({ page }) {
  await open(page);
  await page.evaluate(function () {
    const g = findGu('GU-0006'); g.sport = 'Hockey'; g.team = ''; g.signed = ['AM-0005']; // white pants, now a hockey item signed by Dee Park
    amItem('AM-0002').signatures[2].date = '2020-01-01'; // Cal Dunn signed the helmet first
    renderGu(true);
  });
  await go(page, 'game-used');
  eq(await page.$$eval('#gu-f-sport option', function (x) { return x.map(function (e) { return e.textContent; }); }), ['All sports', 'Baseball', 'Football', 'Hockey'], 'the sports in the sheet come from the data');
  await sel(page, '#gu-f-sport', 'Hockey'); await settle(page);
  eq(await ids(page), ['GU-0006']);
  eq(await page.$$eval('#gu-chips button', function (b) { return b.map(function (x) { return x.textContent; }); }), ['All teams', 'Harbor City Herons 4', 'Bay City Breakers 1'], 'an item with no team has no chip');
  await page.click('#gu-clear'); await settle(page);
  eq(await page.$eval('#gu-grid .card[data-gu="GU-0004"] .who', function (e) { return e.textContent; }), 'Cal Dunn + 2 more', 'the first to sign, not the first in the alphabet');
  await go(page, 'AM-0005');
  eq(await page.$eval('#sheet .also .mh-signed button', function (e) { return [e.querySelector('b').textContent, e.querySelector('small').textContent]; }), ['Pants', 'GU-0006 · White · 2023'], 'named as on its own panel, the variant in the small line');
});
