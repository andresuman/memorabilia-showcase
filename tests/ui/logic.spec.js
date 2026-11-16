/* The page's own rules, checked on their own (no screen to walk through): the answer for each case, run once. */
'use strict';
const { test, open, eq } = require('./app');

test('sport icons: a team with no logo yet gets its sport\'s icon; no team at all, the sport\'s icon and name; an unknown sport, the general one', async function ({ page }) {
  await open(page);
  eq(await page.evaluate(function () {
    const ball = SPORT_ICONS.Baseball, glove = SPORT_ICONS.Boxing;
    const box = document.createElement('div'); box.innerHTML = sportTagHtml('Boxing');
    const keep = state.logos['Harbor City Herons'];
    const withLogo = logoHtml('Harbor City Herons').indexOf('<img') === 0;
    delete state.logos['Harbor City Herons'];
    const without = logoHtml('Harbor City Herons').indexOf(ball) > 0;
    state.logos['Harbor City Herons'] = keep;
    return [teamSport('Harbor City Herons'), withLogo, without, crestHtml([], ['Boxing']).indexOf(glove) > 0, box.textContent, sportIcon('Curling').indexOf(SPORT_ICON_OTHER) > 0];
  }), ['Baseball', true, true, true, 'Boxing', true]);
});

test('gestures: a flick is read from the last 100 ms; far enough goes on, a flick back cancels', async function ({ page }) {
  await open(page);
  eq(await page.evaluate(function () {
    return [dragGoes(200, 0, 130), dragGoes(100, 0, 130), dragGoes(60, 0.6, 130), dragGoes(10, 0.9, 130), dragGoes(200, -0.6, 130), dragGoes(-60, -0.6, 130), dragGoes(-60, 0.6, 130)];
  }), [true, false, true, false, false, true, false]);
  // A slow drag that ends in a flick is fast; one that stops before lifting is not.
  eq(await page.evaluate(function () {
    const real = Date.now; let now = 1000; Date.now = function () { return now; };
    const a = speedMeter(); a.add(0); now += 400; a.add(20); now += 40; a.add(60); const fast = a.get();
    const b = speedMeter(); b.add(0); now += 30; b.add(60); now += 300; const stopped = b.get();
    Date.now = real;
    return [fast > 0.45, stopped];
  }), [true, 0]);
});

test('game used: the moment as MLB lays it out (each batter with the pitcher and his own bullets; an old " / " between pitches stays text)', async function ({ page }) {
  await open(page);
  eq(await page.evaluate(function () {
    const d = document.createElement('div');
    d.innerHTML = momentHtml({ inning: 'Bottom of 1st', atBat: 'A One / B Two', pitching: 'P Three', play: 'A strikes out. / Ball - x.\nFoul - y.' });
    return [].map.call(d.querySelectorAll('.mo-ab'), function (ab) { return [].map.call(ab.querySelectorAll('.mo-who b, li'), function (e) { return e.textContent; }).join('|'); });
  }), ['A One|P Three|A strikes out.', 'B Two|P Three|Ball - x.|Foul - y.']);
  eq(await page.evaluate(function () { const d = document.createElement('div'); d.innerHTML = momentHtml({ atBat: 'A One', pitching: 'P', play: 'Ball / Foul' }); return d.querySelectorAll('.mo-ab').length + ':' + d.querySelector('li').textContent; }), '1:Ball / Foul');
});

test('the purchase line (Game Used): date and price, the price alone, the date alone', async function ({ page }) {
  await open(page);
  eq(await page.evaluate(function () { return [boughtWhen('2024-12-02', 371), boughtWhen('', 254.99), boughtWhen('2024-12-02')]; }),
    ['Dec 2, 2024 for $371.00', '$254.99', 'Dec 2, 2024']);
});
