'use strict';
const { test, open, go, hash, settle, touch, steps, eq } = require('./app');

test('links: the back arrow goes back step by step; X closes everything; Esc too', async function ({ page }) {
  await open(page, 'autographed');
  await go(page, 'AM-0001');
  eq(await page.$$eval('.sheet-nav button, #d-back', function (x) { return x.map(function (e) { return e.id; }); }), ['d-prev', 'd-next', 'd-close'], 'opened from the list');
  await page.click('#sheet [data-go="AM-0003"]'); await settle(page);
  eq(await hash(page), '#AM-0003');
  eq(await page.$$eval('.sheet-nav button, #d-back', function (x) { return x.map(function (e) { return e.id; }); }), ['d-back', 'd-close'], 'opened from a link');
  eq(await page.$eval('#d-back', function (e) { return e.getAttribute('aria-label'); }), 'Back to AM-0001');
  await page.click('#d-back'); await settle(page); eq(await hash(page), '#AM-0001');
  eq(await page.$$eval('#d-back', function (x) { return x.length; }), 0, 'no back arrow on the first panel');
  await go(page, 'AM-0002');
  await page.click('#sheet [data-go="game-used/GU-0004"]'); await settle(page);
  eq(await hash(page), '#game-used/GU-0004');
  eq(await page.$eval('#d-back', function (e) { return e.getAttribute('aria-label'); }), 'Back to AM-0002');
  await page.click('#d-close'); await settle(page); eq(await hash(page), '#autographed', 'X closes everything');
  await go(page, 'AM-0002');
  await page.click('#sheet [data-go="game-used/GU-0004"]'); await settle(page);
  await page.keyboard.press('Escape'); await settle(page); eq(await hash(page), '#autographed', 'Esc closes everything');
});

test('previous / next stay in the list (none on a phone); the arrow keys do nothing on a panel opened from a link', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'autographed');
  await go(page, 'AM-0005');
  eq(await page.evaluate(function () { return state.view[0].id; }), 'AM-0005', 'newest first');
  if (info.project.name === 'phone') {
    eq(await page.evaluate(function () { return ['.sheet-nav .pos', '#d-prev', '#d-next'].map(function (s) { return getComputedStyle(document.querySelector(s)).display; }); }),
      ['none', 'none', 'none'], 'no previous / next and no count on a phone');
    await page.keyboard.press('ArrowRight'); await settle(page);
  } else {
    await page.click('#d-next'); await settle(page);
  }
  eq(await hash(page), '#' + await page.evaluate(function () { return state.view[1].id; }));
  await page.evaluate(function () { state.q = 'stone'; render(); });
  await go(page, 'AM-0001');
  await page.keyboard.press('ArrowRight'); await settle(page);
  eq(await hash(page), '#AM-0001');
});

test('add photo: the camera on the photo; thumbnails only with something to move between', async function ({ page }) {
  const look = function () {
    return page.evaluate(function () {
      const add = document.querySelector('#sheet #d-add');
      return [add ? add.dataset.add : null, document.querySelectorAll('#sheet .thumbs button').length,
        !!document.querySelector('#sheet .thumbs [data-add]'), document.querySelectorAll('#sheet .stage-add').length];
    });
  };
  await open(page, 'autographed');
  await go(page, 'AM-0001');
  eq(await look(), ['AM-0001', 0, false, 0], 'one photo: no thumbnails, the camera on the photo');
  eq(await page.evaluate(function () { return !!document.querySelector('#d-stage .media > #d-add.photo-add'); }), true, 'at the corner of the photo, not with the panel buttons');
  await go(page, 'AM-0002');
  eq(await look(), ['AM-0002', 3, false, 0], 'three photos: three thumbnails, no camera among them');
  await go(page, 'AM-0004');
  eq(await look(), ['AM-0004', 0, false, 0], 'no photo but a video: the video fills the photo area, the camera at its corner');
  await go(page, 'AM-0005');
  await page.evaluate(function () { amItem('AM-0005').photos = []; }); await go(page, 'autographed'); await go(page, 'AM-0005');
  eq(await look(), [null, 0, false, 1], 'nothing to see: Add photo');
});

test('back to the top: after two screens down, back to the top of the page; not on the home page', async function ({ page }) {
  await open(page, 'autographed');
  await page.evaluate(function () { document.querySelector('#am-main').style.paddingBottom = '6000px'; window.scrollTo(0, 0); });
  await settle(page);
  const shown = function () { return page.$eval('#to-top', function (b) { return b.classList.contains('show'); }); };
  eq(await shown(), false, 'not at the top');
  await page.evaluate(function () { window.scrollTo(0, listTop() + window.innerHeight * 2 + 40); }); await settle(page);
  eq(await shown(), true, 'two screens down');
  await page.click('#to-top');
  await page.waitForFunction(function () { return window.scrollY === 0; }); await settle(page);
  eq(await shown(), false, 'at the top of the page, the title in view; gone once there');
  await page.evaluate(function () { window.scrollTo(0, listTop() + window.innerHeight * 3); }); await settle(page);
  await go(page, '');
  eq(await shown(), false, 'not on the home page');
});

