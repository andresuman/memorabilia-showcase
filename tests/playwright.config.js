/* The page tests (tests/ui), in Chromium on an iPhone-sized screen and a computer screen.
   Every test runs on the phone. A test tagged @both runs on the computer too (what the screen
   size changes: layout, the Filters sheet or panel, touch or mouse); one tagged @desktop runs only there (the
   keyboard). Usage: npm run test:ui    (needs, once: npm install, then npx playwright install chromium) */
'use strict';
const os = require('os');
const PHONE = { viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1400, height: 900 } };

module.exports = {
  testDir: './ui',
  globalSetup: require.resolve('./ui/setup.js'),
  outputDir: './out/results',
  fullyParallel: true,
  workers: Math.max(4, Math.floor(os.cpus().length / 2)), // the tests mostly wait for the app's animations, so more than one per core
  forbidOnly: true,
  retries: 0, // a test that passes only sometimes is a bug to fix, not to retry
  timeout: 30000,
  reporter: process.env.CI ? 'dot' : 'list',
  use: { browserName: 'chromium', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: PHONE, grepInvert: /@desktop/ },
    { name: 'desktop', use: DESKTOP, grep: /@both|@desktop/ }
  ]
};
