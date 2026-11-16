#!/usr/bin/env node
/* Builds the page as Apps Script serves it (each <?!= include('Name') ?> replaced by Name.html), plus the
   data and the mock server, so it opens in a browser without Google. The preview covers the two collections:
   Autographed Memorabilia and Game Used Memorabilia.
   Usage: node tests/build-preview.js                                  (test data -> tests/out/preview.html)
          node tests/build-preview.js --data demo-data.js --out docs/demo-app.html   (demo data -> docs/demo-app.html)
          node tests/build-preview.js --landing --out docs/demo.html   (landing page -> docs/demo.html)
   The landing (see landingCss/landingHero/landingSetup/landingPage) is a standalone page: the walkthrough
   video, the two calls to action, the GitHub logo and repo name, and the setup guide (SETUP.md rendered
   to HTML) — no app, no data. "Try the demo" opens the bare demo (docs/demo-app.html) in a new tab, so
   the demo lives only there. The preview is the bare app, so the UI tests see exactly what a deployed
   copy shows. Don't edit docs/demo.html or docs/demo-app.html by hand — the next demo build overwrites them. */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

/* The real sample photos, logos and videos (tests/sample-assets.json), inlined as base64 so the page the
   preview builds shows them without talking to Drive: photos and logos as data URIs (the page puts them
   straight in an <img>), videos as raw base64 (the mock serves them piece by piece, the way the server
   does). A photo is keyed by its item ID (AM-0001, GU-0003), a video by its hologram (AB123456), a logo by
   its team name. The assets live as text (base64) because the push tool only takes text files; the usable
   files are the ones in the Drive sample folders (see SETUP.md). If the file is missing the page just has
   no samples. */
function sampleAssets() {
  const file = path.join(__dirname, 'sample-assets.json');
  let assets = { photos: {}, videos: {}, logos: {} };
  if (fs.existsSync(file)) assets = JSON.parse(fs.readFileSync(file, 'utf8'));
  return '<script>\nwindow.__samplePhotos = ' + JSON.stringify(assets.photos || {}) +
    ';\nwindow.__sampleVideos = ' + JSON.stringify(assets.videos || {}) +
    ';\nwindow.__sampleLogos = ' + JSON.stringify(assets.logos || {}) + ';\n</script>\n';
}

/* A small Markdown-to-HTML converter, just enough for SETUP.md: headings, paragraphs, lists, links,
   bold, inline code and fenced code blocks (no tables, no nested lists, no multi-line list items).
   SETUP.md is the single source for the setup guide: it is rendered into the demo page by this build,
   so the page and the file never drift apart. The first "# " heading is skipped (the demo page has its
   own heading), and the rest are demoted one level (## becomes <h3>) to sit under it. */