test('motion: panel photos follow the finger (phone) or the thumbnails (computer); linked panels slide in from the side they lead to', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'AM-0002');
  const cur = function () { return page.$eval('#sheet .thumbs [aria-current="true"]', function (e) { return e.dataset.i; }); };
  // The thumbnail of the photo on show stands out: opaque with a white ring; the others dimmed, no ring; all one size.
  eq(await page.$$eval('#sheet .thumbs button[data-i]', function (x) { return x.map(function (e) { const c = getComputedStyle(e); return [e.getAttribute('aria-current') === 'true', c.opacity === '1', c.borderTopColor === 'rgb(255, 255, 255)', c.transform === 'none'].join(); }); }).then(function (a) { return a.every(function (v) { return v === 'true,true,true,true' || v === 'false,false,false,true'; }) && a.filter(function (v) { return v === 'true,true,true,true'; }).length === 1; }), true, 'one thumbnail stands out');
  if (info.project.name === 'phone') {
    const box = await page.$eval('#d-stage .media', function (e) { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const y = box.y + box.h / 2;
    const ghosts = function () { return page.$$eval('#d-stage .slide-ghost', function (x) { return x.length; }); };
    await touch(page, steps([{ x: box.x + box.w * .7, y: y }], [{ x: box.x + box.w * .6, y: y + 2 }], 6));
    eq([await cur(), await ghosts()], ['0', 0], 'short drag: back in place');
    await touch(page, steps([{ x: box.x + box.w * .85, y: y }], [{ x: box.x + box.w * .2, y: y + 3 }], 12));
    eq([await cur(), await ghosts()], ['1', 0], 'past a third of the width: the next photo');
    await page.click('#sheet .thumbs [data-i="0"]'); await settle(page);
    await touch(page, steps([{ x: box.x + box.w * .2, y: y }], [{ x: box.x + box.w * .9, y: y }], 12));
    eq(await cur(), '0', 'first photo: a swipe right only resists');
  } else {
    await page.click('#sheet .thumbs [data-i="2"]'); await settle(page);
    eq(await cur(), '2', 'thumbnail slides to its photo');
  }
  await page.click('#sheet .mh-signed [data-go]'); await settle(page);
  eq(await page.$eval('#sheet .sheet-grid', function (e) { return e.className; }), 'sheet-grid from-right', 'into a link');
  await page.click('#d-back'); await settle(page);
  eq(await page.$eval('#sheet .sheet-grid', function (e) { return e.className; }), 'sheet-grid from-left', 'back');
});

test('full-screen photo: open, zoom (pinch or wheel), change photo, close back on the same photo', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'AM-0002');
  await page.click('#d-stage .media > img'); await settle(page);
  eq(await page.evaluate(function () { return [zoom.open, document.querySelector('.zoom-pos').textContent]; }), [true, '1 of 3']);
  if (info.project.name === 'phone') {
    await touch(page, steps([{ x: 171, y: 430 }, { x: 231, y: 470 }], [{ x: 81, y: 430 }, { x: 321, y: 470 }], 8)); // pinch out
    eq(await page.evaluate(function () { return zoom.s > 2; }), true, 'pinch zooms');
    await page.touchscreen.tap(200, 400); await page.waitForTimeout(60); await page.touchscreen.tap(200, 400); // a double tap: two taps 60 ms apart
    await settle(page);
    eq(await page.evaluate(function () { return zoom.s; }), 1, 'double tap zooms back out');
    await touch(page, steps([{ x: 320, y: 400 }], [{ x: 150, y: 405 }], 10)); // swipe left
    eq(await page.evaluate(function () { return [zoom.i, document.querySelectorAll('.zoom-ghost').length]; }), [1, 0], 'swipe shows the next photo');
    await touch(page, steps([{ x: 200, y: 300 }], [{ x: 205, y: 480 }], 10)); // pull down
  } else {
    await page.mouse.move(700, 450); await page.mouse.wheel(0, -400); await settle(page);
    eq(await page.evaluate(function () { return zoom.s > 2; }), true, 'wheel zooms');
    await page.keyboard.press('ArrowRight'); await settle(page);
    eq(await page.evaluate(function () { return [zoom.i, zoom.s]; }), [1, 1], 'arrow shows the next photo');
    await page.keyboard.press('Escape'); await settle(page);
  }
  eq(await page.evaluate(function () { return zoom.open; }), false, 'closed');
  eq(await hash(page), '#AM-0002', 'the panel stays open');
  eq(await page.$eval('#sheet .thumbs [aria-current="true"]', function (e) { return e.dataset.i; }), '1', 'panel on the same photo');
});

test('full-screen photo closes when the panel changes', async function ({ page }) {
  await open(page, 'AM-0002');
  await page.click('#d-stage .media > img'); await settle(page);
  await go(page, 'AM-0001');
  eq(await page.evaluate(function () { return zoom.open; }), false);
});
