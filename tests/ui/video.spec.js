'use strict';
const { test, open, go, hash, settle, touch, steps, eq, see } = require('./app');

// A tap on the video's slide in the photo area (it plays the video).
const play = function (page) { return page.click('#d-stage .media.on-video'); };
const playing = function (page) { return page.waitForFunction(function () { return /^blob:/.test(document.querySelector('#video video').getAttribute('src') || ''); }); };

test('video of the play: alone, it fills the photo area; a failed piece and Try again, pieces fetched once and kept; Esc closes it and leaves the panel', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'AM-0002');
  eq(await page.$$eval('#sheet .video-tile, #d-stage .slide-play', function (x) { return x.length; }), 0, 'no video, no tile, no play mark');
  await go(page, 'AM-0004'); // no photos: the video's frame fills the photo area, with the play mark
  eq(await page.evaluate(function () {
    const m = document.querySelector('#d-stage .media');
    return [m.classList.contains('on-video'), m.getAttribute('aria-label'), document.querySelector('#d-stage .slide-play').hidden,
      document.querySelectorAll('#sheet .thumbs').length, document.querySelectorAll('#sheet .stage-add').length, document.querySelector('#d-add').getAttribute('aria-label')];
  }), [true, 'Watch the play', false, 0, 0, 'Add photo'], 'one thing to see: no thumbnails; the camera at the corner');
  await see(function () { return page.$eval('#d-stage .media > img', function (i) { return [i.hidden, decodeURIComponent(i.src).indexOf('vid-1~0') > 0]; }); }, [false, true], 'the frame Drive made of the video');
  // A failed piece: a message, and the next try starts over.
  await page.evaluate(function () { window.__videoFail = true; window.__videoCalls = []; });
  await play(page);
  await page.waitForFunction(function () { return document.querySelector('#video .video-wait.failed'); });
  eq(await page.$eval('#video .video-msg', function (e) { return e.textContent; }), 'The video could not load. Check the connection and try again.');
  eq(await page.evaluate(function () { return [document.querySelector('#video .video-retry').hidden, document.activeElement.className]; }), [false, 'video-retry'], '"Try again" shows, with the focus');
  await page.keyboard.press('Escape'); await settle(page);
  eq([await page.$eval('#video', function (e) { return e.hidden; }), await hash(page)], [true, '#AM-0004'], 'Esc closes the video only');
  // "Try again" starts over without leaving the player.
  await play(page);
  await page.waitForFunction(function () { return document.querySelector('#video .video-wait.failed'); });
  await page.evaluate(function () { window.__videoFail = false; window.__videoCalls = []; });
  await page.click('#video .video-retry');
  await playing(page);
  eq(await page.evaluate(function () { return [document.querySelector('#video .video-retry').hidden, window.__videoCalls.map(function (c) { return c[1]; }).sort()]; }),
    [true, [0, 1, 2]], 'and goes away; 5 MB in three pieces of 2 MB');
  await page.click('#video .zoom-x'); await settle(page);
  await page.evaluate(function () { window.__videoCalls = []; });
  await play(page);
  eq(await page.evaluate(function () { return document.activeElement.getAttribute('aria-label'); }), 'Close video');
  await playing(page);
  eq(await page.evaluate(function () {
    return [window.__videoCalls.map(function (c) { return c[1]; }).sort(), document.querySelector('#video .video-wait').hidden, document.querySelector('#video video').hidden];
  }), [[], true, false], 'the second time it comes from this browser: no piece asked again');
  await page.click('#video .zoom-x'); await settle(page);
  eq(await page.evaluate(function () { return [document.querySelector('#video').hidden, document.activeElement.classList.contains('on-video')]; }), [true, true], 'focus back on the video\'s slide');
  // Kept in the browser: a new page load plays it without asking the server.
  eq(await page.evaluate(function () {
    Object.keys(videoCache).forEach(function (k) { delete videoCache[k]; });
    return keptVideo('vid-1~0').then(function (b) { return b && b.size; });
  }), 21, 'the three pieces kept together ("piece 0" + "piece 1" + "piece 2")');
  await page.evaluate(function () { window.__videoCalls = []; });
  await play(page);
  await playing(page);
  eq(await page.evaluate(function () { return window.__videoCalls.length; }), 0, 'no piece asked again');
  if (info.project.name === 'phone') {
    // A short pull springs back; a long one closes the video and leaves the panel.
    await touch(page, steps([{ x: 200, y: 300 }], [{ x: 205, y: 360 }], 12));
    eq(await page.$eval('#video', function (e) { return [e.classList.contains('open'), e.querySelector('.video-frame').style.transform]; }), [true, ''], 'short pull: back in place');
    await touch(page, steps([{ x: 200, y: 300 }], [{ x: 205, y: 600 }], 12));
    eq([await page.$eval('#video', function (e) { return e.classList.contains('open'); }), await hash(page)], [false, '#AM-0004'], 'long pull: closed');
    await play(page);
    await playing(page);
  }
  // Leaving the panel closes the video too.
  await go(page, 'autographed');
  eq(await page.evaluate(function () { return [document.querySelector('#video').classList.contains('open'), videoOpen, location.hash, state.currentId]; }), [false, false, '#autographed', null]);
});

