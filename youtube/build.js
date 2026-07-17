#!/usr/bin/env node
'use strict';

// ──────────────────────────────────────────────────────────────
// BUILD SCRIPT — TubeVault / TholsStudio
//
// Single source of truth for the category pages is `page-template.html`
// (a full page with {{PLACEHOLDER}} tokens). This script:
//   1. Generates one page per category listed in categories.json.
//      The .html pages stay at the repo root; each category's JS files
//      (config seeds + page-template.js) are written into a <id>/ folder, so
//      e.g. music.html references music/music-collections.js and
//      music/page-template.js.
//   2. Generates <id>/page-template.js per category — the same template as a
//      JS string so the in-browser "Create category…" feature reuses the exact
//      same markup (works on GitHub Pages AND when opened via file://).
//
// The per-category config seeds (*-collections.js / *-playlist.js / *-watched.js)
// are source data and are committed inside each <id>/ folder (see git mv), not
// generated here.
//
// Run with:  node build.js
// No dependencies — plain Node, ships on GitHub Pages as static output.
// ──────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// Categories are listed in categories.json — the same "collections" shape as
// the per-category *-collections.js files: { collections: [ { id, name, color,
// groups, ungrouped }, ... ] }. That file is the single source of truth for
// which category pages get built (groups/ungrouped are ignored here).
const CATEGORIES_FILE = path.join(DIR, 'categories.json');

function loadCategories() {
  if (!fs.existsSync(CATEGORIES_FILE)) {
    console.error('ERROR: categories.json not found next to build.js');
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
  } catch (e) {
    console.error('ERROR: categories.json is not valid JSON: ' + e.message);
    process.exit(1);
  }
  const list = Array.isArray(data) ? data : data.collections;
  if (!Array.isArray(list)) {
    console.error('ERROR: categories.json must contain a "collections" array');
    process.exit(1);
  }
  const apps = [];
  list.forEach((c, idx) => {
    const id = c.id;
    const label = c.name || id;
    const color = c.color || '#5C6BC0';
    if (!id || !/^[a-z0-9-]+$/i.test(id)) {
      console.warn(`! Skipping invalid category on entry ${idx + 1}: "${id}"`);
      return;
    }
    apps.push({ id, label, color });
  });
  if (!apps.length) {
    console.error('ERROR: categories.json contained no valid categories');
    process.exit(1);
  }
  return apps;
}

// dir is the subfolder each category's JS lives in (e.g. "music/").
function configScriptTags(id, dir) {
  dir = dir || '';
  return [
    `<script src="${dir}${id}-collections.js"></script>`,
    `<script src="${dir}${id}-playlist.js"></script>`,
    `<script src="${dir}${id}-watched.js"></script>`,
  ].join('\n');
}

function render(template, app) {
  const dir = app.dir || '';
  return template
    .replace(/\{\{APP_NAME\}\}/g, app.id)
    .replace(/\{\{APP_LABEL\}\}/g, app.label)
    .replace(/\{\{APP_COLOR\}\}/g, app.color)
    .replace(/\{\{JS_DIR\}\}/g, dir)
    .replace(/\{\{SCRIPT_TAGS\}\}/g, configScriptTags(app.id, dir));
}

function writeFileEnsureDir(file, contents) {
  const dir = path.dirname(file);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, contents);
}

function main() {
  const templatePath = path.join(DIR, 'page-template.html');
  if (!fs.existsSync(templatePath)) {
    console.error('ERROR: page-template.html not found next to build.js');
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, 'utf8');

  // 1) Category pages from categories.json (HTML at root, JS in <id>/ folders)
  const APPS = loadCategories();
  APPS.forEach(app => {
    app.dir = app.id + '/';
    const html = render(template, app);
    fs.writeFileSync(path.join(DIR, `${app.id}.html`), html);
    console.log(`✓ generated ${app.id}.html`);

    // page-template.js lives inside the category folder
    writeFileEnsureDir(
      path.join(DIR, app.dir, 'page-template.js'),
      'window.PAGE_TEMPLATE = ' + JSON.stringify(template) + ';\n'
    );
    console.log(`✓ generated ${app.dir}page-template.js`);
  });

  // 2) Self-contained feature test page (HTML at root, JS in test/ folder)
  const testApp = { id: 'test', label: 'Test', color: '#5C6BC0', dir: 'test/' };
  let testHtml = render(template, testApp);
  testHtml = testHtml.replace('</body>', '<script src="tests.js"></script>\n</body>');
  fs.writeFileSync(path.join(DIR, 'tests.html'), testHtml);
  writeFileEnsureDir(
    path.join(DIR, 'test', 'page-template.js'),
    'window.PAGE_TEMPLATE = ' + JSON.stringify(template) + ';\n'
  );
  console.log('✓ generated tests.html + test/page-template.js');

  console.log('done');
}

main();
