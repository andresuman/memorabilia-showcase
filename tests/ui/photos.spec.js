'use strict';
const { test, open, reopen, go, settle, eq, see, jpeg } = require('./app');

const photoWidths = function (page) { return page.evaluate(function () { return (window.__photoCalls || []).map(function (c) { return c[1]; }); }); };

test('photos: blurred fill only around photos that do not fill the area; link rows ask for small photos', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'AM-0003');
  const portrait = await page.$eval('#d-stage', function (e) { return e.classList.contains('backdrop'); });
  await go(page, 'AM-0001');
  const square = await page.$eval('#d-stage', function (e) { return e.classList.contains('backdrop'); });
  eq([portrait, square], [true, info.project.name === 'desktop'], 'portrait / square (the desktop photo area is not square)');
  eq(await page.$$eval('#sheet .mh-signed img[data-pid]', function (x) { return x.map(function (i) { return i.dataset.w; }); }), ['64']);
});

test('photo frames: a sheen while a photo loads, initials only without a photo or when it fails', async function ({ page }) {
  await open(page, 'autographed');
  const frames = await page.evaluate(function () {
    amItem('AM-0005').photos = ['broken-1'];
    amItem('AM-0002').photos = ['sq-2', 'portrait-1', 'land-1'];
    render(true);
    const ph = function (id) { const p = document.querySelector('.card[data-id="' + id + '"] .ph'); return { loading: p.classList.contains('loading'), initials: getComputedStyle(p.querySelector('.initials')).visibility }; };
    return { withPhoto: ph('AM-0002'), without: ph('AM-0004') };
  });
  eq(frames.withPhoto, { loading: true, initials: 'hidden' }, 'item with a photo, before it loads');
  eq(frames.without, { loading: false, initials: 'visible' }, 'item without photo');
  await see(function () {
    return page.evaluate(function () {
      const ok = document.querySelector('.card[data-id="AM-0002"] .ph'), broken = document.querySelector('.card[data-id="AM-0005"] .ph');
      return [ok.hidden, broken.classList.contains('loading')];
    });
  }, [true, false], 'loaded photo hides the frame; a failed one shows the initials');
});

test('photo sizes: cards, panel, thumbnails and rows ask for what the screen shows', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'autographed'); // a fresh browser: every size is asked for once
  const d = info.project.name === 'phone' ? 2 : 1; // phone: density 2; computer: density 1
  eq(Array.from(new Set(await photoWidths(page))), [240 * d], 'cards');
  await page.evaluate(function () { window.__photoCalls = []; });
  await go(page, 'AM-0002');
  // The panel photo area: 402 px wide on the phone (×2 → 800), 720 px tall on the computer (→ 800);
  // the photo shown and the next one, fetched ahead for a swipe, both at the panel's size.
  eq((await photoWidths(page)).filter(function (w) { return w > 200; }), [800, 800], 'panel photo and the next one');
  eq(Array.from(new Set((await photoWidths(page)).filter(function (w) { return w <= 200; }))), [64 * d], 'thumbnails');
});

test('photos seen once are kept in the browser: after reopening the app none is asked again', async function ({ page }) {
  await open(page, 'autographed');
  await see(function () { return page.$$eval('#grid .card img[data-pid]:not([hidden])', function (x) { return x.length; }); }, 4, 'card photos shown the first time');
  await settle(page); // and kept
  await reopen(page);
  await go(page, 'autographed');
  eq(await page.evaluate(function () { return (window.__photoCalls || []).length; }), 0, 'server calls for photos');
  await see(function () { return page.$$eval('#grid .card img[data-pid]:not([hidden])', function (x) { return x.length; }); }, 4, 'card photos shown');
});

test('opening again: the last data shows at once, the spreadsheet is checked behind it, and nothing is redrawn when nothing changed', async function ({ page }) {
  await open(page, 'autographed'); // everything kept by now
  await page.addInitScript(function () { window.__holdData = true; });
  await page.reload();
  await page.waitForFunction(function () { return document.querySelectorAll('#grid .card').length === 5; }, null, { timeout: 3000 });
  eq(await page.evaluate(function () { return document.body.classList.contains('syncing'); }), true, 'reload buttons spin while checking');
  await page.evaluate(function () { document.querySelector('#grid .card').__mark = 1; window.__releaseData(); });
  await page.waitForFunction(function () { return !document.body.classList.contains('syncing'); }); await settle(page);
  eq(await page.evaluate(function () { return document.querySelector('#grid .card').__mark; }), 1, 'unchanged: the same card element stays');
});

test('opening again: a change in the spreadsheet replaces what was shown, without closing the open panel', async function ({ page }) {
  await open(page, 'autographed'); // everything kept by now
  await page.addInitScript(function () {
    window.__holdData = true;
    window.__patchData = function (name, d) {
      if (name !== 'TEST_COLLECTION') return d;
      d.items[0].model = 'Speed Flex';
      d.items[1].signatures.forEach(function (s) { s.date = '2025-02-01'; }); // every signature the same day
      return d;
    };
  });
  await page.reload();
  await page.waitForFunction(function () { return document.querySelectorAll('#grid .card').length === 5; }, null, { timeout: 3000 });
  await go(page, 'AM-0001');
  eq(await page.$eval('#d-title', function (e) { return e.textContent; }), 'Speed Helmet', 'kept copy');
  await page.evaluate(function () { window.__releaseData(); });
  await see(function () { return page.$eval('#d-title', function (e) { return e.textContent; }); }, 'Speed Flex Helmet', 'updated in place');
  eq(await page.evaluate(function () { return decodeURIComponent(location.hash); }), '#AM-0001', 'panel still open');
  await go(page, 'AM-0002');
  eq(await page.$eval('#sheet .id', function (e) { return e.textContent; }), 'AM-0002 · 2025', 'signatures of the same year: one year');
});

