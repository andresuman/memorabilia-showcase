/* A stand-in for google.script.run in the preview: answers the page's calls to Code.gs with the test data
   (fixtures.js), draws placeholder photos and logos, and keeps photos "uploaded" from the page in memory
   (window.__saved). Calls answer after a short delay, like the real server. */
(function () {
  'use strict';
  const SHAPES = { sq: [1000, 1000], portrait: [750, 1000], land: [1000, 750] };
  function svg(w, h, fill, label) {
    return 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<rect width="100%" height="100%" fill="' + fill + '"/><circle cx="50%" cy="50%" r="' + Math.min(w, h) / 4 + '" fill="#fff" opacity=".85"/>' +
      '<text x="50%" y="92%" font-family="sans-serif" font-size="' + Math.min(w, h) / 12 + '" text-anchor="middle" fill="#fff">' + label + '</text></svg>');
  }
  function photo(id) {
    if (/^data:/.test(id)) return id; // a photo saved from the page during the test
    const shape = SHAPES[String(id).split('-')[0]] || SHAPES.sq;
    const hue = String(id).split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 0) * 37 % 360;
    return svg(shape[0], shape[1], 'hsl(' + hue + ',55%,45%)', id);
  }
  const logos = { 'Bay City Breakers': svg(256, 256, '#2E1F8A', 'BAY'), 'Harbor City Herons': svg(256, 256, '#E2560B', 'HAR') };
  const copy = function (x) { return JSON.parse(JSON.stringify(x)); };

  // Spreadsheet calls. Tests can hold the answers (window.__holdData = true, then window.__releaseData())
  // to see the page before the spreadsheet answers, and change them (window.__patchData = function (name, data)).
  const held = [];
  function data(ok, name, ms) {
    const answer = function () {
      let d = copy(window[name]);
      if (window.__patchData) d = window.__patchData(name, d) || d;
      ok(d);
    };
    if (window.__holdData) held.push(answer); else setTimeout(answer, ms);
  }
  window.__releaseData = function () { window.__holdData = false; held.splice(0).forEach(function (f) { f(); }); };

  window.__saved = [];
  const uploads = {};
  function runner() {
    let ok = function () {}, ko = function () {};
    const later = function (fn, ms) { setTimeout(fn, ms || 60); };
    const api = {
      withSuccessHandler: function (f) { ok = f; return api; },
      withFailureHandler: function (f) { ko = f; return api; },
      getCollection: function () { data(ok, 'TEST_COLLECTION', 120); },
      getGameUsed: function () { data(ok, 'TEST_GU', 180); },
      getTeams: function () { data(ok, 'TEST_TEAMS', 40); },
      getLogos: function () { later(function () { ok(logos); }); },
      getPhoto: function (id, w) {
        (window.__photoCalls = window.__photoCalls || []).push([id, w]);
        later(function () { if (/^broken/.test(id)) ko(new Error('No such photo')); else ok(photo(id)); });
      },
      // A video in pieces of 2 MB (base64). window.__videoB64 = a real video for the preview, else filler bytes.
      getVideoChunk: function (ref, i) {
        (window.__videoCalls = window.__videoCalls || []).push([ref, i]);
        later(function () {
          if (window.__videoFail) { ko(new Error('Drive said no')); return; }
          const real = window.__videoB64;
          ok(real ? (i === 0 ? real : '') : btoa('piece ' + i));
        }, 120);
      },
      beginPhoto: function (id) { const t = 't' + Math.random(); uploads[t] = { id: id, parts: [] }; later(function () { ok(t); }); },
      putPhotoChunk: function (t, i, chunk) { uploads[t].parts[i] = chunk; later(function () { ok(true); }); },
      finishPhoto: function (t, total) {
        const u = uploads[t];
        const n = window.__saved.filter(function (s) { return s.id === u.id; }).length;
        window.__saved.push({ id: u.id, chunks: total, bytes: u.parts.join('').length });
        later(function () { ok({ fileId: 'data:image/jpeg;base64,' + u.parts.join(''), name: u.id + (n ? '-' + (n + 1) : '') + '.jpg' }); });
      }
    };
    return api;
  }
  window.google = { script: { get run() { return runner(); } } };
})();
