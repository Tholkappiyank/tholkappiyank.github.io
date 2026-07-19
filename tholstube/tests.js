// ──────────────────────────────────────────────────────────────
// FEATURE TESTS — TubeVault / TholsStudio
//
// Plain browser harness (no framework / no build step). Loaded by tests.html
// AFTER app.js, so every global (state, PAGE_TEMPLATE, extractVideoId, …) is
// available. Runs on page load, renders a pass/fail report, and exposes the
// results on window.__TEST_RESULTS__.
//
// Open tests.html (served from the same folder) to run.
// ──────────────────────────────────────────────────────────────
(function () {
  'use strict';

  const results = [];
  function record(name, pass, detail) {
    results.push({ name: name, pass: !!pass, detail: detail || '' });
  }
  function eq(name, a, b) {
    record(name, a === b, 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
  }
  function truthy(name, a) {
    record(name, a, 'expected truthy, got ' + JSON.stringify(a));
  }

  // Make sure we have seed data to assert against even on a reused localStorage
  if (state.videos.length === 0 && typeof DEFAULT_COLLECTIONS !== 'undefined') {
    seedData();
    renderSidebar();
    renderCards();
  }

  // ── Pure parsing / helpers ──
  eq('extractVideoId: watch url', extractVideoId('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
  eq('extractVideoId: youtu.be', extractVideoId('https://youtu.be/abcdefghijk'), 'abcdefghijk');
  eq('extractVideoId: shorts', extractVideoId('https://www.youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
  eq('extractVideoId: with list', extractVideoId('https://www.youtube.com/watch?v=abcdefghijk&list=PL123'), 'abcdefghijk');
  eq('extractVideoId: invalid', extractVideoId('not a url'), null);
  eq('extractVideoId: missing v param', extractVideoId('https://www.youtube.com/watch'), null);
  eq('extractVideoId: short youtu.be', extractVideoId('https://youtu.be/abc'), null);

  eq('extractPlaylistId: present', extractPlaylistId('https://www.youtube.com/watch?v=x&list=PLxyz'), 'PLxyz');
  eq('extractPlaylistId: absent', extractPlaylistId('https://www.youtube.com/watch?v=x'), null);

  truthy('isYouTubeUrl: youtube', isYouTubeUrl('https://www.youtube.com/watch?v=x'));
  truthy('isYouTubeUrl: youtu.be', isYouTubeUrl('https://youtu.be/x'));
  eq('isYouTubeUrl: other', isYouTubeUrl('https://example.com'), false);

  eq("jsStr: quote", jsStr("it's"), "'it\\'s'");
  eq('jsStr: newline', jsStr("a\nb"), "'a\\nb'");

  const ch = chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4);
  eq('chunk sizes', ch.map(function (a) { return a.length; }).join(','), '4,4,2');

  eq('escHtml', escHtml('<a>&"'), '&lt;a&gt;&amp;&quot;');
  eq('escAttr', escAttr("a'b"), "a\\'b");

  truthy('formatDate returns string', typeof formatDate(Date.now()) === 'string');

  // slugifyCollectionName must produce a unique id when the base exists
  const s1 = slugifyCollectionName('Demo');
  const before = state.collections.map(function (c) { return c.id; });
  state.collections.push({ id: s1, name: 'Demo', color: '#fff' });
  const s2 = slugifyCollectionName('Demo');
  record('slugifyCollectionName unique', s1 !== s2 && before.indexOf(s2) === -1, s1 + ' / ' + s2);
  state.collections = state.collections.filter(function (c) { return c.id !== s1; });

  // ── Seed / state ──
  truthy('seedData populated videos', state.videos.length > 0);
  truthy('seedData has collections', state.collections.length > 0);
  eq('playlist remapped by yt id', (function () {
    const pl = state.playlists.find(function (p) { return p.id === 'pl1'; });
    return pl ? pl.videoIds.length : -1;
  })(), 3);

  // ── Rendering ──
  eq('sidebar renders collections',
     document.querySelectorAll('#collectionsList .sidebar-item').length,
     state.collections.length);

  const cards = document.querySelectorAll('.video-card');
  record('cards rendered', cards.length === state.videos.length,
         'cards=' + cards.length + ' videos=' + state.videos.length);
  if (cards.length) {
    truthy('card is draggable (makeSortable)', cards[0].draggable === true);
  }

  // ── Export pipeline (opens confirm modal, must not throw) ──
  exportCollectionsJs();
  truthy('exportCollectionsJs opens confirm',
         document.getElementById('exportConfirmModal').classList.contains('open'));
  closeModal('exportConfirmModal');

  exportWatchedJs();
  truthy('exportWatchedJs opens confirm',
         document.getElementById('exportConfirmModal').classList.contains('open'));
  closeModal('exportConfirmModal');

  exportPlaylistJs();
  truthy('exportPlaylistJs opens confirm',
         document.getElementById('exportConfirmModal').classList.contains('open'));
  closeModal('exportConfirmModal');

  exportData();
  truthy('exportData opens confirm',
         document.getElementById('exportConfirmModal').classList.contains('open'));
  closeModal('exportConfirmModal');

  // ── Runtime category page (PAGE_TEMPLATE) ──
  truthy('PAGE_TEMPLATE defined', typeof PAGE_TEMPLATE !== 'undefined');
  const page = buildCategoryHtml('cooking', 'Cooking', '#FFA726');
  truthy('category page has DOCTYPE', page.indexOf('<!DOCTYPE html>') === 0);
  truthy('category page sets APP_NAME', page.indexOf("const APP_NAME = 'cooking';") !== -1);
  eq('category page no placeholders', /\{\{/.test(page), false);

  // ── Report ──
  const passed = results.filter(function (r) { return r.pass; }).length;
  const failed = results.length - passed;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  const report = document.createElement('div');
  report.id = 'test-report';
  report.style.cssText = 'position:fixed;right:12px;bottom:12px;max-width:440px;max-height:72vh;overflow:auto;'
    + 'background:#0A0A10;color:#F0F0FF;border:1px solid #2A2A3E;border-radius:10px;'
    + 'padding:14px 16px;font:12px/1.5 monospace;z-index:99999;box-shadow:0 10px 30px rgba(0,0,0,.5)';

  let html = '<div style="font-weight:700;margin-bottom:8px;font-size:13px;">'
    + 'Tests: ' + passed + '/' + results.length + ' passed'
    + (failed ? ' <span style="color:#FF3040">(' + failed + ' failed)</span>'
              : ' <span style="color:#4CAF7D">✓ all green</span>')
    + '</div>';
  results.forEach(function (r) {
    html += '<div style="color:' + (r.pass ? '#6FE0A3' : '#FF6B6B') + '">'
      + (r.pass ? '✓ ' : '✗ ') + esc(r.name)
      + (r.pass ? '' : ' — ' + esc(r.detail))
      + '</div>';
  });
  report.innerHTML = html;
  document.body.appendChild(report);

  window.__TEST_RESULTS__ = results;
  // eslint-disable-next-line no-console
  if (window.console) console.log('TubeVault tests:', passed + '/' + results.length + ' passed', results);
})();