test('video: one still arriving for another item never lands in the player', async function ({ page }) {
  await open(page);
  await page.evaluate(function () {
    findGu('GU-0001').video = { ref: 'vidA~0', size: 80000000, pieces: 40 }; // slow
    findGu('GU-0003').video = { ref: 'vidB~0', size: 1000, pieces: 1 };
    const make = URL.createObjectURL; window.__played = [];
    URL.createObjectURL = function (blob) { window.__played.push(blob.size); return make.call(URL, blob); };
  });
  await go(page, 'game-used/GU-0001');
  await play(page); await page.waitForTimeout(100); // a moment of the slow one, not all of it
  await page.keyboard.press('Escape');
  await go(page, 'game-used/GU-0003');
  await page.click('#sheet .video-tile'); await settle(page); // a photo first, then the video
  await play(page);
  await playing(page);
  eq(await page.$eval('#video .video-msg', function (e) { return /^Loading the video…( 100%)?$/.test(e.textContent); }), true, 'its own progress, not the other video\'s');
  await settle(page); // every piece of both has arrived by now
  eq(await page.evaluate(function () { return window.__played; }), [7], 'only its own video (7 bytes in the mock) reached the player');
});

test('video: as many pieces as the server says, whatever the size', async function ({ page }) {
  await open(page);
  await page.evaluate(function () { findGu('GU-0001').video = { ref: 'vidC~0', size: 999999999, pieces: 2 }; window.__videoCalls = []; });
  await go(page, 'game-used/GU-0001');
  await play(page);
  await playing(page); await settle(page);
  eq(await page.evaluate(function () { return [window.__videoCalls.map(function (c) { return c[1]; }).sort(), $('#video .video-wait').hidden]; }), [[0, 1], true]);
});

test('video with photos: the last slide, after the photos; its thumbnail shows it, a tap plays it (never the photo viewer); a missing frame shows the team color', { tag: '@both' }, async function ({ page }, info) {
  await open(page, 'game-used');
  await page.evaluate(function () { findGu('GU-0003').video = { ref: 'vid-3~0', size: 1000, pieces: 1 }; });
  await go(page, 'game-used/GU-0003');
  const look = function () {
    return page.evaluate(function () {
      const m = document.querySelector('#d-stage .media');
      return [m.classList.contains('on-video'), m.getAttribute('aria-label'), document.querySelector('#d-stage .slide-play').hidden,
        Array.from(document.querySelectorAll('#sheet .thumbs button')).map(function (b) { return b.getAttribute('aria-label') + (b.getAttribute('aria-current') === 'true' ? ' (on show)' : ''); })];
    });
  };
  eq(await look(), [false, 'Open the photo full screen', true, ['Photo 1 (on show)', 'Video of the play']], 'opens on the photo; the video last');
  await page.click('#sheet .video-tile'); await settle(page);
  eq(await look(), [true, 'Watch the play', false, ['Photo 1', 'Video of the play (on show)']], 'its thumbnail shows the video\'s slide');
  await see(function () { return page.$eval('#d-stage .media > img', function (i) { return decodeURIComponent(i.src).indexOf('vid-3~0') > 0; }); }, true, 'its frame');
  eq(await page.evaluate(function () { return !videoOpen; }), true, 'it does not play until tapped');
  await play(page);
  await playing(page);
  eq(await page.evaluate(function () { const z = document.querySelector('#zoom'); return !z || z.hidden; }), true, 'the player, not the photo viewer');
  await page.keyboard.press('Escape'); await settle(page);
  if (info.project.name === 'phone') {
    // Swipe back to the photo: the play mark leaves with the video's slide; and on again to the video.
    await touch(page, steps([{ x: 60, y: 200 }], [{ x: 330, y: 200 }], 10));
    eq((await look()).slice(0, 3), [false, 'Open the photo full screen', true], 'swiped back to the photo');
    await touch(page, steps([{ x: 330, y: 200 }], [{ x: 60, y: 200 }], 10));
    eq((await look()).slice(0, 3), [true, 'Watch the play', false], 'swiped on to the video');
  }
  await page.click('#sheet .thumbs button[data-i="0"]'); await settle(page);
  await page.click('#d-stage .media'); await settle(page);
  eq(await page.evaluate(function () { return [document.querySelector('#zoom').hidden, document.querySelector('#video').hidden, zoom.ids]; }), [false, true, ['land-3']], 'on the photo a tap opens the photo viewer, photos only');
  await page.keyboard.press('Escape'); await settle(page);
  // A video Drive has no frame of yet: its slide comes in as the team color, the play mark on it.
  await page.evaluate(function () { findGu('GU-0003').video = { ref: 'broken-vid~0', size: 1000, pieces: 1 }; });
  await go(page, 'game-used'); await go(page, 'game-used/GU-0003');
  await page.click('#sheet .video-tile'); await settle(page);
  eq(await page.evaluate(function () {
    const src = decodeURIComponent(document.querySelector('#d-stage .media > img').src);
    return [src.indexOf('<rect') > 0 && src.indexOf(teamInfo('Bay City Breakers').color) > 0, document.querySelector('#d-stage .slide-play').hidden];
  }), [true, false]);
});
