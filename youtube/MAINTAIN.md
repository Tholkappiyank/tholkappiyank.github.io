# Maintaining the TubeVault Pages

`maintain.html` is a no-terminal, browser-based tool for keeping the category
pages in sync. It edits the shared `page-template.html`, manages the list of
categories, and generates the individual pages + `page-template.js`.

There are **two equivalent ways** to regenerate the pages:

| Method | When to use |
|--------|-------------|
| `maintain.html` (this tool) | Quick edits in the browser, no install — great on GitHub Pages. |
| `node build.js` | Scripted / CI builds from the terminal. |

Both use the **same substitution logic** and produce byte-identical output.

---

## 1. Open the tool

Serve the `youtube/` folder over HTTP (e.g. GitHub Pages, or a local server
like `python3 -m http.server`) and open:

```
maintain.html
```

> Opening it directly via `file://` also works, but the template is then loaded
> with the **“Load file…”** button instead of being fetched automatically.

---

## 2. Edit the page template

The **Page template** box shows the contents of `page-template.html` — the
single source of truth for every category page. It uses these placeholders:

| Placeholder | Replaced with |
|-------------|---------------|
| `{{APP_NAME}}` | category id (also the `localStorage` namespace) |
| `{{APP_LABEL}}` | human-readable title shown in the tab/sidebar |
| `{{APP_COLOR}}` | accent / branding color |
| `{{SCRIPT_TAGS}}` | the three `<id>-collections.js` / `-playlist.js` / `-watched.js` tags |

To change the layout, styles, or any markup, edit this box (or the underlying
`page-template.html`) — **not** the individual `*.html` files.

- **Reload from repo** — re-fetches `page-template.html`.
- **Load file…** — picks a local `page-template.html` (for `file://` use).
- **Save edited template** — downloads your edited version back as
  `page-template.html`.

---

## 3. Manage categories

The **Categories** table lists every page that will be generated:

- `id` — filename stem and storage namespace (e.g. `music` → `music.html`).
- `label` — title shown to users.
- `color` — accent color (color picker).

Use **+ Add category** to add a row and **Remove** to delete one. The default
rows (Music / Electronics / Astrology) mirror `BUILTIN_APPS` in `app.js`.

---

## 4. Generate the pages

Click **Generate & download all pages**. For each category the tool downloads:

- `<id>.html` — the full category page
- `page-template.js` — the runtime template string used by “Create category…”

The downloaded `<id>.html` files reference `page-template.js` plus their
`<id>-collections.js` / `<id>-playlist.js` / `<id>-watched.js` seed files.

> The per-category **seed files** (`*-collections.js`, `*-playlist.js`,
> `*-watched.js`) are still created inside the app via **Create category…**,
> or by copying an existing category’s seeds. `maintain.html` only produces
> the HTML shell + `page-template.js`.

Save the downloaded files into the `youtube/` folder next to `app.js` and
`style.css`, then commit/push.

---

## 5. Using the terminal instead (optional)

If you prefer a script / CI step, `build.js` does the same thing:

```bash
node build.js
```

It reads the category list from `categories.json` (the same `collections`
shape as the per-category `*-collections.js` files) and regenerates
`music.html`, `electronics.html`, `astrology.html`, `tests.html`, and each
`page-template.js` from `page-template.html`. No dependencies required
(plain Node).

To add a category, append an entry to the `collections` array in
`categories.json` and re-run `node build.js` (e.g.
`{ "id": "cooking", "name": "Cooking", "color": "#FFA726", "groups": {}, "ungrouped": [] }`).
To remove one, delete its entry — or use `node delete-category.js <id> --force`
to also remove the generated files.

---

## 6. Deleting a category (removes files)

`maintain.html` can only *download* pages — it can never delete anything from
the repo. To actually remove a category's generated artifacts, use the
terminal script:

```bash
node delete-category.js <id> [--force]
```

It removes `<id>.html` (at the root) and the `<id>/` folder (JS seeds +
`page-template.js`). It is interactive by default — it lists the files and
asks you to type the id to confirm — and `--force` skips the prompt.

Guards (refuses and exits non-zero):
- unknown / missing id,
- invalid ids (only letters, digits, dashes),
- the built-in categories (`music` / `electronics` / `astrology`) and `test`
  — those are shipped pages; remove a built-in by editing `categories.json`
  first.

> If the category was created in the app (via "Create category…"), it is also
> recorded in the shared `localStorage` registry (`tholsstudio_categories`).
> `delete-category.js` only touches the repo's files; clear that registry entry
> in the browser (or remove it from the in-app category switcher) so the deleted
> page stops showing up in the category menu.

---

## File layout

After generating, the repo looks like:

```
youtube/
  music.html            ← category page (at root)
  electronics.html
  astrology.html
  app.js, style.css     ← shared engine (at root)
  page-template.html    ← single source of truth
  music/
    music-collections.js
    music-playlist.js
    music-watched.js
    page-template.js
  electronics/ …        ← same shape
  astrology/ …
  test/ …               ← feature-test seeds
```

Each category’s JS config files live in their own `<id>/` folder. The `.html`
page stays at the root and references them with a relative path
(e.g. `music/music-collections.js`, `music/page-template.js`). `app.js` and
`style.css` are shared and stay at the root.
- After editing `page-template.html`, regenerate **all** pages so they stay
  consistent (the `tests.html` feature-test page is regenerated too).
- The tool cannot run `node`; it only produces static files for you to upload.
- Open `tests.html` after generating to confirm the feature suite still passes.