test('add photos: each one framed (square or original, straightened), then saved one after the other; Cancel saves nothing', async function ({ page }) {
  await open(page, 'AM-0004');
  const file = async function (name) { return jpeg(page, name, 600, 800); };
  const sizes = function () {
    return page.evaluate(function () {
      return Promise.all(Object.keys(localPreview).map(function (k) { // the photos saved in this test, as sent
        return new Promise(function (r) { const im = new Image(); im.onload = function () { r(im.width + 'x' + im.height); }; im.src = localPreview[k]; });
      }));
    });
  };
  await page.evaluate(function () { startAdd('AM-0004'); });
  await page.setInputFiles('#picker', [await file('a.jpg'), await file('b.jpg')]);
  await page.waitForSelector('#crop.open');
  eq(await page.$eval('.crop-pos', function (e) { return e.textContent; }), '1 of 2');
  await page.click('.crop-ok'); await settle(page);
  eq(await page.$eval('.crop-pos', function (e) { return e.textContent; }), '2 of 2');
  await page.click('.crop-orig');
  await page.waitForFunction(function () { return document.querySelector('#toast').classList.contains('show'); });
  eq(await page.$eval('#toast', function (e) { return e.textContent; }), '2 photos saved');
  eq((await sizes()).sort(), ['600x600', '600x800'], 'square and original');
  eq(await page.evaluate(function () { return amItem('AM-0004').photos.length; }), 2);
  await page.evaluate(function () { startAdd('AM-0004'); });
  await page.setInputFiles('#picker', [await file('c.jpg'), await file('d.jpg')]);
  await page.waitForSelector('#crop.open');
  // Straighten: the ruler turns the photo (arrow keys half a degree) and it still covers the frame.
  await page.focus('.crop-tilt');
  for (let k = 0; k < 20; k++) await page.keyboard.press('ArrowRight');
  eq(await page.$eval('.crop-tilt', function (e) { return [e.getAttribute('aria-valuenow'), e.querySelector('.crop-deg').textContent]; }), ['10', '10°']);
  eq(await page.evaluate(function () {
    const im = document.querySelector('.crop-img'), fr = document.querySelector('.crop-frame').getBoundingClientRect();
    const pts = [[fr.left + 2, fr.top + 2], [fr.right - 2, fr.top + 2], [fr.left + 2, fr.bottom - 2], [fr.right - 2, fr.bottom - 2]];
    return pts.every(function (p) { return document.elementsFromPoint(p[0], p[1]).indexOf(im) >= 0; });
  }), true, 'every corner of the frame lies on the turned photo at 10°');
  await page.click('.crop-deg'); // tap the angle: back to straight
  eq(await page.$eval('.crop-tilt', function (e) { return e.getAttribute('aria-valuenow'); }), '0');
  await page.click('.crop-ok'); await settle(page);
  await page.click('.crop-cancel'); await settle(page);
  eq(await page.evaluate(function () { return [window.__saved.length, document.querySelector('#crop').hidden, Object.keys(uploading).length]; }), [2, true, 0], 'cancel');
});

test('add photos: a last photo that cannot be opened closes the frame; Enter on Cancel cancels', async function ({ page }) {
  await open(page, 'AM-0001');
  await page.evaluate(function () { startAdd('AM-0001'); });
  await page.setInputFiles('#picker', [await jpeg(page, 'a.jpg'), { name: 'b.heic', mimeType: 'image/heic', buffer: Buffer.from('not a photo') }]);
  await page.waitForSelector('#crop.open');
  await page.click('.crop-ok');
  await page.waitForFunction(function () { return /^1 of 2 photos saved/.test($('#toast').textContent); }); await settle(page);
  eq(await page.evaluate(function () { return [$('#crop').hidden, window.__saved.length]; }), [true, 1], 'the good photo is saved and the frame does not stay over the page');
  await page.evaluate(function () { startAdd('AM-0001'); });
  await page.setInputFiles('#picker', [await jpeg(page, 'c.jpg')]);
  await page.waitForSelector('#crop.open');
  await page.focus('.crop-cancel'); await page.keyboard.press('Enter'); await settle(page);
  eq(await page.evaluate(function () { return [$('#crop').hidden, window.__saved.length]; }), [true, 1], 'Enter on Cancel saves nothing');
});

test('add photo: the same item in another collection shows it too, without a reload', async function ({ page }) {
  await open(page, 'game-used');
  eq(await page.$$eval('[data-cell="GU-0002"] .snap', function (x) { return x.length; }), 1, 'no photo yet: Add photo on its card');
  await go(page, 'AM-0004');
  await page.evaluate(function () { startAdd('AM-0004'); });
  await page.setInputFiles('#picker', [await jpeg(page, 'a.jpg')]);
  await page.waitForSelector('#crop.open');
  await page.click('.crop-orig');
  await page.waitForFunction(function () { return /saved/.test($('#toast').textContent); }); await settle(page);
  eq(await page.evaluate(function () { return [amItem('AM-0004').photos.length, document.querySelectorAll('[data-cell="GU-0002"] .snap').length, document.querySelectorAll('[data-cell="GU-0002"] img[data-pid]').length]; }),
    [1, 0, 1], 'the Game Used card of the same ball has the photo');
});
