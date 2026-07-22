// ──────────────────────────────────────────────────────────────
// TEMPLATE TOKENS — shared by build.js (Node) and app.js (browser)
//
// Single source of truth for which {{TOKENS}} exist in page-template.html
// and what each one is replaced with. build.js's per-category page
// generation and app.js's in-browser "Create category…" feature both call
// renderTemplate() from here instead of keeping their own .replace() chains
// — add or change a token once, both places pick it up.
//
// ctx shape expected by renderTemplate():
//   {
//     id:    'music',            // category id / APP_NAME
//     label: 'Music',             // display name / APP_LABEL
//     color: '#EC407A',           // APP_COLOR
//     dir:   'music/',            // JS_DIR — folder holding this
//                                  // category's JS files (trailing slash)
//     builtinApps: [{id, name, color, file}, ...]  // for BUILTIN_APPS_JS —
//                                  // the full known category list, NOT
//                                  // just this one category
//   }
//
// Loaded two ways:
//   - Node (build.js):  const { renderTemplate } = require('./template-tokens.js');
//   - Browser (app.js): <script src="template-tokens.js"> before app.js,
//                        then use the global `TemplateTokens`.
// ──────────────────────────────────────────────────────────────
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.TemplateTokens = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // dir is the subfolder each category's JS lives in (e.g. "music/").
  function configScriptTags(id, dir) {
    dir = dir || '';
    return [
      `<script src="${dir}${id}-collections.js"></script>`,
      `<script src="${dir}${id}-playlist.js"></script>`,
      `<script src="${dir}${id}-watched.js"></script>`,
    ].join('\n');
  }

  // Builds the inline <script> that defines window.__BUILTIN_APPS__ — the
  // file:// fallback list for the in-app category switcher. `apps` must
  // already be shaped [{id, name, color, file}, ...]; callers (build.js,
  // app.js) are responsible for mapping their own internal shapes into that
  // before it reaches here.
  function buildBuiltinAppsJs(apps) {
    return `<script>window.__BUILTIN_APPS__ = ${JSON.stringify(apps || [])};</script>`;
  }

  // The full set of {{TOKEN}} placeholders used in page-template.html.
  // BUILTIN_APPS_JS is the odd one out — it depends on the *whole* app
  // list (ctx.builtinApps), not just the one category being rendered.
  const TEMPLATE_TOKENS = [
    ['{{APP_NAME}}',        ctx => ctx.id],
    ['{{APP_LABEL}}',       ctx => ctx.label],
    ['{{APP_COLOR}}',       ctx => ctx.color],
    ['{{JS_DIR}}',          ctx => ctx.dir || ''],
    ['{{SCRIPT_TAGS}}',     ctx => configScriptTags(ctx.id, ctx.dir || '')],
    ['{{BUILTIN_APPS_JS}}', ctx => buildBuiltinAppsJs(ctx.builtinApps)],
  ];

  // Split/join on the literal token text rather than .replace(regex, ...):
  // replaces every occurrence without needing to regex-escape the `{{`/`}}`
  // braces, and (like the original chained .replace() calls) each token is
  // resolved against the output of the previous substitution, in this
  // fixed order.
  function renderTemplate(template, ctx) {
    return TEMPLATE_TOKENS.reduce(
      (out, [token, resolve]) => out.split(token).join(resolve(ctx) ?? ''),
      template
    );
  }

  return { TEMPLATE_TOKENS, renderTemplate, configScriptTags, buildBuiltinAppsJs };
});