function mdToHtml(md) {
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, function (_, c) { return '<code>' + c + '</code>'; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, function (_, b) { return '<strong>' + b + '</strong>'; });
    return s;
  }
  const lines = md.split('\n');
  let html = '', para = [], list = null, inCode = false, skippedH1 = false;
  function flushPara() { if (para.length) { html += '<p>' + inline(para.join(' ')) + '</p>\n'; para = []; } }
  function flushList() { if (list) { html += '</' + list + '>\n'; list = null; } }
  for (const line of lines) {
    if (inCode) {
      if (/^```/.test(line)) { html += '</code></pre>\n'; inCode = false; }
      else html += esc(line) + '\n';
      continue;
    }
    if (/^```/.test(line)) { flushPara(); flushList(); html += '<pre><code>'; inCode = true; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      if (h[1].length === 1) {
        if (!skippedH1) { skippedH1 = true; continue; }
        html += '<h2>' + inline(h[2]) + '</h2>\n';
      } else {
        const level = Math.min(h[1].length + 1, 6);
        html += '<h' + level + '>' + inline(h[2]) + '</h' + level + '>\n';
      }
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    if (ol || ul) {
      flushPara();
      const kind = ol ? 'ol' : 'ul';
      if (list !== kind) { flushList(); html += '<' + kind + '>\n'; list = kind; }
      html += '<li>' + inline((ol || ul)[1]) + '</li>\n';
      continue;
    }
    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  if (inCode) html += '</code></pre>\n';
  return html;
}

/* The landing, demo-only: the walkthrough video, the two calls to action and the GitHub logo and repo
   name, and the setup guide. It is a standalone page (docs/demo.html) — no app, no data — so the demo
   itself lives only in docs/demo-app.html, which "Try the demo" opens in a new tab. "Create your
   collection" scrolls to the setup guide on the same page. Class names are prefixed demo- so none of
   the app's styles apply to them. */
function landingCss() {
  return '<style>\n' +
    '  .demo-landing { max-width: 960px; margin: 0 auto; padding: 40px 32px 8px; text-align: center; }\n' +
    '  .demo-landing video { display: block; width: 100%; border-radius: var(--r-lg); box-shadow: var(--lift-hi); background: #000; }\n' +
    '  .demo-music { margin: 12px 0 0; font-size: var(--fs-sm); color: var(--muted); }\n' +
    '  .demo-music a { color: var(--muted); }\n' +
    '  .demo-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 24px; }\n' +
    '  .demo-btn { display: inline-flex; align-items: center; justify-content: center; height: var(--h-btn-lg); padding: 0 24px; border: 0; border-radius: var(--r-pill); cursor: pointer; font-weight: 600; font-size: var(--fs-md); color: var(--ink); text-decoration: none; background: var(--surface); box-shadow: var(--lift); }\n' +
    '  .demo-btn-primary { background: var(--accent); color: #fff; }\n' +
    '  .demo-github { display: flex; align-items: center; justify-content: center; gap: 8px 18px; flex-wrap: wrap; margin: 16px 0 0; font-size: var(--fs-sm); }\n' +
    '  .demo-github a { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); text-decoration: none; }\n' +
    '  .demo-github svg { width: 18px; height: 18px; flex: none; }\n' +
    '  .demo-setup { padding: 32px 32px 64px; }\n' +
    '  .demo-setup-card { max-width: 860px; margin: 0 auto; background: var(--surface); border-radius: var(--r-lg); box-shadow: var(--lift); padding: 36px 40px 44px; }\n' +
    '  .demo-setup-card h2 { font-size: var(--fs-2xl); letter-spacing: -.02em; margin: 0 0 12px; }\n' +
    '  .demo-setup-card h3 { font-size: var(--fs-lg); margin: 28px 0 10px; }\n' +
    '  .demo-setup-card h4 { font-size: var(--fs-md); margin: 20px 0 8px; }\n' +
    '  .demo-setup-card p { margin: 0 0 12px; }\n' +
    '  .demo-setup-card a { color: var(--accent); }\n' +
    '  .demo-setup-card code { background: var(--bg); border-radius: 4px; padding: 1px 5px; font-size: .92em; overflow-wrap: anywhere; }\n' +
    '  .demo-setup-card pre { background: #14161B; color: #EEF0F3; border-radius: var(--r-sm); padding: 14px 16px; overflow-x: auto; margin: 0 0 14px; }\n' +
    '  .demo-setup-card pre code { background: none; padding: 0; color: inherit; }\n' +
    '  .demo-setup-card ol, .demo-setup-card ul { margin: 0 0 14px; padding-left: 24px; }\n' +
    '  .demo-setup-card li { margin-bottom: 6px; }\n' +
    '  @media (max-width: 640px) {\n' +
    '    .demo-landing { padding: 24px 20px 4px; }\n' +
    '    .demo-cta { flex-direction: column; align-items: stretch; }\n' +
    '    .demo-btn { width: 100%; }\n' +
    '    .demo-setup { padding: 24px 16px 48px; }\n' +
    '    .demo-setup-card { padding: 28px 20px 32px; }\n' +
    '  }\n' +
    '</style>\n';
}

function landingHero() {
  return '<div class="demo-landing">\n' +
    '  <video controls preload="metadata" src="memorabilia-showcase-video.mp4"></video>\n' +
    '  <p class="demo-music">Music: "Energy" by Benjamin Tissot — <a href="https://www.bensound.com/royalty-free-music">bensound.com</a> — License code: WSPALH883O9NVCED</p>\n' +
    '  <div class="demo-cta">\n' +
    '    <a class="demo-btn demo-btn-primary" id="demo-cta-try" href="demo-app.html" target="_blank" rel="noopener">Try the demo</a>\n' +
    '    <button class="demo-btn" id="demo-cta-setup" type="button">Create your collection</button>\n' +
    '  </div>\n' +
    '  <p class="demo-github"><a href="https://github.com/andresuman/memorabilia-showcase"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>andresuman/memorabilia-showcase</a><a href="mailto:andresuman@gmail.com"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>andresuman@gmail.com</a><a href="https://www.instagram.com/andresuman/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>@andresuman</a></p>\n' +
    '</div>\n';
}

function landingSetup() {
  const setup = mdToHtml(fs.readFileSync(path.join(root, 'SETUP.md'), 'utf8'));
  return '<section class="demo-setup" id="demo-setup">\n' +
    '  <div class="demo-setup-card">\n' +
    '    <h2>Create your collection</h2>\n' +
    setup +
    '  </div>\n' +
    '</section>\n' +
    '<script>\n' +
    '(function () {\n' +
    '  var setupBtn = document.getElementById("demo-cta-setup");\n' +
    '  if (setupBtn) setupBtn.addEventListener("click", function () {\n' +
    '    var el = document.getElementById("demo-setup");\n' +
    '    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });\n' +
    '  });\n' +
    '})();\n' +
    '</script>\n';
}

/* The standalone landing page (docs/demo.html). It defines the few CSS variables the landing uses (the
   same values as Styles.html :root) so it looks the same without the app. */
function landingPage() {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>Memorabilia Showcase</title>\n' +
    '<style>\n' +
    '  :root {\n' +
    '    --bg: #EEF0F3; --surface: #FFFFFF; --ink: #14161B; --muted: #5C6574; --accent: #2B59FF;\n' +
    '    --r-sm: 10px; --r-lg: 18px; --r-pill: 999px;\n' +
    '    --lift: 0 1px 2px rgba(20, 22, 27, .04), 0 6px 18px rgba(20, 22, 27, .06);\n' +
    '    --lift-hi: 0 2px 6px rgba(20, 22, 27, .06), 0 22px 44px rgba(20, 22, 27, .14);\n' +
    '    --h-btn-lg: 48px;\n' +
    '    --fs-sm: 13px; --fs-md: 17px; --fs-lg: 22px; --fs-2xl: 34px;\n' +
    '    --font: "Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif;\n' +
    '  }\n' +
    '  body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); }\n' +
    '  *, *::before, *::after { box-sizing: border-box; }\n' +
    '</style>\n' +
    landingCss() +
    '</head>\n<body>\n' +
    landingHero() +
    landingSetup() +
    '</body>\n</html>\n';
}

function build(opts) {
  opts = opts || {};
  const outFile = opts.out ? path.join(root, opts.out) : path.join(__dirname, 'out', 'preview.html');
  if (opts.landing) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, landingPage());
    return outFile;
  }
  const dataFile = opts.data || 'fixtures.js';
  const index = fs.readFileSync(path.join(root, 'Index.html'), 'utf8');
  let page = index.replace(/<\?!= include\('([A-Za-z]+)'\) \?>/g, function (_, name) {
    return fs.readFileSync(path.join(root, name + '.html'), 'utf8');
  });
  if (/<\?/.test(page)) throw new Error('Index.html has a template tag the preview does not understand.');
  // The data and the mock go in before the app's first script.
  const first = page.indexOf('<script>');
  if (first === -1) throw new Error('No <script> found in the page.');
  const inject = [dataFile, 'mock-gas.js'].map(function (f) {
    return '<script>\n' + fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n</script>\n';
  }).join('');
  page = page.slice(0, first) + inject + sampleAssets() + page.slice(first);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, page);
  return outFile;
}

if (require.main === module) {
  const args = process.argv.slice(2), opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--data') opts.data = args[++i];
    else if (args[i] === '--out') opts.out = args[++i];
    else if (args[i] === '--landing') opts.landing = true;
  }
  console.log('Built: ' + build(opts));
}
module.exports = build;
