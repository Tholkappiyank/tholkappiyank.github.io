// ──────────────────────────────────────────────
// STATE
// (COLLECTION_COLORS and DEFAULT_COLLECTIONS come from collections.js.
//  DEFAULT_COLLECTIONS is nested: collection -> groups -> videos.
//  state.collections only stores {id, name, color}; the nested
//  video data is flattened into state.videos by seedData() below.)
// ──────────────────────────────────────────────
// APP_NAME / APP_LABEL / APP_COLOR are defined in a small inline <script>
// block in each app's HTML file (music.html, electronics.html, astrology.html)
// BEFORE this file is loaded. They namespace localStorage + the export-folder
// IndexedDB store per app, and drive the branding (title/logo subtitle).
const STORAGE_KEY = 'tholsstudio_' + (typeof APP_NAME !== 'undefined' ? APP_NAME : 'default');

let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {
  videos: [],
  collections: DEFAULT_COLLECTIONS.map(c => ({ id: c.id, name: c.name, color: c.color })),
  playlists: DEFAULT_PLAYLISTS.map(p => ({ id: p.id, name: p.name, color: p.color, videoIds: [...p.videoIds] })),
  selectedColor: COLLECTION_COLORS[0],
  lastUsedCollection: '',
  lastUsedGroup: '',
  videoOrder: {},
  watchedIds: [],   // YouTube videoId strings of watched videos
  expandedGroups: [],
};

// Ensure older saved states have all fields
if (state.lastUsedCollection === undefined) state.lastUsedCollection = '';
if (state.lastUsedGroup === undefined) state.lastUsedGroup = '';
if (!state.videoOrder) state.videoOrder = {};
if (!state.watchedIds) {
  // Migrate: build watchedIds from existing video.watched flags
  state.watchedIds = state.videos.filter(v => v.watched && v.videoId).map(v => v.videoId);
}
if (!state.playlists) {
  // Migrate: seed from DEFAULT_PLAYLISTS (playlist.js)
  state.playlists = DEFAULT_PLAYLISTS.map(p => ({ id: p.id, name: p.name, color: p.color, videoIds: [...p.videoIds] }));
}
// Give color to any existing playlists created before colors were added
state.playlists.forEach((pl, i) => {
  if (!pl.color) pl.color = COLLECTION_COLORS[i % COLLECTION_COLORS.length];
});
if (!state.expandedGroups) state.expandedGroups = [];

let currentFilter = 'all';
let currentView = 'grid';
let searchQuery = '';
let newGroupColId = null;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ──────────────────────────────────────────────
// YOUTUBE HELPERS
// ──────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      // e.g. https://youtu.be/fjOdtSu4Lm4?list=PLxxxx
      const id = u.pathname.slice(1).split('/')[0];
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2];
        if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return id;
      }
      // e.g. https://www.youtube.com/watch?v=fjOdtSu4Lm4&list=PLxxxx
      const v = u.searchParams.get('v');
      // A real YouTube video id is always exactly 11 chars from this
      // alphabet — validating here (like the youtu.be branch already did)
      // means videoId can never carry HTML/JS-breaking characters forward
      // into anything that renders it later.
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    }
  } catch {}
  // fallback regex — handles v=, youtu.be/, or shorts/ followed by an 11-char ID
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Extracts the playlist ID from a "list=" query param, if present
// (works for both youtube.com/watch?...&list=... and youtu.be/<id>?list=...)
function extractPlaylistId(url) {
  try {
    const u = new URL(url);
    const list = u.searchParams.get('list');
    // Real YouTube playlist ids are alphanumeric/-/_ only, and comfortably
    // under 100 chars — same bound the fallback regex below already used,
    // now applied to this branch too so a crafted "list=" value can't smuggle
    // arbitrary characters through unvalidated.
    if (list && /^[A-Za-z0-9_-]{1,100}$/.test(list)) return list;
  } catch {}
  // fallback regex
  const m = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// videoId/playlistId are validated to a safe charset by extractVideoId()/
// extractPlaylistId() above for anything added through the UI — but videos
// seeded from a *-collections.js file (see seedData()) carry a videoId
// straight from that file, bypassing those checks. escHtml() here means
// these URL-builders are safe to embed in src=/href= regardless of where
// the videoId/playlistId came from, not just the normal add/import path.
function getThumbnail(videoId) {
  return `https://img.youtube.com/vi/${escHtml(videoId)}/mqdefault.jpg`;
}

function getWatchUrl(videoId, playlistId) {
  return playlistId
    ? `https://www.youtube.com/watch?v=${escHtml(videoId)}&list=${escHtml(playlistId)}`
    : `https://www.youtube.com/watch?v=${escHtml(videoId)}`;
}

// Same reasoning as getThumbnail()/getWatchUrl() above — used for the
// iframe fallback in pvPlayIndex().
function getEmbedUrl(videoId) {
  return `https://www.youtube.com/embed/${escHtml(videoId)}?autoplay=1&rel=0&enablejsapi=1`;
}

function isYouTubeUrl(url) {
  return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ──────────────────────────────────────────────
// RENDER SIDEBAR
// ──────────────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('collectionsList');
  list.innerHTML = '';

  state.collections.forEach((col, index) => {
    const count = state.videos.filter(v => v.collection === col.id).length;

    const btn = document.createElement('button');
    btn.className = 'sidebar-item draggable';
    btn.dataset.index = index;
    btn.dataset.colId = col.id;
    btn.dataset.action = 'filter-collection';
    btn.dataset.filter = col.id;
    btn.draggable = true;
    if (currentFilter === col.id) btn.classList.add('active');

    btn.innerHTML = `
      <span class="drag-handle" title="Drag to reorder">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
          <rect x="0" y="0" width="12" height="1.5" rx="1"/>
          <rect x="0" y="4" width="12" height="1.5" rx="1"/>
          <rect x="0" y="8" width="12" height="1.5" rx="1"/>
        </svg>
      </span>
      <span class="collection-dot" style="background:${col.color}"></span>
      <span class="col-name">${escHtml(col.name)}</span>
      <span class="count">${count}</span>
      <span class="col-actions" id="col-actions-${col.id}">
        <button class="col-action-btn" title="Add collection to playlist" data-action="open-collection-playlist-picker" data-id="${escHtml(col.id)}">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button class="col-action-btn" title="Rename" data-action="rename-collection" data-id="${escHtml(col.id)}">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="col-action-btn danger" title="Delete collection" data-action="delete-collection" data-id="${escHtml(col.id)}">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </span>
    `;

    list.appendChild(btn);
  });

  // Drag-and-drop reordering is handled by the shared makeSortable() helper
  makeSortable(list, '.sidebar-item.draggable', {
    dragClass: 'dragging',
    overTopClass: 'drag-over-top',
    overBottomClass: 'drag-over-bottom',
    wasDraggingClass: 'was-dragging',
    stopPropagation: true,
    onDrop: (srcEl, targetEl, position) => {
      const srcIndex = parseInt(srcEl.dataset.index);
      const targetIndex = parseInt(targetEl.dataset.index);
      let insertAt = position === 'top' ? targetIndex : targetIndex + 1;
      const moved = state.collections.splice(srcIndex, 1)[0];
      if (insertAt > srcIndex) insertAt--;
      state.collections.splice(insertAt, 0, moved);
      save();
      renderSidebar();
      renderCards();
      showToast(`↕ "${moved.name}" reordered`);
    },
    onDropToEnd: (srcEl) => {
      const moved = state.collections.splice(parseInt(srcEl.dataset.index), 1)[0];
      state.collections.push(moved);
      save();
      renderSidebar();
      renderCards();
      showToast(`↕ "${moved.name}" moved to bottom`);
    }
  });

  document.getElementById('count-all').textContent = state.videos.length;
  const now = Date.now();
  document.getElementById('count-recent').textContent = state.videos.filter(v => now - v.added < 7*24*3600*1000).length;
  document.getElementById('count-watched').textContent = state.videos.filter(v => v.watched).length;

  // Populate collection selects in modals
  ['addCollection', 'importCollection'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">— No collection —</option>';
    state.collections.forEach(col => {
      sel.innerHTML += `<option value="${col.id}">${col.name}</option>`;
    });
    if (val) sel.value = val;
  });

  renderPlaylistsSidebar();
  renderQuickAddLocation();
}

function renderPlaylistsSidebar() {
  const list = document.getElementById('playlistsList');
  if (!list) return;
  list.innerHTML = '';
  state.playlists.forEach((pl, index) => {
    const isActive = currentFilter === `playlist:${pl.id}`;
    const count = pl.videoIds ? pl.videoIds.filter(id => state.videos.find(v => v.id === id)).length : 0;

    const btn = document.createElement('button');
    btn.className = 'sidebar-item draggable' + (isActive ? ' active' : '');
    btn.dataset.index = index;
    btn.dataset.action = 'filter-playlist-row';
    btn.dataset.filter = `playlist:${pl.id}`;
    btn.draggable = true;
    const dotColor = pl.color || '#78909C';
    btn.innerHTML = `
      <span class="drag-handle" title="Drag to reorder">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor">
          <rect x="0" y="0" width="12" height="1.5" rx="1"/>
          <rect x="0" y="4" width="12" height="1.5" rx="1"/>
          <rect x="0" y="8" width="12" height="1.5" rx="1"/>
        </svg>
      </span>
      <span class="collection-dot" style="background:${dotColor}"></span>
      <span class="col-name">${escHtml(pl.name)}</span>
      <span class="count${count ? '' : ' count-empty'}">${count}</span>
      <span class="col-actions" id="pl-actions-${pl.id}">
        <button class="col-action-btn" data-mousedown-action="stop-propagation" data-action="rename-playlist" data-id="${escHtml(pl.id)}" title="Rename playlist">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="col-action-btn" data-mousedown-action="stop-propagation" data-action="clear-playlist" data-id="${escHtml(pl.id)}" title="Clear all items">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
        <button class="col-action-btn danger" data-mousedown-action="stop-propagation" data-action="delete-playlist" data-id="${escHtml(pl.id)}" title="Delete playlist">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </span>`;

    list.appendChild(btn);
  });

  // Drag-and-drop reordering is handled by the shared makeSortable() helper
  makeSortable(list, '.sidebar-item.draggable', {
    dragClass: 'dragging',
    overTopClass: 'drag-over-top',
    overBottomClass: 'drag-over-bottom',
    wasDraggingClass: 'was-dragging',
    stopPropagation: true,
    onDrop: (srcEl, targetEl, position) => {
      const srcIndex = parseInt(srcEl.dataset.index);
      const targetIndex = parseInt(targetEl.dataset.index);
      let insertAt = position === 'top' ? targetIndex : targetIndex + 1;
      const moved = state.playlists.splice(srcIndex, 1)[0];
      if (insertAt > srcIndex) insertAt--;
      state.playlists.splice(insertAt, 0, moved);
      save();
      renderSidebar();
      showToast(`↕ "${moved.name}" reordered`);
    },
    onDropToEnd: (srcEl) => {
      const moved = state.playlists.splice(parseInt(srcEl.dataset.index), 1)[0];
      state.playlists.push(moved);
      save();
      renderSidebar();
      showToast(`↕ "${moved.name}" moved to bottom`);
    }
  });
}

// ──────────────────────────────────────────────
// QUICK-ADD LOCATION LABEL
// Shows which collection new videos (via quick-add) will be
// saved to — based on the last collection used in Add Video / Import.
// ──────────────────────────────────────────────
function renderQuickAddLocation() {
  const textEl = document.getElementById('quickAddLocationText');
  const dotEl = document.getElementById('quickAddLocationDot');
  if (!textEl || !dotEl) return;

  const colId = state.lastUsedCollection || '';
  const col = state.collections.find(c => c.id === colId);
  const group = state.lastUsedGroup || '';

  if (col) {
    const path = group ? `${col.name}/${group}` : col.name;
    textEl.textContent = `Saving to: ${path}`;
    dotEl.style.background = col.color;
  } else {
    const path = group ? `Uncollected/${group}` : 'Uncollected';
    textEl.textContent = `Saving to: ${path}`;
    dotEl.style.background = 'var(--text-dim)';
  }
}

// ── Collection rename (inline) ──
function startRename(e, colId) {
  e.stopPropagation();
  const col = state.collections.find(c => c.id === colId);
  if (!col) return;

  // Find the sidebar item button
  const btn = document.querySelector(`[data-col-id="${colId}"]`);
  if (!btn) return;

  // Hide normal content, inject rename UI
  btn.innerHTML = `
    <span class="collection-dot" style="background:${col.color};flex-shrink:0;"></span>
    <span class="col-rename-wrap">
      <input class="col-rename-input" id="rename-input-${colId}"
        value="${escHtml(col.name)}"
        maxlength="40">
      <button class="col-rename-confirm" id="rename-confirm-${colId}">✓</button>
    </span>
  `;
  // Prevent dragging while renaming
  btn.draggable = false;

  const input = document.getElementById(`rename-input-${colId}`);
  input.addEventListener('keydown', (e) => handleRenameKey(e, colId));
  input.addEventListener('blur', () => cancelRename(colId));
  document.getElementById(`rename-confirm-${colId}`).addEventListener('mousedown', (e) => confirmRename(e, colId));
  input.focus();
  input.select();
}

function handleRenameKey(e, colId) {
  if (e.key === 'Enter') { e.preventDefault(); confirmRename(e, colId); }
  if (e.key === 'Escape') { cancelRename(colId); }
}

function confirmRename(e, colId) {
  e.stopPropagation?.();
  const input = document.getElementById(`rename-input-${colId}`);
  const newName = input ? input.value.trim() : '';
  if (!newName) { cancelRename(colId); return; }

  const col = state.collections.find(c => c.id === colId);
  if (col) {
    const old = col.name;
    col.name = newName;
    save();
    renderSidebar();
    renderCards();
    showToast(`✓ Renamed "${old}" → "${newName}"`);
  }
}

function cancelRename(colId) {
  // Just re-render — restores original state
  renderSidebar();
}

// ── Collection delete ──

// ── Playlist rename (same inline pattern as collection rename) ──
function startPlaylistRename(e, plId) {
  e.stopPropagation();
  const pl = state.playlists.find(p => p.id === plId);
  if (!pl) return;

  // Find the sidebar button by its actions span id
  const actionsSpan = document.getElementById(`pl-actions-${plId}`);
  const btn = actionsSpan ? actionsSpan.closest('.sidebar-item') : null;
  if (!btn) return;

  btn.innerHTML = `
    <span class="collection-dot" style="background:${pl.color || '#78909C'};flex-shrink:0;"></span>
    <span class="col-rename-wrap">
      <input class="col-rename-input" id="pl-rename-input-${plId}"
        value="${escHtml(pl.name)}"
        maxlength="40">
      <button class="col-rename-confirm" id="pl-rename-confirm-${plId}">✓</button>
    </span>
  `;

  const input = document.getElementById(`pl-rename-input-${plId}`);
  input.addEventListener('keydown', (e) => handlePlaylistRenameKey(e, plId));
  input.addEventListener('blur', () => cancelPlaylistRename(plId));
  document.getElementById(`pl-rename-confirm-${plId}`).addEventListener('mousedown', (e) => confirmPlaylistRename(e, plId));
  input.focus();
  input.select();
}

function handlePlaylistRenameKey(e, plId) {
  if (e.key === 'Enter') { e.preventDefault(); confirmPlaylistRename(e, plId); }
  if (e.key === 'Escape') { cancelPlaylistRename(plId); }
}

function confirmPlaylistRename(e, plId) {
  e.stopPropagation?.();
  const input = document.getElementById(`pl-rename-input-${plId}`);
  const newName = input ? input.value.trim() : '';
  if (!newName) { cancelPlaylistRename(plId); return; }

  const pl = state.playlists.find(p => p.id === plId);
  if (pl) {
    const old = pl.name;
    pl.name = newName;
    save();
    renderSidebar();
    showToast(`✓ Renamed "${old}" → "${newName}"`);
  }
}

function cancelPlaylistRename(plId) {
  renderSidebar();
}

function deleteCollection(e, colId) {
  e.stopPropagation();
  const col = state.collections.find(c => c.id === colId);
  if (!col) return;
  const count = state.videos.filter(v => v.collection === colId).length;
  const msg = count > 0
    ? `"${col.name}" and its ${count} video${count !== 1 ? 's' : ''} will be permanently deleted.`
    : `"${col.name}" will be permanently deleted.`;
  showConfirm('Delete Collection', msg, 'Delete', () => {
    state.videos = state.videos.filter(v => v.collection !== colId);
    state.collections = state.collections.filter(c => c.id !== colId);
    if (currentFilter === colId) currentFilter = 'all';
    save(); renderSidebar(); renderCards();
    showToast(`✓ "${col.name}" deleted`);
  });
}

function getGroupsForCollection(colId) {
  if (!colId) return [];
  const fromVideos = new Set(
    state.videos
      .filter(v => v.collection === colId && v.group && v.group.trim())
      .map(v => v.group.trim())
  );
  const fromPending = state.pendingGroups?.[colId] || [];
  fromPending.forEach(g => fromVideos.add(g));
  return [...fromVideos].sort();
}

function refreshGroupSelect(collectionSelectId, groupSelectId) {
  const colId = document.getElementById(collectionSelectId)?.value;
  const sel = document.getElementById(groupSelectId);
  if (!sel) return;
  const groups = getGroupsForCollection(colId);
  sel.innerHTML = '<option value="">— No group —</option>';
  groups.forEach(g => { sel.innerHTML += `<option value="${g}">${g}</option>`; });
}

// ──────────────────────────────────────────────
// RENDER CARDS (GROUPED)
// ──────────────────────────────────────────────
function getFilteredVideos() {
  let vids = [...state.videos];
  const now = Date.now();

  if (currentFilter === 'all') { /* all */ }
  else if (currentFilter === 'recent') { vids = vids.filter(v => now - v.added < 7*24*3600*1000); }
  else if (currentFilter === 'watched') { vids = vids.filter(v => v.watched); }
  else { vids = vids.filter(v => v.collection === currentFilter); }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    vids = vids.filter(v =>
      (v.title||'').toLowerCase().includes(q) ||
      (v.channel||'').toLowerCase().includes(q) ||
      (v.note||'').toLowerCase().includes(q) ||
      (v.group||'').toLowerCase().includes(q) ||
      (v.url||'').toLowerCase().includes(q)
    );
  }

  return vids.sort((a, b) => b.added - a.added);
}

function renderCards() {
  const grid = document.getElementById('cardsGrid');
  const vids = getFilteredVideos();

  grid.className = 'cards-grid-container';

  document.getElementById('sectionCount').textContent = `${vids.length} video${vids.length !== 1 ? 's' : ''}`;

  if (vids.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
        </svg>
        <p>No videos here yet. Paste a YouTube URL above or click <strong>Add Video</strong> to get started.</p>
      </div>`;
    return;
  }

  // Build grouped structure
  // For a specific collection view: group by video.group
  // For all/recent/watched: group by collection first, then by group within
  let html = '';

  if (currentFilter !== 'all' && currentFilter !== 'recent' && currentFilter !== 'watched') {
    // Single collection view — group by video.group
    const col = state.collections.find(c => c.id === currentFilter);
    const colColor = col ? col.color : 'var(--indigo)';
    html += renderGroupedByTitle(vids, currentFilter, colColor);
  } else {
    // Multi-collection view: iterate in sidebar order so drag-reorder is reflected here too
    // Watched view renders all groups expanded so items are immediately visible
    const expanded = currentFilter === 'watched';
    const vidColIds = new Set(vids.map(v => v.collection || '__none__'));
    let isFirstBlock = true;

    // Render in sidebar (state.collections) order
    state.collections.forEach(col => {
      if (!vidColIds.has(col.id)) return;
      const colVids = vids.filter(v => v.collection === col.id);
      if (!colVids.length) return;
      html += buildCollectionBlock(col.id, col.name, col.color, colVids, isFirstBlock, expanded);
      isFirstBlock = false;
    });

    // Uncollected always last
    if (vidColIds.has('__none__')) {
      const uncollected = vids.filter(v => !v.collection);
      if (uncollected.length) {
        html += buildCollectionBlock('__none__', 'Uncollected', 'var(--text-dim)', uncollected, isFirstBlock, expanded);
      }
    }
  }

  grid.innerHTML = html;
  attachCardDrag();
}

function buildCollectionBlock(colId, colName, colColor, colVids, isFirst, expanded = false) {
  const dividerStyle = isFirst
    ? 'margin-bottom:12px;'
    : 'margin-bottom:12px; padding-top:14px; margin-top:2px; border-top:1px solid var(--border-subtle);';
  const colKey = `col-${colId}`;
  const isExpanded = expanded || state.expandedGroups.includes(colKey);
  const chevClass = isExpanded ? 'group-chevron chev-up' : 'group-chevron collapsed';
  const bodyClass = isExpanded ? 'group-body' : 'group-body collapsed';
  let html = `<div class="group-section" style="${dividerStyle}">`;
  html += `<div class="group-header group-header--collection" data-action="toggle-group" data-key="${colKey}">
    <span class="${chevClass}" id="chev-${colKey}">
      <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
    </span>
    <span class="collection-dot" style="background:${colColor};width:9px;height:9px;border-radius:50%;flex-shrink:0;"></span>
    <span class="group-title" style="color:${colColor};">${escHtml(colName)}</span>
    <span class="group-count">${colVids.length}</span>
    <div class="group-header-line group-header-line--collection"></div>
  </div>`;
  html += `<div class="${bodyClass}" id="group-col-${colId}">`;
  html += renderGroupedByTitle(colVids, colId, colColor, true, expanded);
  html += `</div></div>`;
  return html;
}

function renderGroupedByTitle(vids, colId, colColor, nested = false, expanded = false) {
  // Separate grouped vs ungrouped
  const grouped = {};
  const ungrouped = [];

  vids.forEach(v => {
    const g = (v.group || '').trim();
    if (g) {
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(v);
    } else {
      ungrouped.push(v);
    }
  });

  // Show empty pending groups so they appear even with 0 videos
  if (!nested && state.pendingGroups?.[colId]) {
    state.pendingGroups[colId].forEach(gName => {
      if (!grouped[gName]) grouped[gName] = [];
    });
  }

  const groupNames = Object.keys(grouped).sort();
  let html = '';

  groupNames.forEach(gName => {
    let gVids = grouped[gName];
    const orderKey = `${colId}__${gName}`.replace(/[^a-z0-9_]/gi, '_');
    const savedOrder = state.videoOrder[orderKey];
    if (savedOrder && savedOrder.length) {
      const orderMap = new Map(savedOrder.map((id, i) => [id, i]));
      gVids = [...gVids].sort((a, b) => {
        const ai = orderMap.has(a.id) ? orderMap.get(a.id) : 9999;
        const bi = orderMap.has(b.id) ? orderMap.get(b.id) : 9999;
        return ai - bi;
      });
    }
    const gKey = `${colId}__${gName}`.replace(/[^a-z0-9_]/gi, '_');
    const gIsExpanded = expanded || state.expandedGroups.includes(gKey);
    const gChevClass = gIsExpanded ? 'group-chevron chev-up' : 'group-chevron collapsed';
    const gBodyClass = gIsExpanded ? 'group-body' : 'group-body collapsed';
    html += `<div class="group-section">
      <div class="group-header" data-action="toggle-group" data-key="${gKey}">
        <span class="${gChevClass}" id="chev-${gKey}">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
        <div class="group-title-wrap">
          <div class="group-title-row">
            <span class="group-title">${escHtml(gName)}</span>
            <span class="group-count">${gVids.length}</span>
            <div class="group-header-line"></div>
          </div>
          <div class="group-header-actions">
            <button class="group-action-btn" data-action="open-group-playlist-picker" data-col-id="${escHtml(colId)}" data-group="${escHtml(gName)}" title="Add group to playlist">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button class="group-action-btn" data-action="rename-group" data-col-id="${escHtml(colId)}" data-group="${escHtml(gName)}" title="Rename group">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="group-action-btn danger" data-action="delete-group" data-col-id="${escHtml(colId)}" data-group="${escHtml(gName)}" title="Delete group">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="${gBodyClass}" id="group-${gKey}">
        <div class="cards-grid${currentView === 'list' ? ' list-view' : ''}">
          ${gVids.map(v => renderCard(v)).join('')}
        </div>
      </div>
    </div>`;
  });

  // Ungrouped videos
  if (ungrouped.length > 0) {
    const ugKey = `${colId}__`.replace(/[^a-z0-9_]/gi, '_');
    const ugOrder = state.videoOrder[ugKey];
    if (ugOrder && ugOrder.length) {
      const ugMap = new Map(ugOrder.map((id, i) => [id, i]));
      ungrouped.sort((a, b) => {
        const ai = ugMap.has(a.id) ? ugMap.get(a.id) : 9999;
        const bi = ugMap.has(b.id) ? ugMap.get(b.id) : 9999;
        return ai - bi;
      });
    }
    if (groupNames.length > 0) {
      html += `<div class="ungrouped-label">Ungrouped</div>`;
    }
    html += `<div class="cards-grid${currentView === 'list' ? ' list-view' : ''}">
      ${ungrouped.map(v => renderCard(v)).join('')}
    </div>`;
  }

  // Add new group button (only in single-collection view)
  if (!nested) {
    html += `<div class="add-group-row" id="addGroupRow-${colId}">
      <button class="add-collection-btn" data-action="open-group-modal" data-col-id="${escHtml(colId)}">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New group
      </button>
    </div>`;
  }

  return html;
}

function renderCard(v) {
  const col = state.collections.find(c => c.id === v.collection);
  // In single-collection view, don't show the collection tag — group header handles it
  const showColTag = currentFilter === 'all' || currentFilter === 'recent' || currentFilter === 'watched';
  // Build breadcrumb: Collection / Group
  const colPath = col ? (v.group ? `${col.name} / ${v.group}` : col.name) : (v.collection ? '' : (v.group ? v.group : ''));
  const colTag = (showColTag && colPath) ? `<span class="card-collection-tag" title="${escHtml(colPath)}"><span class="tag-dot" style="background:${col ? col.color : 'var(--text-dim)'}"></span>${escHtml(colPath)}</span>` : '';
  const noteHtml = v.note ? `<div class="card-note" id="note-text-${v.id}">${escHtml(v.note)}</div>` : '';
  const watchedStyle = v.watched ? 'opacity:0.6;' : '';

  return `
<div class="video-card${currentView === 'list' ? ' list-view' : ''}" id="card-${v.id}" style="${watchedStyle}">
  <div class="card-thumb">
    <img src="${getThumbnail(v.videoId)}" alt="" loading="lazy" data-action="thumb-error">
    <div class="card-thumb-placeholder" style="display:none;">
      <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.3">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
      </svg>
    </div>
    <div class="card-play-overlay">
      <a href="${getWatchUrl(v.videoId, v.playlistId)}" target="_blank" class="play-btn" data-action="mark-watched" data-id="${escHtml(v.id)}">
        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </a>
    </div>
  </div>
  <div class="card-body">
    ${colTag}
    <div class="card-title-row">
      <div class="card-title" id="title-${v.id}" data-action="start-title-edit" data-id="${escHtml(v.id)}" title="Click to edit title">${escHtml(v.title || 'Untitled Video')}</div>
      <button class="card-title-edit-btn" data-mousedown-action="start-title-edit-btn" data-id="${escHtml(v.id)}" title="Edit title">
        <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>
    ${v.channel ? `<div class="card-channel">${escHtml(v.channel)}</div>` : ''}
    ${noteHtml}
    <textarea class="note-edit" id="note-edit-${v.id}" rows="2" placeholder="Add a note…" data-action="save-note" data-id="${escHtml(v.id)}">${escHtml(v.note||'')}</textarea>
    <div class="card-meta">
      <div class="card-actions">
        <button class="card-action-btn" data-action="open-move-group-modal" data-id="${escHtml(v.id)}" title="Move to group">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </button>
        <button class="card-action-btn" data-action="toggle-note" data-id="${escHtml(v.id)}" title="Edit note">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="card-action-btn" data-action="copy-url" data-id="${escHtml(v.id)}" title="Copy URL">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        <button class="card-action-btn" data-action="toggle-watched" data-id="${escHtml(v.id)}" title="${v.watched ? 'Mark unwatched' : 'Mark watched'}">
          <svg width="12" height="12" fill="${v.watched ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="card-action-btn" data-action="open-playlist-picker" data-id="${escHtml(v.id)}" title="Add to playlist">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
        <button class="card-action-btn danger" data-action="delete-video" data-id="${escHtml(v.id)}" title="Delete video">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
      <span class="card-date">${formatDate(v.added)}</span>
    </div>
  </div>
</div>`;
}

// ──────────────────────────────────────────────
// GROUP INTERACTIONS
// ──────────────────────────────────────────────
function toggleGroup(key) {
  const body = document.getElementById(`group-${key}`);
  const chev = document.getElementById(`chev-${key}`);
  if (!body) return;
  body.classList.toggle('collapsed');
  chev?.classList.toggle('collapsed');
  const idx = state.expandedGroups.indexOf(key);
  if (idx === -1) {
    state.expandedGroups.push(key);
  } else {
    state.expandedGroups.splice(idx, 1);
  }
  save();
}

function openGroupModal(colId) {
  newGroupColId = colId;
  document.getElementById('groupName').value = '';
  openModal('groupModal');
  setTimeout(() => document.getElementById('groupName')?.focus(), 100);
}

function saveGroup() {
  const name = document.getElementById('groupName').value.trim();
  if (!name) { showToast('⚠️ Enter a group name'); return; }
  if (!state.pendingGroups) state.pendingGroups = {};
  if (!state.pendingGroups[newGroupColId]) state.pendingGroups[newGroupColId] = [];
  if (state.pendingGroups[newGroupColId].includes(name)) {
    showToast('⚠️ Group already exists'); return;
  }
  state.pendingGroups[newGroupColId].push(name);
  save();
  closeModal('groupModal');
  renderCards();
  showToast(`✓ Group "${name}" created`);
}

function renameGroupPrompt(colId, oldName) {
  const newName = prompt(`Rename group "${oldName}" to:`, oldName);
  if (!newName || newName.trim() === oldName) return;
  state.videos.forEach(v => {
    if (v.collection === colId && v.group === oldName) v.group = newName.trim();
  });
  if (state.pendingGroups?.[colId]) {
    const idx = state.pendingGroups[colId].indexOf(oldName);
    if (idx >= 0) state.pendingGroups[colId][idx] = newName.trim();
  }
  save(); renderCards(); refreshGroupSelect('addCollection','addGroup');
  showToast(`✓ Renamed to "${newName.trim()}"`);
}

function deleteGroupPrompt(colId, groupName) {
  const count = state.videos.filter(v => v.collection === colId && v.group === groupName).length;
  const msg = count > 0
    ? `"${groupName}" and its ${count} video${count !== 1 ? 's' : ''} will be permanently deleted.`
    : `"${groupName}" will be permanently deleted.`;
  showConfirm('Delete Group', msg, 'Delete', () => {
    state.videos = state.videos.filter(v => !(v.collection === colId && v.group === groupName));
    if (state.pendingGroups?.[colId]) {
      state.pendingGroups[colId] = state.pendingGroups[colId].filter(g => g !== groupName);
    }
    save(); renderSidebar(); renderCards();
    showToast(`✓ Group "${groupName}" deleted`);
  });
}

// Move-to-group modal
let moveGroupVideoId = null;
function openMoveGroupModal(videoId) {
  moveGroupVideoId = videoId;
  const v = state.videos.find(v => v.id === videoId);
  if (!v) return;
  const colId = v.collection;
  const groups = getGroupsForCollection(colId);
  const pending = state.pendingGroups?.[colId] || [];
  const allGroups = [...new Set([...groups, ...pending])].sort();

  const sel = document.getElementById('moveGroupSelect');
  sel.innerHTML = '<option value="">— No group (ungrouped) —</option>';
  allGroups.forEach(g => {
    sel.innerHTML += `<option value="${g}"${g === v.group ? ' selected' : ''}>${g}</option>`;
  });
  document.getElementById('moveGroupNewInput').value = '';
  document.getElementById('moveGroupVideoTitle').textContent = v.title || 'Untitled';
  openModal('moveGroupModal');
}

function saveMoveGroup() {
  const v = state.videos.find(v => v.id === moveGroupVideoId);
  if (!v) return;
  const newGroupInput = document.getElementById('moveGroupNewInput').value.trim();
  const selected = document.getElementById('moveGroupSelect').value;
  const finalGroup = newGroupInput || selected;
  v.group = finalGroup;
  if (finalGroup && v.collection) {
    if (!state.pendingGroups) state.pendingGroups = {};
    if (!state.pendingGroups[v.collection]) state.pendingGroups[v.collection] = [];
    if (!state.pendingGroups[v.collection].includes(finalGroup))
      state.pendingGroups[v.collection].push(finalGroup);
  }
  save(); closeModal('moveGroupModal'); renderCards();
  showToast(`✓ Moved to ${finalGroup ? `"${finalGroup}"` : 'ungrouped'}`);
}

function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// escAttr() used to live here — it escaped a value for use as a single-quoted
// JS string argument inside a double-quoted onclick="..."-style attribute.
// Now that nothing in this file builds markup that way (see EVENT WIRING,
// near the bottom of this file), there's no longer a context that function's
// escaping rules were even for, so it's been removed rather than kept
// around unused.

// ──────────────────────────────────────────────
// ACTIONS
// ──────────────────────────────────────────────
function filterByCollection(id, btn) {
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (id.startsWith('playlist:')) {
    // Open the immersive split-view instead of normal card rendering
    const plId = id.slice(9);
    openPlaylistView(plId);
    return;
  }

  // Normal view — make sure split-view is hidden
  closePvView(false);

  currentFilter = id;
  const titles = { all: 'All Videos', recent: 'Recently Added', watched: 'Watched' };
  document.getElementById('sectionTitle').textContent = titles[id] || (state.collections.find(c => c.id === id)?.name || 'Collection');
  renderCards();
}

function setView(v) {
  currentView = v;
  document.getElementById('gridBtn').classList.toggle('active', v === 'grid');
  document.getElementById('listBtn').classList.toggle('active', v === 'list');
  renderCards();
}

function handleSearch() {
  searchQuery = document.getElementById('searchInput').value;
  renderCards();
}

async function quickAdd() {
  const input = document.getElementById('quickAddInput');
  const url = input.value.trim();
  if (!url || !isYouTubeUrl(url)) {
    showToast('⚠️ Please paste a valid YouTube URL');
    return;
  }
  const videoId = extractVideoId(url);
  if (!videoId) { showToast('⚠️ Could not extract video ID'); return; }
  const playlistId = extractPlaylistId(url);

  const colId = state.lastUsedCollection || '';
  const col = state.collections.find(c => c.id === colId);
  const group = state.lastUsedGroup || '';

  const existing = state.videos.find(v => v.videoId === videoId);
  if (existing) {
    const existingCol = state.collections.find(c => c.id === existing.collection);
    const location = existingCol ? (existing.group ? `${existingCol.name} / ${existing.group}` : existingCol.name) : (existing.group || 'Uncollected');
    const title = existing.title || 'Untitled';
    showConfirm('Duplicate Found', `"${title}" already exists in "${location}".`, 'OK', null);
    return;
  }

  addVideo({ url, videoId, playlistId, title: '', channel: '', note: '', collection: colId, group, added: Date.now(), watched: false, id: generateId() });
  input.value = '';
  const path = col ? (group ? `${col.name}/${group}` : col.name) : (group ? `Uncollected/${group}` : 'Uncollected');
  showToast(`✓ Saved to ${path}`);
}

function addVideo(video) {
  state.videos.unshift(video);
  save();
  renderSidebar();
  renderCards();
  // Auto-fetch title if missing (uses noembed.com — no API key needed)
  if (!video.title && video.videoId) {
    fetchVideoTitle(video.id, video.videoId);
  }
}

async function fetchVideoTitle(internalId, youtubeVideoId) {
  try {
    const url = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeVideoId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.title) {
      const v = state.videos.find(v => v.id === internalId);
      if (v) {
        v.title = data.title;
        if (data.author_name) v.channel = data.author_name;
        save();
        // Update the title in DOM without full re-render
        const titleEl = document.getElementById('title-' + internalId);
        if (titleEl && !titleEl.querySelector('input')) {
          titleEl.textContent = v.title;
        }
        // Update channel in DOM if visible
        const cardEl = document.getElementById('card-' + internalId);
        if (cardEl && v.channel) {
          const chEl = cardEl.querySelector('.card-channel');
          if (chEl) chEl.textContent = v.channel;
        }
      }
    }
  } catch (e) {
    // Silent fail — user can edit title manually
  }
}

function deleteVideo(id) {
  state.videos = state.videos.filter(v => v.id !== id);
  save();
  renderSidebar();
  renderCards();
  showToast('Removed from vault');
}

function toggleWatched(id) {
  const v = state.videos.find(v => v.id === id);
  if (v) {
    v.watched = !v.watched;
    if (v.videoId) {
      if (v.watched && !state.watchedIds.includes(v.videoId)) {
        state.watchedIds.push(v.videoId);
      } else if (!v.watched) {
        state.watchedIds = state.watchedIds.filter(wid => wid !== v.videoId);
      }
    }
    save(); renderSidebar(); renderCards();
  }
}

function markWatched(id) {
  const v = state.videos.find(v => v.id === id);
  if (v && !v.watched) {
    v.watched = true;
    if (v.videoId && !state.watchedIds.includes(v.videoId)) state.watchedIds.push(v.videoId);
    save(); renderSidebar();
  }
}

function startTitleEdit(id) {
  const titleEl = document.getElementById('title-' + id);
  if (!titleEl || titleEl.querySelector('input')) return; // already editing
  const v = state.videos.find(v => v.id === id);
  if (!v) return;
  const current = v.title || '';
  const input = document.createElement('input');
  input.className = 'title-edit-input';
  input.value = current;
  input.placeholder = 'Enter title…';
  input.maxLength = 200;
  titleEl.innerHTML = '';
  titleEl.appendChild(input);
  input.focus();
  input.select();
  let saved = false;
  const commitTitle = () => {
    if (saved) return;
    saved = true;
    const newTitle = input.value.trim();
    v.title = newTitle || v.title;
    save();
    titleEl.innerHTML = escHtml(v.title || 'Untitled Video');
    if (document.getElementById('pvTracks')) pvRenderList();
  };
  input.addEventListener('blur', commitTitle);
  input.addEventListener('click', e => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitTitle(); input.blur(); }
    if (e.key === 'Escape') { saved = true; titleEl.innerHTML = escHtml(v.title || 'Untitled Video'); }
  });
}

function toggleNote(id) {
  const ta = document.getElementById(`note-edit-${id}`);
  const nt = document.getElementById(`note-text-${id}`);
  if (ta) {
    const visible = ta.classList.contains('visible');
    ta.classList.toggle('visible', !visible);
    if (!visible) { ta.focus(); if(nt) nt.style.display='none'; }
    else if(nt) nt.style.display='';
  }
}

function saveNote(id, value) {
  const v = state.videos.find(v => v.id === id);
  if (!v) return;
  v.note = value.trim();
  save();

  const ta = document.getElementById('note-edit-' + id);
  let nt = document.getElementById('note-text-' + id);

  if (v.note) {
    if (!nt) {
      // Create the note-text element and insert it before the textarea
      nt = document.createElement('div');
      nt.className = 'card-note';
      nt.id = 'note-text-' + id;
      if (ta) ta.parentNode.insertBefore(nt, ta);
    }
    nt.textContent = v.note;
    nt.style.display = '';
  } else if (nt) {
    // Empty note — hide the display element
    nt.style.display = 'none';
  }

  // Hide the textarea
  if (ta) ta.classList.remove('visible');
}

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => showToast('✓ URL copied to clipboard'));
}

// ──────────────────────────────────────────────
// ADD MODAL
// ──────────────────────────────────────────────
function openAddModal() {
  document.getElementById('addUrl').value = '';
  document.getElementById('addTitle').value = '';
  document.getElementById('addNote').value = '';
  document.getElementById('addGroupNew').value = '';
  // Pre-select current collection if viewing one, otherwise fall back to the last-used collection
  const colSel = document.getElementById('addCollection');
  const groupSel = document.getElementById('addGroup');
  if (currentFilter !== 'all' && currentFilter !== 'recent' && currentFilter !== 'watched') {
    colSel.value = currentFilter;
    refreshGroupSelect('addCollection', 'addGroup');
    // If the last-used group exists in this collection, pre-select it too
    if (state.lastUsedGroup && [...groupSel.options].some(o => o.value === state.lastUsedGroup)) {
      groupSel.value = state.lastUsedGroup;
    }
  } else if (state.lastUsedCollection && state.collections.some(c => c.id === state.lastUsedCollection)) {
    colSel.value = state.lastUsedCollection;
    refreshGroupSelect('addCollection', 'addGroup');
    if (state.lastUsedGroup && [...groupSel.options].some(o => o.value === state.lastUsedGroup)) {
      groupSel.value = state.lastUsedGroup;
    }
  } else {
    colSel.value = '';
    groupSel.innerHTML = '<option value="">— No group —</option>';
  }
  checkAddDuplicate();
  openModal('addModal');
}

function previewUrl() {
  const url = document.getElementById('addUrl').value.trim();
  const videoId = extractVideoId(url);
  if (videoId) {
    const titleInput = document.getElementById('addTitle');
    if (!titleInput.value) titleInput.placeholder = `YouTube video (${videoId})`;
  }
}

// Live validation for the Add Video modal — runs on every keystroke/change
// of the URL, collection, and group fields. Turns the URL field's outline
// green once it's a recognized YouTube link that isn't already saved, red
// if the link can't be parsed or is a duplicate of an existing video, and
// leaves it neutral while the field is empty. Also toggles the inline
// "Duplicate" message and disables/reddens the Save button on duplicates.
// Returns the matching existing video (or null) so saveVideo() can reuse it.
function checkAddDuplicate() {
  const urlInput = document.getElementById('addUrl');
  const msgEl = document.getElementById('addUrlDuplicateMsg');
  const btn = document.getElementById('saveVideoBtn');
  if (!urlInput || !msgEl || !btn) return null;

  const url = urlInput.value.trim();
  const videoId = extractVideoId(url);

  // Check against the WHOLE saved vault (all collections/groups), not just
  // the collection/group currently selected in this modal — a video already
  // saved anywhere counts as "already in the collections".
  const existing = videoId
    ? state.videos.find(v => v.videoId === videoId)
    : null;

  // Reset both states before deciding which (if any) applies
  urlInput.classList.remove('field-invalid', 'field-valid');

  if (!url) {
    // Empty field — neutral, no message, Save enabled (native check catches empty on submit)
    msgEl.style.display = 'none';
    btn.disabled = false;
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
    return null;
  }

  if (existing) {
    // Valid YouTube link, but already saved somewhere in the vault
    const existingCol = state.collections.find(c => c.id === existing.collection);
    const where = existingCol
      ? (existing.group ? `${existingCol.name} / ${existing.group}` : existingCol.name)
      : (existing.group || 'Uncollected');
    msgEl.textContent = `Already saved — in "${where}"`;
    msgEl.style.display = '';
    urlInput.classList.add('field-invalid');
    btn.disabled = true;
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-danger');
  } else if (!isYouTubeUrl(url) || !videoId) {
    // Not a recognizable YouTube URL
    msgEl.style.display = 'none';
    urlInput.classList.add('field-invalid');
    btn.disabled = false;
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
  } else {
    // Valid YouTube URL, not a duplicate anywhere in the vault
    msgEl.style.display = 'none';
    urlInput.classList.add('field-valid');
    btn.disabled = false;
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
  }
  return existing || null;
}

function saveVideo() {
  const url = document.getElementById('addUrl').value.trim();
  if (!url || !isYouTubeUrl(url)) { showToast('⚠️ Enter a valid YouTube URL'); return; }
  const videoId = extractVideoId(url);
  if (!videoId) { showToast('⚠️ Could not parse video ID'); return; }
  const playlistId = extractPlaylistId(url);

  const colId = document.getElementById('addCollection').value;
  const groupNew = document.getElementById('addGroupNew').value.trim();
  const groupSel = document.getElementById('addGroup').value;
  const group = groupNew || groupSel;

  // Safety net — the Save button is disabled while a duplicate is detected,
  // but re-check here in case this was reached another way (e.g. Enter key).
  if (checkAddDuplicate()) return;

  doSaveVideo(url, videoId, playlistId, colId, group);
}

function doSaveVideo(url, videoId, playlistId, colId, group) {
  if (group && colId) {
    if (!state.pendingGroups) state.pendingGroups = {};
    if (!state.pendingGroups[colId]) state.pendingGroups[colId] = [];
    if (!state.pendingGroups[colId].includes(group)) state.pendingGroups[colId].push(group);
  }

  addVideo({
    id: generateId(),
    url, videoId, playlistId,
    title: document.getElementById('addTitle').value.trim() || `YouTube Video`,
    channel: '',
    note: document.getElementById('addNote').value.trim(),
    collection: colId,
    group,
    added: Date.now(),
    watched: false,
  });

  state.lastUsedCollection = colId;
  state.lastUsedGroup = group || '';
  save();
  renderQuickAddLocation();

  closeModal('addModal');
  showToast('✓ Saved to vault');
}

// ──────────────────────────────────────────────
// COLLECTION MODAL
// ──────────────────────────────────────────────
function openCollectionModal() {
  document.getElementById('collectionName').value = '';
  state.selectedColor = COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)];
  renderColorPicker();
  openModal('collectionModal');
}

function startNewCollection() {
  openCollectionModal();
}

function renderColorPicker() {
  const cp = document.getElementById('colorPicker');
  cp.innerHTML = COLLECTION_COLORS.map(c => `
    <div class="color-chip ${c === state.selectedColor ? 'selected' : ''}"
      style="background:${c}"
      data-action="select-color" data-target="collection" data-color="${c}"></div>
  `).join('');
}

function selectColor(c) {
  state.selectedColor = c;
  renderColorPicker();
}

// Generates a URL/JS-safe id from a collection name (e.g. "Game Design" -> "game-design"),
// ensuring it doesn't collide with an existing collection id.
function slugifyCollectionName(name) {
  let base = name.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // non-alphanumeric -> hyphen
    .replace(/^-+|-+$/g, '');      // trim leading/trailing hyphens
  if (!base) base = 'collection';

  let id = base;
  let n = 2;
  while (state.collections.some(c => c.id === id)) {
    id = `${base}-${n}`;
    n++;
  }
  return id;
}

function saveCollection() {
  const name = document.getElementById('collectionName').value.trim();
  if (!name) { showToast('⚠️ Enter a collection name'); return; }
  state.collections.push({ id: slugifyCollectionName(name), name, color: state.selectedColor });
  save();
  closeModal('collectionModal');
  renderSidebar();
  showToast(`✓ "${name}" created`);
}

// ──────────────────────────────────────────────
// IMPORT MODAL
// ──────────────────────────────────────────────
function openImportModal() {
  document.getElementById('importText').value = '';
  const colSel = document.getElementById('importCollection');
  const groupSel = document.getElementById('importGroup');
  if (state.lastUsedCollection && state.collections.some(c => c.id === state.lastUsedCollection)) {
    colSel.value = state.lastUsedCollection;
    refreshGroupSelect('importCollection', 'importGroup');
    if (state.lastUsedGroup && [...groupSel.options].some(o => o.value === state.lastUsedGroup)) {
      groupSel.value = state.lastUsedGroup;
    }
  } else {
    colSel.value = '';
    groupSel.innerHTML = '<option value="">— No group —</option>';
  }
  openModal('importModal');
}

function importUrls() {
  const text = document.getElementById('importText').value;
  const collection = document.getElementById('importCollection').value;
  const groupNew = document.getElementById('importGroupNew').value.trim();
  const groupSel = document.getElementById('importGroup').value;
  const group = groupNew || groupSel;

  if (group && collection) {
    if (!state.pendingGroups) state.pendingGroups = {};
    if (!state.pendingGroups[collection]) state.pendingGroups[collection] = [];
    if (!state.pendingGroups[collection].includes(group)) state.pendingGroups[collection].push(group);
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => isYouTubeUrl(l));
  let count = 0;
  lines.forEach(url => {
    const videoId = extractVideoId(url);
    if (videoId) {
      const playlistId = extractPlaylistId(url);
      state.videos.unshift({ id: generateId(), url, videoId, playlistId, title: '', channel: '', note: '', collection, group, added: Date.now(), watched: false });
      count++;
    }
  });
  if (count) {
    // Remember this collection + group so quick-add (and the location label) use it next time
    state.lastUsedCollection = collection;
    state.lastUsedGroup = group || '';
    save(); renderSidebar(); renderCards();
    closeModal('importModal');
    showToast(`✓ Imported ${count} video${count !== 1 ? 's' : ''}${group ? ` into "${group}"` : ''}`);
  } else {
    showToast('⚠️ No valid YouTube URLs found');
  }
}

// ──────────────────────────────────────────────
// PLAYLISTS
// ──────────────────────────────────────────────
function openPlaylistModal() {
  document.getElementById('playlistName').value = '';
  // Pick a random color that's not already used by existing playlists
  const usedColors = state.playlists.map(p => p.color).filter(Boolean);
  const available = COLLECTION_COLORS.filter(c => !usedColors.includes(c));
  state.selectedPlaylistColor = available.length
    ? available[Math.floor(Math.random() * available.length)]
    : COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)];
  renderPlaylistColorPicker();
  openModal('playlistModal');
}

function renderPlaylistColorPicker() {
  const cp = document.getElementById('playlistColorPicker');
  if (!cp) return;
  cp.innerHTML = COLLECTION_COLORS.map(c => `
    <div class="color-chip ${c === state.selectedPlaylistColor ? 'selected' : ''}"
      style="background:${c}"
      data-action="select-color" data-target="playlist" data-color="${c}"></div>
  `).join('');
}

function selectPlaylistColor(c) {
  state.selectedPlaylistColor = c;
  renderPlaylistColorPicker();
}

function savePlaylist() {
  const name = document.getElementById('playlistName').value.trim();
  if (!name) { showToast('⚠️ Enter a playlist name'); return; }
  if (state.playlists.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast('⚠️ A playlist with that name already exists'); return;
  }
  state.playlists.push({ id: generateId(), name, color: state.selectedPlaylistColor || COLLECTION_COLORS[0], videoIds: [] });
  save();
  closeModal('playlistModal');
  renderSidebar();
  showToast(`✓ "${name}" playlist created`);
}

function clearPlaylist(id) {
  const pl = state.playlists.find(p => p.id === id);
  if (!pl) return;
  if (!pl.videoIds.length) { showToast('Playlist is already empty'); return; }
  const count = pl.videoIds.length;
  pl.videoIds = [];
  save();
  renderSidebar();
  renderCards();
  showToast(`✓ Cleared ${count} item${count !== 1 ? 's' : ''} from "${pl.name}"`);
}

function deletePlaylist(id) {
  const pl = state.playlists.find(p => p.id === id);
  if (!pl) return;
  showConfirm('Delete Playlist',
    `"${pl.name}" will be permanently deleted. Videos will not be affected.`,
    'Delete', () => {
    state.playlists = state.playlists.filter(p => p.id !== id);
    if (currentFilter === `playlist:${id}`) {
      filterByCollection('all', document.querySelector('.sidebar-item'));
    }
    save(); renderSidebar(); renderCards();
    showToast(`✓ "${pl.name}" deleted`);
  });
}

// Checks whether a playlist already contains a given video — matching not
// just by internal video id, but also by the underlying YouTube videoId.
// This catches the case where the same YouTube video exists as two separate
// library entries (e.g. saved into two different collections) and prevents
// it from being added to the same playlist twice under a different id.
function isVideoInPlaylist(pl, v) {
  if (!pl || !v) return false;
  return pl.videoIds.some(id => {
    if (id === v.id) return true;
    const ev = state.videos.find(ev => ev.id === id);
    return !!(ev && v.videoId && ev.videoId === v.videoId);
  });
}

function addVideoToPlaylist(videoId, playlistId) {
  const pl = state.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  const v = state.videos.find(v => v.id === videoId);
  if (!isVideoInPlaylist(pl, v)) {
    pl.videoIds.push(videoId);
    save(); renderSidebar();
    showToast(`✓ Added to "${pl.name}"`);
  } else {
    showToast(`Already in "${pl.name}"`);
  }
  // close any open playlist pickers
  document.querySelectorAll('.playlist-picker').forEach(el => el.remove());
}

function removeVideoFromPlaylist(videoId, playlistId) {
  const pl = state.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  // Remove by internal id, and also any other entry sharing the same
  // underlying YouTube video (covers legacy duplicate library entries).
  const v = state.videos.find(v => v.id === videoId);
  pl.videoIds = pl.videoIds.filter(id => {
    if (id === videoId) return false;
    if (v && v.videoId) {
      const ev = state.videos.find(ev => ev.id === id);
      if (ev && ev.videoId === v.videoId) return false;
    }
    return true;
  });
  save(); renderSidebar(); renderCards();
  showToast(`✓ Removed from "${pl.name}"`);
}

// Shows a playlist picker to add all videos in a GROUP to a chosen playlist
function openGroupPlaylistPicker(e, colId, groupName, anchorEl) {
  e.stopPropagation();
  document.querySelectorAll('.playlist-picker').forEach(el => el.remove());

  if (!state.playlists.length) {
    showToast('⚠️ No playlists yet — create one in the Playlists section');
    return;
  }

  const groupVids = state.videos.filter(v => v.collection === colId && v.group === groupName);
  if (!groupVids.length) {
    showToast('⚠️ This group has no videos');
    return;
  }

  const col = state.collections.find(c => c.id === colId);
  const picker = document.createElement('div');
  picker.className = 'playlist-picker';
  picker.innerHTML = `
    <div class="playlist-picker-title">Add "${escHtml(groupName)}" to playlist</div>
    ${state.playlists.map(pl => {
      const allIn = groupVids.every(v => isVideoInPlaylist(pl, v));
      const someIn = !allIn && groupVids.some(v => isVideoInPlaylist(pl, v));
      const label = allIn ? 'All added' : someIn ? 'Add remaining' : `Add all ${groupVids.length}`;
      const checkIcon = allIn
        ? `<span class="pp-check"><svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1.5 14.5l-4-4 1.41-1.41L10.5 13.67l5.59-5.59L17.5 9.5l-7 7z"/></svg></span>`
        : `<span class="pp-check"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span>`;
      return `<button class="playlist-picker-item${allIn ? ' in-playlist' : ''}" data-pl-id="${escHtml(pl.id)}">
        ${checkIcon}
        ${escHtml(pl.name)} <span style="opacity:0.5;font-size:10px;margin-left:4px;">${label}</span>
      </button>`;
    }).join('')}`;

  document.body.appendChild(picker);
  picker.querySelectorAll('.playlist-picker-item').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      addGroupToPlaylist(colId, groupName, btn.dataset.plId);
      document.querySelectorAll('.playlist-picker').forEach(el => el.remove());
    });
  });
  const rect = anchorEl.getBoundingClientRect();
  picker.style.cssText = `position:fixed;z-index:9999;top:${rect.bottom + 4}px;left:${rect.left}px`;
  setTimeout(() => {
    const pr = picker.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) picker.style.left = (window.innerWidth - pr.width - 8) + 'px';
    if (pr.bottom > window.innerHeight - 8) picker.style.top = (rect.top - pr.height - 4) + 'px';
  }, 0);
  const close = (ev) => { if (!picker.contains(ev.target)) { picker.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 0);
}

function addGroupToPlaylist(colId, groupName, playlistId) {
  const pl = state.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  const groupVids = state.videos.filter(v => v.collection === colId && v.group === groupName);
  let added = 0;
  groupVids.forEach(v => {
    if (!isVideoInPlaylist(pl, v)) { pl.videoIds.push(v.id); added++; }
  });
  save();
  renderSidebar();
  showToast(added > 0
    ? `✓ Added ${added} video${added !== 1 ? 's' : ''} from "${groupName}" to "${pl.name}"`
    : `"${groupName}" videos already in "${pl.name}"`);
}

// Shows a playlist picker to add ALL videos in a collection to a chosen playlist
function openCollectionPlaylistPicker(e, colId, anchorEl) {
  e.stopPropagation();
  document.querySelectorAll('.playlist-picker').forEach(el => el.remove());

  if (!state.playlists.length) {
    showToast('⚠️ No playlists yet — create one in the Playlists section');
    return;
  }

  const colVideos = state.videos.filter(v => v.collection === colId);
  if (!colVideos.length) {
    showToast('⚠️ This collection has no videos');
    return;
  }

  const col = state.collections.find(c => c.id === colId);
  const picker = document.createElement('div');
  picker.className = 'playlist-picker';
  picker.innerHTML = `
    <div class="playlist-picker-title">Add "${escHtml(col?.name || colId)}" to playlist</div>
    ${state.playlists.map(pl => {
      const allIn = colVideos.every(v => isVideoInPlaylist(pl, v));
      const someIn = !allIn && colVideos.some(v => isVideoInPlaylist(pl, v));
      const label = allIn ? 'All added' : someIn ? 'Add remaining' : `Add all ${colVideos.length}`;
      const checkIcon = allIn ? `<span class="pp-check"><svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1.5 14.5l-4-4 1.41-1.41L10.5 13.67l5.59-5.59L17.5 9.5l-7 7z"/></svg></span>` : `<span class="pp-check"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span>`;
      return `<button class="playlist-picker-item${allIn ? ' in-playlist' : ''}" data-pl-id="${escHtml(pl.id)}">
        ${checkIcon}
        ${escHtml(pl.name)} <span style="opacity:0.5;font-size:10px;margin-left:4px;">${label}</span>
      </button>`;
    }).join('')}`;

  document.body.appendChild(picker);
  picker.querySelectorAll('.playlist-picker-item').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      addCollectionToPlaylist(colId, btn.dataset.plId);
      document.querySelectorAll('.playlist-picker').forEach(el => el.remove());
    });
  });
  const rect = anchorEl.getBoundingClientRect();
  picker.style.cssText = `position:fixed;z-index:9999;top:${rect.bottom + 4}px;left:${rect.left}px`;
  setTimeout(() => {
    const pr = picker.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) picker.style.left = (window.innerWidth - pr.width - 8) + 'px';
    if (pr.bottom > window.innerHeight - 8) picker.style.top = (rect.top - pr.height - 4) + 'px';
  }, 0);
  const close = (ev) => { if (!picker.contains(ev.target)) { picker.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 0);
}

function addCollectionToPlaylist(colId, playlistId) {
  const pl = state.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  const colVideos = state.videos.filter(v => v.collection === colId);
  let added = 0;
  colVideos.forEach(v => {
    if (!isVideoInPlaylist(pl, v)) { pl.videoIds.push(v.id); added++; }
  });
  save();
  renderSidebar();
  const col = state.collections.find(c => c.id === colId);
  showToast(added > 0
    ? `✓ Added ${added} video${added !== 1 ? 's' : ''} from "${col?.name}" to "${pl.name}"`
    : `"${col?.name}" videos already in "${pl.name}"`);
}

// Shows an inline floating playlist picker anchored to the button
function openPlaylistPicker(videoId, anchorEl) {
  // Close any existing pickers
  document.querySelectorAll('.playlist-picker').forEach(el => el.remove());

  if (!state.playlists.length) {
    showToast('⚠️ No playlists yet — create one in the sidebar');
    return;
  }

  const v = state.videos.find(v => v.id === videoId);
  const picker = document.createElement('div');
  picker.className = 'playlist-picker';
  picker.innerHTML = `
    <div class="playlist-picker-title">Add to playlist</div>
    ${state.playlists.map(pl => {
      const has = isVideoInPlaylist(pl, v);
      const icon = has ? `<span class="pp-check"><svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1.5 14.5l-4-4 1.41-1.41L10.5 13.67l5.59-5.59L17.5 9.5l-7 7z"/></svg></span>` : `<span class="pp-check"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span>`;
      return `<button class="playlist-picker-item${has ? ' in-playlist' : ''}" data-pl-id="${escHtml(pl.id)}" data-in-playlist="${has}">
        ${icon}
        ${escHtml(pl.name)}
      </button>`;
    }).join('')}`;

  document.body.appendChild(picker);
  picker.querySelectorAll('.playlist-picker-item').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (btn.dataset.inPlaylist === 'true') removeVideoFromPlaylist(videoId, btn.dataset.plId);
      else addVideoToPlaylist(videoId, btn.dataset.plId);
      document.querySelectorAll('.playlist-picker').forEach(el => el.remove());
    });
  });

  // Position relative to anchor
  const rect = anchorEl.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.zIndex = '9999';
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = rect.left + 'px';

  // Keep within viewport
  setTimeout(() => {
    const pr = picker.getBoundingClientRect();
    if (pr.right > window.innerWidth - 8) picker.style.left = (window.innerWidth - pr.width - 8) + 'px';
    if (pr.bottom > window.innerHeight - 8) picker.style.top = (rect.top - pr.height - 4) + 'px';
  }, 0);

  // Click outside to close
  const close = (e) => {
    if (!picker.contains(e.target) && e.target !== anchorEl) {
      picker.remove();
      document.removeEventListener('click', close, true);
    }
  };
  setTimeout(() => document.addEventListener('click', close, true), 0);
}

// Show/hide new playlist input row in sidebar

// ──────────────────────────────────────────────
// SIDEBAR SECTION COLLAPSE
// ──────────────────────────────────────────────
function toggleSidebarSection(sectionId, chevEl) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const isCollapsed = section.classList.toggle('section-collapsed');
  chevEl.classList.toggle('chev-up', !isCollapsed);
  chevEl.classList.toggle('chev-down', isCollapsed);
}

function getAppName() {
  return typeof APP_NAME !== 'undefined' ? APP_NAME : 'unknown';
}

// ──────────────────────────────────────────────
// EXPORT FOLDER (File System Access API + IndexedDB persistence)
// ──────────────────────────────────────────────
const DB_NAME = 'TubeVaultExportFolders';
const DB_VERSION = 1;
const DB_STORE = 'folders';

function openExportFolderDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveExportFolderHandle(appName, handle) {
  try {
    const db = await openExportFolderDb();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(handle, appName);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Could not persist export folder handle:', e);
  }
}

async function loadExportFolderHandle(appName) {
  try {
    const db = await openExportFolderDb();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.get(appName);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

function clearExportFolderHandle(appName) {
  return openExportFolderDb().then(db => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(appName);
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }).catch(() => {});
}

let exportFolderHandle = null; // FileSystemDirectoryHandle when selected

async function browseExportFolder() {
  if (!window.showDirectoryPicker) {
    showToast('⚠️ Folder picker not supported in this browser — files will download normally');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    exportFolderHandle = handle;
    saveExportFolderHandle(getAppName(), handle);
    const wrap = document.getElementById('exportLocationWrap');
    const label = document.getElementById('exportLocationLabel');
    if (wrap) wrap.style.display = 'flex';
    if (label) label.textContent = handle.name;
    showToast('✓ Export folder set to "' + handle.name + '"');
  } catch (e) {
    if (e.name !== 'AbortError') showToast('⚠️ Could not access folder: ' + e.message);
  }
}

function clearExportFolder() {
  exportFolderHandle = null;
  clearExportFolderHandle(getAppName());
  const wrap = document.getElementById('exportLocationWrap');
  if (wrap) wrap.style.display = 'none';
  showToast('Export folder cleared — files will download normally');
}

async function restoreExportFolder() {
  const appName = getAppName();
  const handle = await loadExportFolderHandle(appName);
  if (handle) {
    try {
      const opts = { mode: 'readwrite' };
      const ok = await handle.queryPermission(opts) === 'granted' || await handle.requestPermission(opts) === 'granted';
      if (ok) {
        exportFolderHandle = handle;
        const wrap = document.getElementById('exportLocationWrap');
        const label = document.getElementById('exportLocationLabel');
        if (wrap) wrap.style.display = 'flex';
        if (label) label.textContent = handle.name;
      } else {
        clearExportFolderHandle(appName);
      }
    } catch (e) {
      clearExportFolderHandle(appName);
    }
  }
}

// Write text content to the selected folder, or fall back to download
async function saveToFolderOrDownload(filename, text, mimeType) {
  if (exportFolderHandle) {
    try {
      const fileHandle = await exportFolderHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(text);
      await writable.close();
      return true; // saved to folder
    } catch (e) {
      showToast('⚠️ Could not write to folder: ' + e.message + ' — downloading instead');
      // fall through to download
    }
  }
  // Standard download fallback
  const blob = new Blob([text], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  return false; // downloaded
}

// ──────────────────────────────────────────────
// EXPORT
// ──────────────────────────────────────────────
let _exportCallback = null;

function showExportConfirm(title, message, details, callback) {
  document.getElementById('exportConfirmTitle').textContent = title;
  document.getElementById('exportConfirmMessage').textContent = message;
  const appName = getAppName();
  const folderLine = exportFolderHandle
    ? '\n\nTarget folder: ' + appName + '/'
    : '\n\nTarget folder: Downloads (click Browse to set a folder)';
  document.getElementById('exportConfirmDetails').textContent = details + folderLine;
  _exportCallback = callback;
  openModal('exportConfirmModal');
}

function confirmExport() {
  const cb = _exportCallback;
  closeModal('exportConfirmModal');
  if (cb) { cb(); }
}

function exportData() {
  closeExportMenu();
  showExportConfirm(
    'Export JSON',
    'Export all your data as a JSON file.',
    'File: tubevault-export.json',
    () => {
      const data = JSON.stringify(state, null, 2);
      saveToFolderOrDownload('tubevault-export.json', data, 'application/json').then(saved => {
        showToast(saved ? '✓ Saved tubevault-export.json to folder' : '✓ Exported as JSON');
      });
    }
  );
}

// Exports the current collections + videos as a ready-to-paste
// collections.js file, nested as collection -> groups -> videos
// (matching the structure of the bundled collections.js).
function buildCollectionsJsExport() {
  const colorsBlock = `const COLLECTION_COLORS = [\n` +
    chunk(COLLECTION_COLORS, 4).map(row => `  ${row.map(c => jsStr(c)).join(', ')}`).join(',\n') +
    `\n];`;

  // Serialize a single video object as a nested-collections entry
  // (no `collection`/`group` fields — those are implied by nesting).
  function videoEntry(v, indent) {
    const pad = ' '.repeat(indent);
    const lines = [`${pad}  url: ${jsStr(v.url || '')},`, `${pad}  videoId: ${jsStr(v.videoId || '')},`];
    if (v.playlistId) lines.push(`${pad}  playlistId: ${jsStr(v.playlistId)},`);
    lines.push(`${pad}  title: ${jsStr(v.title || '')},`);
    lines.push(`${pad}  channel: ${jsStr(v.channel || '')},`);
    lines.push(`${pad}  note: ${jsStr(v.note || '')}`);
    return `${pad}{\n${lines.join('\n')}\n${pad}}`;
  }

  function videoArray(videos, indent) {
    if (!videos.length) return '[]';
    const pad = ' '.repeat(indent);
    return `[\n${videos.map(v => videoEntry(v, indent + 2) + ',').join('\n')}\n${pad}]`;
  }

  // Build collection blocks, grouping videos by `group` field
  const collectionBlocks = state.collections.map(col => {
    const colVideos = state.videos.filter(v => v.collection === col.id);
    const groupNames = [];
    const groups = {};
    const ungrouped = [];
    colVideos.forEach(v => {
      if (v.group) {
        if (!groups[v.group]) { groups[v.group] = []; groupNames.push(v.group); }
        groups[v.group].push(v);
      } else {
        ungrouped.push(v);
      }
    });

    // Apply drag-reorder from state.videoOrder
    groupNames.forEach(g => {
      const key = `${col.id}__${g}`.replace(/[^a-z0-9_]/gi, '_');
      const ord = state.videoOrder[key];
      if (ord && ord.length) {
        const m = new Map(ord.map((id, i) => [id, i]));
        groups[g].sort((a, b) => (m.has(a.id) ? m.get(a.id) : 9999) - (m.has(b.id) ? m.get(b.id) : 9999));
      }
    });
    const ugKey = `${col.id}__`.replace(/[^a-z0-9_]/gi, '_');
    const ugOrd = state.videoOrder[ugKey];
    if (ugOrd && ugOrd.length) {
      const ugM = new Map(ugOrd.map((id, i) => [id, i]));
      ungrouped.sort((a, b) => (ugM.has(a.id) ? ugM.get(a.id) : 9999) - (ugM.has(b.id) ? ugM.get(b.id) : 9999));
    }

    const groupsLines = groupNames.map(g =>
      `      ${jsStr(g)}: ${videoArray(groups[g], 6)}`
    );

    return `  {
    id: ${jsStr(col.id)},
    name: ${jsStr(col.name)},
    color: ${jsStr(col.color)},
    groups: {${groupsLines.length ? '\n' + groupsLines.join(',\n') + '\n    ' : ''}},
    ungrouped: ${videoArray(ungrouped, 4)}
  }`;
  });

  // Uncollected videos go into a trailing pseudo-collection
  const uncollected = state.videos.filter(v => !v.collection);
  if (uncollected.length) {
    const groupNames = [];
    const groups = {};
    const ungrouped = [];
    uncollected.forEach(v => {
      if (v.group) {
        if (!groups[v.group]) { groups[v.group] = []; groupNames.push(v.group); }
        groups[v.group].push(v);
      } else {
        ungrouped.push(v);
      }
    });
    const groupsLines = groupNames.map(g =>
      `      ${jsStr(g)}: ${videoArray(groups[g], 6)}`
    );
    collectionBlocks.push(`  {
    id: '__none__',
    name: 'Uncollected',
    color: 'var(--text-dim)',
    groups: {${groupsLines.length ? '\n' + groupsLines.join(',\n') + '\n    ' : ''}},
    ungrouped: ${videoArray(ungrouped, 4)}
  }`);
  }

  const collectionsBlock = `const DEFAULT_COLLECTIONS = [\n${collectionBlocks.join(',\n')}\n];`;

  const fileName = getAppName() + '-collections.js';

  const fileContents =
`// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on ${new Date().toLocaleString()}
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing ${fileName} with this file
//   2. Clear the app's localStorage (or open in a private window)
//      so the new defaults are picked up on next load
// ──────────────────────────────────────────────────────────────

// Color swatches offered in the "New Collection" color picker.
${colorsBlock}

// Default collections + their videos, shown in the sidebar on first load.
//
// Each collection:
// - id:        unique, lowercase, no spaces (used internally)
// - name:      display name shown in the sidebar
// - color:     hex color for the collection's dot / accent
// - groups:    { "Group Name": [ video, video, ... ], ... }
// - ungrouped: [ video, video, ... ] — videos with no sub-group
//
// Each video:
// - url, videoId, title, channel, note
// - playlistId: optional — present if the original URL had a "?list=" param
${collectionsBlock}
`;

  // Build per-collection group details
  const colDetails = state.collections.map(col => {
    const colVideos = state.videos.filter(v => v.collection === col.id);
    const groups = {};
    let ungroupedCount = 0;
    colVideos.forEach(v => {
      if (v.group) {
        groups[v.group] = (groups[v.group] || 0) + 1;
      } else {
        ungroupedCount++;
      }
    });
    const groupLines = Object.entries(groups)
      .sort((a, b) => b[1] - a[1])
      .map(([g, c]) => `  ${g}: ${c}`)
      .join('\n');
    let detail = `${col.name} (${colVideos.length} videos)`;
    if (groupLines) detail += '\n' + groupLines;
    if (ungroupedCount) detail += `\n  Ungrouped: ${ungroupedCount}`;
    return detail;
  }).join('\n\n');

  return { fileName, fileContents, details: colDetails };
}

function doExportCollectionsJs() {
  const { fileName, fileContents } = buildCollectionsJsExport();
  saveToFolderOrDownload(fileName, fileContents, 'text/javascript').then(saved => {
    showToast(saved ? ('✓ Saved ' + fileName + ' to folder') : ('✓ Exported as ' + fileName));
  });
}

function exportCollectionsJs() {
  closeExportMenu();
  const { fileName, details } = buildCollectionsJsExport();
  showExportConfirm(
    'Export Collections',
    'Export your collections and videos as a JavaScript file.',
    'File: ' + fileName + '\nContains: ' + state.collections.length + ' collection(s), ' + state.videos.length + ' video(s)' + (details ? '\n\n' + details : ''),
    () => doExportCollectionsJs()
  );
}

// Splits an array into chunks of a given size (used for formatting COLLECTION_COLORS)
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Converts a string to a single-quoted JS string literal, escaping as needed
function jsStr(str) {
  return "'" + String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
}

function buildWatchedJsExport() {
  // Collect unique YouTube videoIds of all watched videos
  const watchedVideoIds = [...new Set(
    state.videos.filter(v => v.watched && v.videoId).map(v => v.videoId)
  )];

  // Also include any watchedIds that may reference deleted videos
  state.watchedIds.forEach(wid => {
    if (!watchedVideoIds.includes(wid)) watchedVideoIds.push(wid);
  });

  // Build file contents matching the watched.js format
  const idLines = watchedVideoIds.map(function(id) {
    // Find matching video for a comment label
    const v = state.videos.find(function(v) { return v.videoId === id; });
    const label = v ? (' // ' + (v.title || v.url || id).slice(0, 60)) : '';
    return '  ' + jsStr(id) + ',' + label;
  });

  const SEP = '// ' + '-'.repeat(62);
  const ts = new Date().toLocaleString();
  const fileName = getAppName() + '-watched.js';

  const fileContents = [
    SEP,
    '// WATCHED HISTORY',
    '// Exported from TubeVault on ' + ts,
    '//',
    '// WATCHED_VIDEO_IDS: YouTube video IDs marked as watched.',
    '// To restore: replace ' + fileName + ' with this file and clear localStorage.',
    SEP,
    '',
    'const WATCHED_VIDEO_IDS = [',
  ].join('\n') + '\n' +
  (idLines.length ? idLines.join('\n') + '\n' : '') +
  '];\n';

  const n = watchedVideoIds.length;
  return { fileName, fileContents, n: n };
}

function doExportWatchedJs() {
  const exp = buildWatchedJsExport();
  saveToFolderOrDownload(exp.fileName, exp.fileContents, 'text/javascript').then(saved => {
    const dest = saved ? ('to folder') : ('as ' + exp.fileName);
    if (exp.n === 0) showToast('\u26a0\ufe0f No watched videos — exported empty ' + exp.fileName);
    else showToast('\u2713 Saved ' + exp.n + ' watched video' + (exp.n !== 1 ? 's' : '') + ' ' + dest);
  });
}

function exportWatchedJs() {
  closeExportMenu();
  const exp = buildWatchedJsExport();
  showExportConfirm(
    'Export Watched',
    'Export your watched video history as a JavaScript file.',
    'File: ' + exp.fileName + '\nContains: ' + exp.n + ' watched video(s)',
    () => doExportWatchedJs()
  );
}

function buildPlaylistJsExport() {
  const SEP = '// ' + '-'.repeat(62);

  const blocks = state.playlists.map(function(pl) {
    const videos = pl.videoIds
      .map(function(id) { return state.videos.find(function(v) { return v.id === id; }); })
      .filter(Boolean);

    const videoLines = videos.map(function(v) {
      const col = state.collections.find(function(c) { return c.id === v.collection; });
      const path = col ? (v.group ? col.name + ' / ' + v.group : col.name) : '';
      const L = [];
      L.push('      url: ' + jsStr(v.url || '') + ',');
      L.push('      videoId: ' + jsStr(v.videoId || '') + ',');
      if (v.playlistId) L.push('      playlistId: ' + jsStr(v.playlistId) + ',');
      L.push('      title: ' + jsStr(v.title || '') + ',');
      L.push('      channel: ' + jsStr(v.channel || '') + ',');
      if (path) L.push('      collectionPath: ' + jsStr(path) + ',');
      L.push('      note: ' + jsStr(v.note || ''));
      return '    {\n' + L.join('\n') + '\n    }';
    });

    return (
      '  {\n' +
      '    id: ' + jsStr(pl.id) + ',\n' +
      '    name: ' + jsStr(pl.name) + ',\n' +
      '    color: ' + jsStr(pl.color || '#78909C') + ',\n' +
      '    videoIds: [' + pl.videoIds.map(jsStr).join(', ') + '],\n' +
      '    videos: [\n' + videoLines.join(',\n') + '\n    ]\n' +
      '  }'
    );
  });

  const fileName = getAppName() + '-playlist.js';

  const header = [
    SEP,
    '// PLAYLIST CONFIG',
    '// Exported from TubeVault on ' + new Date().toLocaleString(),
    '//',
    '// Each playlist: id, name, color, videoIds, videos (full details)',
    '// To apply as defaults: replace ' + fileName + ' and clear localStorage.',
    SEP,
    '',
    'const DEFAULT_PLAYLISTS = ['
  ].join('\n');

  const fileContents = header + '\n' + blocks.join(',\n') + '\n];\n';
  const n = state.playlists.length;
  const totalVideos = state.playlists.reduce((sum, pl) => sum + pl.videoIds.length, 0);
  const playlistDetails = state.playlists.map(pl => '• ' + pl.name + ' (' + pl.videoIds.length + ' videos)').join('\n');
  return { fileName, fileContents, details: playlistDetails, n: n, totalVideos: totalVideos };
}

function doExportPlaylistJs() {
  const exp = buildPlaylistJsExport();
  saveToFolderOrDownload(exp.fileName, exp.fileContents, 'text/javascript').then(saved => {
    showToast('\u2713 ' + (saved ? 'Saved' : 'Exported') + ' ' + exp.n + ' playlist' + (exp.n !== 1 ? 's' : '') + ' ' + (saved ? 'to folder' : ('as ' + exp.fileName)));
  });
}

function exportPlaylistJs() {
  closeExportMenu();
  const exp = buildPlaylistJsExport();
  showExportConfirm(
    'Export Playlists',
    'Export your playlists as a JavaScript file.',
    'File: ' + exp.fileName + '\n\nPlaylists: ' + exp.n + '\nTotal videos: ' + exp.totalVideos + '\n\n' + exp.details,
    () => doExportPlaylistJs()
  );
}

function exportAllJs() {
  closeExportMenu();
  const appName = getAppName();
  const names = {
    collections: appName + '-collections.js',
    playlist: appName + '-playlist.js',
    watched: appName + '-watched.js',
  };
  showExportConfirm(
    'Export All JS Files',
    'Export all configuration files as JavaScript.',
    'Files: ' + names.collections + ', ' + names.playlist + ', ' + names.watched,
    () => {
      doExportCollectionsJs();
      setTimeout(doExportPlaylistJs, 300);
      setTimeout(doExportWatchedJs, 600);
      setTimeout(function() {
        const dest = exportFolderHandle ? 'to folder' : 'as downloads';
        showToast('\u2713 Exported ' + names.collections + ', ' + names.playlist + ' & ' + names.watched + ' ' + dest);
      }, 700);
    }
  );
}

// ──────────────────────────────────────────────
// LOCATION PICKER (Browse button on saving-to bar)
// ──────────────────────────────────────────────
function toggleLocationPicker() {
  const picker = document.getElementById('locationPicker');
  if (!picker) return;
  const isOpen = picker.style.display !== 'none';
  if (isOpen) {
    picker.style.display = 'none';
  } else {
    renderLocationPicker();
    picker.style.display = '';
    // Close on outside click
    setTimeout(() => {
      const close = (e) => {
        const loc = document.getElementById('quickAddLocation');
        if (loc && !loc.contains(e.target)) {
          picker.style.display = 'none';
          document.removeEventListener('click', close);
        }
      };
      document.addEventListener('click', close);
    }, 0);
  }
}

function renderLocationPicker() {
  const body = document.getElementById('locationPickerBody');
  if (!body) return;

  const curColId = state.lastUsedCollection || '';
  const curGroup = state.lastUsedGroup || '';

  // Build using DOM to avoid any quote-escaping issues
  body.innerHTML = '';

  state.collections.forEach(col => {
    const groups = getGroupsForCollection(col.id);

    // Collection header row
    const colDiv = document.createElement('div');
    colDiv.className = 'lp-collection';

    const colHdr = document.createElement('div');
    colHdr.className = 'lp-col-header' + (curColId === col.id && !curGroup ? ' selected' : '');
    colHdr.innerHTML = '<span class="lp-col-dot" style="background:' + col.color + '"></span>' + escHtml(col.name);
    colHdr.dataset.col = col.id;
    colHdr.dataset.grp = '';
    colDiv.appendChild(colHdr);

    // Group rows
    groups.forEach(g => {
      const grpRow = document.createElement('div');
      grpRow.className = 'lp-group-item' + (curColId === col.id && curGroup === g ? ' selected' : '');
      grpRow.innerHTML = '<svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>' + escHtml(g);
      grpRow.dataset.col = col.id;
      grpRow.dataset.grp = g;
      colDiv.appendChild(grpRow);
    });

    body.appendChild(colDiv);
  });

  // Uncollected row
  const uncRow = document.createElement('div');
  uncRow.className = 'lp-uncollected' + (!curColId ? ' selected' : '');
  uncRow.innerHTML = '<span class="lp-col-dot" style="background:var(--text-dim)"></span>Uncollected';
  uncRow.dataset.col = '';
  uncRow.dataset.grp = '';
  body.appendChild(uncRow);

  // Single delegated click handler
  body.onclick = (e) => {
    const row = e.target.closest('[data-col]');
    if (!row) return;
    selectLocation(row.dataset.col, row.dataset.grp);
  };
}

function selectLocation(colId, group) {
  state.lastUsedCollection = colId;
  state.lastUsedGroup = group;
  save();
  renderQuickAddLocation();
  // Close picker
  const picker = document.getElementById('locationPicker');
  if (picker) picker.style.display = 'none';
}

// ──────────────────────────────────────────────
// EXPORT ALL JS
// ──────────────────────────────────────────────

function toggleExportMenu() {
  const menu = document.getElementById('exportMenu');
  menu.classList.toggle('open');
}

function closeExportMenu() {
  const menu = document.getElementById('exportMenu');
  if (menu) menu.classList.remove('open');
}

// Close the export menu when clicking outside of it
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('exportDropdown');
  if (dropdown && !dropdown.contains(e.target)) closeExportMenu();
});

// ──────────────────────────────────────────────
// CONFIRM MODAL
// ──────────────────────────────────────────────
let _confirmCallback = null;

function showConfirm(title, message, okLabel, callback) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmOkBtn').textContent = okLabel || 'Delete';
  _confirmCallback = callback;
  openModal('confirmModal');
}

function confirmOk() {
  const cb = _confirmCallback;
  closeConfirmModal();
  if (cb) { cb(); }
}

function closeConfirmModal() {
  closeModal('confirmModal');
  _confirmCallback = null;
}

// ──────────────────────────────────────────────
// MODAL HELPERS
// ──────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ──────────────────────────────────────────────
// SEED DATA (first load)
// Flattens the nested DEFAULT_COLLECTIONS (collection -> groups -> videos)
// from collections.js into flat state.videos entries with
// `collection` and `group` fields.
// ──────────────────────────────────────────────
function seedData() {
  if (state.videos.length === 0) {
    let baseTime = Date.now();
    DEFAULT_COLLECTIONS.forEach(col => {
      Object.entries(col.groups || {}).forEach(([groupName, videos]) => {
        videos.forEach(v => {
          state.videos.push({
            id: generateId(),
            ...v,
            collection: col.id,
            group: groupName,
            added: baseTime - Math.random() * 5 * 24 * 3600 * 1000,
            watched: false,
          });
        });
      });
      (col.ungrouped || []).forEach(v => {
        state.videos.push({
          id: generateId(),
          ...v,
          collection: col.id,
          group: '',
          added: baseTime - Math.random() * 5 * 24 * 3600 * 1000,
          watched: false,
        });
      });
    });
    if (typeof WATCHED_VIDEO_IDS !== 'undefined' && WATCHED_VIDEO_IDS.length) {
      state.videos.forEach(v => {
        if (WATCHED_VIDEO_IDS.includes(v.videoId)) {
          v.watched = true;
          if (!state.watchedIds.includes(v.videoId)) state.watchedIds.push(v.videoId);
        }
      });
    }
    remapPlaylistIds();
    save();
  }
}

function remapPlaylistIds() {
  const ytIdMap = {};
  state.videos.forEach(v => { if (v.videoId) ytIdMap[v.videoId] = v.id; });
  state.playlists.forEach(pl => {
    const def = (typeof DEFAULT_PLAYLISTS !== 'undefined') && DEFAULT_PLAYLISTS.find(p => p.id === pl.id);
    if (def && def.videos && def.videos.length) {
      // De-dupe in case the source playlist file lists the same video twice
      const mapped = [...new Set(def.videos.map(dv => ytIdMap[dv.videoId]).filter(Boolean))];
      if (mapped.length) { pl.videoIds = mapped; return; }
    }
    const valid = pl.videoIds.filter(id => state.videos.find(v => v.id === id));
    if (!valid.length && pl.videoIds.length) {
      const byYt = state.videos.filter(v => v.videoId && pl.videoIds.includes(v.videoId));
      if (byYt.length) pl.videoIds = [...new Set(byYt.map(v => v.id))];
    }
    // Final safety net — de-dupe by internal id, and also by the underlying
    // YouTube video id (covers legacy duplicate library entries that share
    // the same YouTube video under two different internal ids)
    const seenYt = new Set();
    pl.videoIds = pl.videoIds.filter(id => {
      const v = state.videos.find(v => v.id === id);
      const key = v && v.videoId ? v.videoId : id;
      if (seenYt.has(key)) return false;
      seenYt.add(key);
      return true;
    });
  });
}

// ──────────────────────────────────────────────
// SIDEBAR RESIZE
// ──────────────────────────────────────────────
(function() {
  const SIDEBAR_DEFAULT = 220;
  const SIDEBAR_MIN = 160;
  const SIDEBAR_MAX = 380;
  const KEY = 'tubevault_sidebar_w';

  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('sidebarResizer');

  // Restore saved width
  const saved = parseInt(localStorage.getItem(KEY));
  if (saved && saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) {
    sidebar.style.width = saved + 'px';
  }

  let startX = 0, startW = 0, dragging = false;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startW = sidebar.getBoundingClientRect().width;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    const newW = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + delta));
    sidebar.style.width = newW + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Persist
    localStorage.setItem(KEY, parseInt(sidebar.style.width));
  });

  // Double-click to reset to default
  resizer.addEventListener('dblclick', () => {
    sidebar.style.width = SIDEBAR_DEFAULT + 'px';
    localStorage.setItem(KEY, SIDEBAR_DEFAULT);
    showToast('↔ Sidebar reset to default width');
  });
})();

// ──────────────────────────────────────────────
// SHARED DRAG-TO-REORDER HELPER
// Replaces four near-identical drag-and-drop implementations (collection
// sidebar, playlist sidebar, in-group video cards, and playlist split-view
// tracks). Behaviour is preserved: top/bottom drop indicators, `was-dragging`
// click suppression, and "drop on empty space" via onDropToEnd.
// ──────────────────────────────────────────────
function makeSortable(container, itemSelector, opts) {
  opts = opts || {};
  const dragClass = opts.dragClass || 'sortable-dragging';
  const overTopClass = opts.overTopClass || 'sortable-over-top';
  const overBottomClass = opts.overBottomClass || 'sortable-over-bottom';
  const wasDraggingClass = opts.wasDraggingClass || null;
  let srcEl = null;

  function clearIndicators() {
    container.querySelectorAll('.' + overTopClass + ', .' + overBottomClass)
      .forEach(el => el.classList.remove(overTopClass, overBottomClass));
  }

  function items() {
    return Array.from(container.querySelectorAll(itemSelector));
  }

  items().forEach(item => {
    item.draggable = true;

    item.addEventListener('dragstart', (e) => {
      srcEl = item;
      item.classList.add(dragClass);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'sortable-drag');
      // Defer the opacity drop so the browser snapshots a clean drag ghost
      setTimeout(() => item.classList.add(dragClass), 0);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove(dragClass);
      if (wasDraggingClass) item.classList.add(wasDraggingClass);
      clearIndicators();
      srcEl = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!srcEl || srcEl === item) return;
      clearIndicators();
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      item.classList.add(e.clientY < midY ? overTopClass : overBottomClass);
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove(overTopClass, overBottomClass);
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (opts.stopPropagation) e.stopPropagation();
      clearIndicators();
      if (!srcEl || srcEl === item) return;
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'top' : 'bottom';
      const dragged = srcEl;
      srcEl = null;
      if (opts.onDrop) opts.onDrop(dragged, item, position);
    });
  });

  container.addEventListener('dragover', (e) => e.preventDefault());
  container.addEventListener('drop', (e) => {
    if (!srcEl) return;
    const dragged = srcEl;
    srcEl = null;
    clearIndicators();
    if (opts.onDropToEnd) opts.onDropToEnd(dragged);
  });
}

// ──────────────────────────────────────────────
// CARD DRAG-AND-DROP (item reorder within group)
// ──────────────────────────────────────────────
function attachCardDrag() {
  document.querySelectorAll('.cards-grid').forEach(grid => {
    makeSortable(grid, ':scope > .video-card', {
      dragClass: 'card-dragging',
      overTopClass: 'card-drag-over',
      overBottomClass: 'card-drag-over',
      stopPropagation: true,
      onDrop: (srcEl, targetEl, position) => {
        if (position === 'bottom') {
          grid.insertBefore(srcEl, targetEl.nextSibling);
        } else {
          grid.insertBefore(srcEl, targetEl);
        }
        saveCardOrder(grid);
      }
    });
  });
}

function saveCardOrder(grid) {
  const ids = Array.from(grid.querySelectorAll(':scope > .video-card'))
    .map(c => c.id.replace('card-', ''));
  if (!ids.length) return;
  const firstVid = state.videos.find(v => v.id === ids[0]);
  if (!firstVid) return;
  const colId = firstVid.collection || '__none__';
  const groupName = firstVid.group || '';
  const key = `${colId}__${groupName}`.replace(/[^a-z0-9_]/gi, '_');
  state.videoOrder[key] = ids;
  save();
  showToast('✓ Order saved');
}

// ──────────────────────────────────────────────
// PLAYLIST SPLIT VIEW
// ──────────────────────────────────────────────
let pvState = {
  plId: null,
  mode: 'sequential', // 'sequential' | 'random'
  order: [],          // video IDs in play order
  index: 0,
  autoplay: true,     // auto-advance to next video when current ends
};

// Search query typed into the playlist split-view search bar — filters
// which tracks are shown in the left panel (playback order is untouched).
let pvSearchQuery = '';

function pvHandleSearch() {
  const input = document.getElementById('pvSearchInput');
  pvSearchQuery = input ? input.value.trim().toLowerCase() : '';
  pvRenderList();
}

// YouTube IFrame API player instance
let ytPlayer = null;
let ytReady = false;

// Called by YouTube IFrame API when loaded
function onYouTubeIframeAPIReady() {
  ytReady = true;
}

function openPlaylistView(plId) {
  const pl = state.playlists.find(p => p.id === plId);
  if (!pl) return;

  pvState.plId = plId;
  pvState.mode = pvState.mode || 'sequential';
  pvBuildOrder(pl);
  pvState.index = 0;

  // Reset search bar for this playlist session
  pvSearchQuery = '';
  const pvSearchInput = document.getElementById('pvSearchInput');
  if (pvSearchInput) pvSearchInput.value = '';

  // Show split view, hide main + sidebar
  document.getElementById('playlistView').style.display = 'flex';
  document.getElementById('mainView').style.display = 'none';
  document.getElementById('sidebar').style.display = 'none';

  // Render the track list
  pvRenderList();

  // Auto-play the first video
  pvPlayIndex(0);
}

function pvBuildOrder(pl) {
  const ids = pl.videoIds.filter(id => state.videos.find(v => v.id === id));
  if (pvState.mode === 'random') {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  pvState.order = ids;
}

function pvRenderList() {
  const pl = state.playlists.find(p => p.id === pvState.plId);
  if (!pl) return;

  // Header meta
  document.getElementById('pvDot').style.background = pl.color || '#78909C';
  document.getElementById('pvName').textContent = pl.name;
  document.getElementById('pvCount').textContent = `${pvState.order.length} video${pvState.order.length !== 1 ? 's' : ''}`;

  // Mode buttons
  document.getElementById('pvSeqBtn').classList.toggle('active', pvState.mode === 'sequential');
  document.getElementById('pvRndBtn').classList.toggle('active', pvState.mode === 'random');

  // Track list — filtered by the playlist search bar (if any query is set).
  // Filtering only affects which rows are shown; pvState.order / playback
  // indices are untouched so drag-reorder and pvPlayIndex(i) stay correct.
  const tracks = document.getElementById('pvTracks');
  const q = pvSearchQuery;
  const rows = pvState.order.map((vidId, i) => {
    const v = state.videos.find(v => v.id === vidId);
    if (!v) return '';
    if (q) {
      const haystack = `${v.title || ''} ${v.channel || ''} ${v.note || ''}`.toLowerCase();
      if (!haystack.includes(q)) return '';
    }
    const col = state.collections.find(c => c.id === v.collection);
    const path = col ? (v.group ? `${col.name} / ${v.group}` : col.name) : (v.group || '');
    const thumb = getThumbnail(v.videoId);
    const isActive = i === pvState.index;
    return `<div class="pv-track${isActive ? ' active' : ''}" data-action="pv-track-click" data-index="${i}" id="pvt-${i}" draggable="true" data-pv-index="${i}">
      <span class="pv-track-drag-handle" title="Drag to reorder">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
          <rect x="0" y="0" width="1.5" height="1.5" rx="0.5"/>
          <rect x="4" y="0" width="1.5" height="1.5" rx="0.5"/>
          <rect x="8" y="0" width="1.5" height="1.5" rx="0.5"/>
          <rect x="0" y="4" width="1.5" height="1.5" rx="0.5"/>
          <rect x="4" y="4" width="1.5" height="1.5" rx="0.5"/>
          <rect x="8" y="4" width="1.5" height="1.5" rx="0.5"/>
          <rect x="0" y="8" width="1.5" height="1.5" rx="0.5"/>
          <rect x="4" y="8" width="1.5" height="1.5" rx="0.5"/>
          <rect x="8" y="8" width="1.5" height="1.5" rx="0.5"/>
          <rect x="0" y="12" width="1.5" height="1.5" rx="0.5"/>
          <rect x="4" y="12" width="1.5" height="1.5" rx="0.5"/>
          <rect x="8" y="12" width="1.5" height="1.5" rx="0.5"/>
        </svg>
      </span>
      <span class="pv-track-num">${i + 1}</span>
      <span class="pv-track-play-icon">
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </span>
      <img class="pv-track-thumb" src="${thumb}" loading="lazy" data-action="pv-thumb-error">
      <div class="pv-track-info">
        <div class="pv-track-title" title="${escHtml(v.title || v.url || '')}">${escHtml(v.title || v.url || 'Untitled')}</div>
        ${path ? `<div class="pv-track-path">${escHtml(path)}</div>` : ''}
      </div>
    </div>`;
  });

  const visibleRows = rows.filter(Boolean);
  tracks.innerHTML = visibleRows.length
    ? visibleRows.join('')
    : (q ? `<div class="pv-search-empty">No tracks match "${escHtml(pvSearchQuery)}"</div>` : '');

  pvAttachTrackDrag();
}

function pvTrackClick(el, i) {
  if (el.classList.contains('was-dragging')) {
    el.classList.remove('was-dragging');
    return;
  }
  pvPlayIndex(i);
}

function pvAttachTrackDrag() {
  const tracks = document.getElementById('pvTracks');
  if (!tracks) return;

  makeSortable(tracks, '.pv-track', {
    dragClass: 'pv-track-dragging',
    overTopClass: 'pv-track-drag-over-top',
    overBottomClass: 'pv-track-drag-over-bottom',
    wasDraggingClass: 'was-dragging',
    stopPropagation: true,
    onDrop: (srcEl, targetEl, position) => {
      const srcIndex = parseInt(srcEl.dataset.pvIndex);
      const targetIndex = parseInt(targetEl.dataset.pvIndex);
      let insertAt = position === 'top' ? targetIndex : targetIndex + 1;
      const moved = pvState.order.splice(srcIndex, 1)[0];
      if (insertAt > srcIndex) insertAt--;

      pvState.order.splice(insertAt, 0, moved);

      const oldPlaying = pvState.index;
      if (srcIndex === oldPlaying) {
        pvState.index = insertAt;
      } else if (srcIndex < oldPlaying && insertAt >= oldPlaying) {
        pvState.index--;
      } else if (srcIndex > oldPlaying && insertAt <= oldPlaying) {
        pvState.index++;
      }

      pvSaveOrderToPlaylist();
      pvRenderList();
      showToast('✓ Playlist order saved');
    },
    onDropToEnd: (srcEl) => {
      const srcIndex = parseInt(srcEl.dataset.pvIndex);
      const moved = pvState.order.splice(srcIndex, 1)[0];
      pvState.order.push(moved);
      const oldPlaying = pvState.index;
      if (srcIndex === oldPlaying) pvState.index = pvState.order.length - 1;
      else if (srcIndex < oldPlaying) pvState.index--;
      pvSaveOrderToPlaylist();
      pvRenderList();
      showToast('✓ Playlist order saved');
    }
  });
}


function pvSaveOrderToPlaylist() {
  const pl = state.playlists.find(p => p.id === pvState.plId);
  if (!pl) return;
  pl.videoIds = [...pvState.order];
  save();

  const defPl = (typeof DEFAULT_PLAYLISTS !== 'undefined') && DEFAULT_PLAYLISTS.find(p => p.id === pl.id);
  if (defPl) {
    defPl.videoIds = [...pvState.order];
    const orderedVideos = pvState.order.map(id => {
      const v = state.videos.find(v => v.id === id);
      if (!v) return null;
      const col = state.collections.find(c => c.id === v.collection);
      const path = col ? (v.group ? col.name + ' / ' + v.group : col.name) : '';
      return {
        url: v.url || '',
        videoId: v.videoId || '',
        ...(v.playlistId ? { playlistId: v.playlistId } : {}),
        title: v.title || '',
        channel: v.channel || '',
        ...(path ? { collectionPath: path } : {}),
        note: v.note || '',
      };
    }).filter(Boolean);
    defPl.videos = orderedVideos;
  }
}

function pvPlayIndex(i) {
  pvState.index = i;
  const vidId = pvState.order[i];
  const v = state.videos.find(v => v.id === vidId);
  if (!v) { if (i + 1 < pvState.order.length) pvPlayIndex(i + 1); return; }

  markWatched(v.id);

  const container = document.getElementById('pvIframeContainer');

  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    try {
      ytPlayer.loadVideoById(v.videoId);
    } catch(e) {
      ytPlayer = null;
      pvPlayIndex(i);
      return;
    }
  } else if (ytReady && window.YT && window.YT.Player) {
    if (container) container.innerHTML = '<div id="ytPlayerEl" style="width:100%;height:100%;"></div>';
    ytPlayer = new window.YT.Player('ytPlayerEl', {
      width: '100%',
      height: '100%',
      videoId: v.videoId,
      playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: function() {
          try { ytPlayer.playVideo(); } catch(e) {}
        },
        onStateChange: onYtPlayerStateChange,
      }
    });
  } else {
    if (container) container.innerHTML =
      `<iframe src="${getEmbedUrl(v.videoId)}"
       style="width:100%;height:100%;border:none;position:absolute;inset:0;" allowfullscreen
       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
    if (!ytReady) {
      const checkInterval = setInterval(() => {
        if (ytReady && window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          if (container) container.innerHTML = '<div id="ytPlayerEl" style="width:100%;height:100%;"></div>';
          ytPlayer = new window.YT.Player('ytPlayerEl', {
            width: '100%',
            height: '100%',
            videoId: v.videoId,
            playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: function() {
                try { ytPlayer.playVideo(); } catch(e) {}
              },
              onStateChange: onYtPlayerStateChange,
            }
          });
        }
      }, 500);
      setTimeout(() => clearInterval(checkInterval), 15000);
    }
  }

  document.querySelectorAll('.pv-track').forEach((el, idx) => {
    el.classList.toggle('active', idx === i);
  });

  const activeTrack = document.getElementById('pvt-' + i);
  if (activeTrack) activeTrack.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function onYtPlayerStateChange(event) {
  // YT.PlayerState.ENDED = 0
  if (event.data === 0 && pvState.autoplay) {
    const next = pvState.index + 1;
    if (next < pvState.order.length) {
      pvPlayIndex(next);
    }
  }
}

function pvToggleAutoplay() {
  pvState.autoplay = !pvState.autoplay;
  const btn = document.getElementById('pvAutoBtn');
  if (btn) btn.classList.toggle('active', pvState.autoplay);
  showToast(pvState.autoplay ? '✓ Auto-play on' : 'Auto-play off');
}

function pvSetMode(mode) {
  if (pvState.mode === mode) return;
  pvState.mode = mode;
  const pl = state.playlists.find(p => p.id === pvState.plId);
  if (pl) pvBuildOrder(pl);
  pvState.index = 0;
  pvRenderList();
  pvPlayIndex(0);
}

function closePvView(restoreAll) {
  document.getElementById('playlistView').style.display = 'none';
  document.getElementById('mainView').style.display = '';
  document.getElementById('sidebar').style.display = '';
  // Stop and destroy the YouTube player
  if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
    try { ytPlayer.stopVideo(); ytPlayer.destroy(); } catch(e) {}
    ytPlayer = null;
  }
  const container = document.getElementById('pvIframeContainer');
  if (container) container.innerHTML = '';
  pvState.plId = null;

  if (restoreAll === false) return; // called from filterByCollection, don't change filter
  // Restore All Videos view
  currentFilter = 'all';
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  // Find and activate the "All Videos" button specifically
  const allBtn = [...document.querySelectorAll('.sidebar-item')].find(
    b => b.textContent.trim().startsWith('All Videos')
  ) || document.querySelectorAll('.sidebar-item')[0];
  if (allBtn) allBtn.classList.add('active');
  document.getElementById('sectionTitle').textContent = 'All Videos';
  renderCards();
}


// ──────────────────────────────────────────────
// CATEGORY SWITCHER (sidebar-bottom text menu)
// Replaces the old topbar kebab/dot app-switcher. Lists every known
// "category" (a category = its own TholsStudio page, e.g. Music,
// Electronics, Astrology) plus a "Create category…" action that
// generates a brand-new category page.
//
// The registry lives in a SHARED (non-namespaced) localStorage key so
// every category page — old and new — sees the same list, as long as
// they're served from the same origin.
// ──────────────────────────────────────────────
const APPS_REGISTRY_KEY = 'tholsstudio_categories';

// Last-resort fallback list, used only when neither categories.json (HTTP)
// nor the build-generated window.__BUILTIN_APPS__ (file://) is available.
// Normally the generated page injects window.__BUILTIN_APPS__ from
// categories.json, so this array is rarely used and need not be kept in sync.
const BUILTIN_APPS = [
  { id: 'unity3d',    name: 'Unity3D',    color: '#EC407A', file: 'unity3d.html' },
  { id: 'gamedesign', name: 'GameDesign', color: '#29B6F6', file: 'gamedesign.html' },
  { id: 'blender',    name: 'Blender',    color: '#AB47BC', file: 'blender.html' },
  { id: 'csharp',     name: 'CSharp',     color: '#AB46BC', file: 'csharp.html' },
];

// Cached built-ins resolved from categories.json (when available).
let _jsonBuiltins = null;

// Reads categories.json (the build manifest) over HTTP and returns its
// entries shaped as app descriptors. Returns null on fetch failure so the
// caller can fall back to BUILTIN_APPS.
async function loadBuiltinsFromJson() {
  if (_jsonBuiltins) return _jsonBuiltins;
  try {
    const res = await fetch('categories.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.collections;
    if (!Array.isArray(list)) return null;
    const apps = list
      .filter(c => c && c.id && /^[a-z0-9-]+$/i.test(c.id))
      .map(c => ({
        id: c.id,
        name: c.name || c.id,
        color: c.color || '#5C6BC0',
        file: `${c.id}.html`,
      }));
    _jsonBuiltins = apps.length ? apps : null;
    return _jsonBuiltins;
  } catch {
    return null;
  }
}

function getAppsRegistry() {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem(APPS_REGISTRY_KEY) || '[]'); } catch {}
  const map = new Map();
  getFallbackBuiltins().forEach(a => map.set(a.id, a));
  custom.forEach(a => map.set(a.id, a)); // custom entries win on id collision
  return [...map.values()];
}

// The file:// fallback list. Prefers the build-generated window.__BUILTIN_APPS__
// (injected by build.js from categories.json) so it never drifts from the
// manifest; falls back to the hardcoded BUILTIN_APPS only if that is absent.
function getFallbackBuiltins() {
  if (typeof window !== 'undefined' && Array.isArray(window.__BUILTIN_APPS__) && window.__BUILTIN_APPS__.length) {
    return window.__BUILTIN_APPS__;
  }
  return BUILTIN_APPS;
}

// Async variant: prefers categories.json (HTTP) and falls back to the
// build-generated window.__BUILTIN_APPS__ (file://), then the last-resort
// hardcoded BUILTIN_APPS. Used at init to populate the switcher with the real,
// build-driven category list.
async function getAppsRegistryAsync() {
  const json = await loadBuiltinsFromJson();
  const base = json || getFallbackBuiltins();
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem(APPS_REGISTRY_KEY) || '[]'); } catch {}
  const map = new Map();
  base.forEach(a => map.set(a.id, a));
  custom.forEach(a => map.set(a.id, a));
  return [...map.values()];
}

function saveCustomApp(app) {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem(APPS_REGISTRY_KEY) || '[]'); } catch {}
  custom.push(app);
  localStorage.setItem(APPS_REGISTRY_KEY, JSON.stringify(custom));
}

function renderCategorySwitcher(apps) {
  const wrap = document.getElementById('categorySwitcher');
  if (!wrap) return;

  // Fall back to the synchronous registry if called without fetched apps.
  if (!apps) apps = getAppsRegistry();
  const myId = getAppName();
  const current = apps.find(a => a.id === myId) || { name: APP_LABEL || 'Category', color: APP_COLOR || 'var(--indigo)' };

  wrap.innerHTML = `
    <button class="category-toggle-btn" id="categoryToggleBtn">
      <span class="category-toggle-dot" style="background:${current.color}"></span>
      <span class="category-toggle-label">${escHtml(current.name)}</span>
      <svg class="category-toggle-chev" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
    </button>
    <div class="category-menu" id="categoryMenu">
      ${apps.map(a => `
        <a class="category-menu-item${a.id === myId ? ' active' : ''}" href="${escHtml(a.file)}">
          <span class="category-menu-dot" style="background:${a.color}"></span>${escHtml(a.name)}
        </a>`).join('')}
      <div class="category-menu-divider"></div>
      <button class="category-menu-item category-menu-create" id="categoryMenuCreateBtn">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create category…
      </button>
    </div>
  `;
  document.getElementById('categoryToggleBtn').addEventListener('click', toggleCategoryMenu);
  document.getElementById('categoryMenuCreateBtn').addEventListener('click', openCreateCategoryModal);
}

function toggleCategoryMenu() {
  const menu = document.getElementById('categoryMenu');
  const btn = document.getElementById('categoryToggleBtn');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  btn?.classList.toggle('menu-open', isOpen);
  if (isOpen) {
    setTimeout(() => {
      const close = (e) => {
        const wrap = document.getElementById('categorySwitcher');
        if (wrap && !wrap.contains(e.target)) {
          menu.classList.remove('open');
          btn?.classList.remove('menu-open');
          document.removeEventListener('click', close);
        }
      };
      document.addEventListener('click', close);
    }, 0);
  }
}

// ── Create category ──
function openCreateCategoryModal() {
  document.getElementById('categoryMenu')?.classList.remove('open');
  document.getElementById('categoryToggleBtn')?.classList.remove('menu-open');
  const input = document.getElementById('newCategoryName');
  if (input) input.value = '';
  state.selectedCategoryColor = COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)];
  renderCategoryColorPicker();
  openModal('createCategoryModal');
  setTimeout(() => input?.focus(), 100);
}

function renderCategoryColorPicker() {
  const cp = document.getElementById('categoryColorPicker');
  if (!cp) return;
  cp.innerHTML = COLLECTION_COLORS.map(c => `
    <div class="color-chip ${c === state.selectedCategoryColor ? 'selected' : ''}"
      style="background:${c}"
      data-action="select-color" data-target="category" data-color="${c}"></div>
  `).join('');
}

function selectCategoryColor(c) {
  state.selectedCategoryColor = c;
  renderCategoryColorPicker();
}

function slugifyAppName(name) {
  let base = name.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!base) base = 'category';
  let id = base, n = 2;
  const existingIds = getAppsRegistry().map(a => a.id);
  while (existingIds.includes(id)) { id = `${base}-${n}`; n++; }
  return id;
}

function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function createCategory() {
  const nameInput = document.getElementById('newCategoryName');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) { showToast('⚠️ Enter a category name'); return; }

  const id = slugifyAppName(name);
  const color = state.selectedCategoryColor || COLLECTION_COLORS[0];
  const file = `${id}.html`;

  saveCustomApp({ id, name, color, file });

  downloadTextFile(file, buildCategoryHtml(id, name, color), 'text/html');
  setTimeout(() => downloadTextFile(`${id}-collections.js`, buildCategoryCollectionsJs(id, name, color), 'text/javascript'), 250);
  setTimeout(() => downloadTextFile(`${id}-playlist.js`, buildCategoryPlaylistJs(), 'text/javascript'), 500);
  setTimeout(() => downloadTextFile(`${id}-watched.js`, buildCategoryWatchedJs(), 'text/javascript'), 750);
  // Ship page-template.js too so the new category page is self-contained
  // (it is referenced by the generated HTML and reused if another category
  // is created from that page later).
  setTimeout(() => {
    if (typeof PAGE_TEMPLATE !== 'undefined') {
      downloadTextFile('page-template.js', 'window.PAGE_TEMPLATE = ' + JSON.stringify(PAGE_TEMPLATE) + ';', 'text/javascript');
    }
  }, 1000);

  closeModal('createCategoryModal');
  renderCategorySwitcher();
  showToast(`✓ "${name}" created — save ${file} at the root and the 4 .js files (${id}-collections.js, ${id}-playlist.js, ${id}-watched.js, page-template.js) inside a ${id}/ folder`);
}

function buildCategoryCollectionsJs(id, name, color) {
  return `// --------------------------------------------------------------
// COLLECTIONS CONFIG — ${name}
// Starter file (empty — add your own).
//
// Each collection: id, name, color, groups: {}, ungrouped: []
// To apply as defaults: replace this file and clear localStorage.
// --------------------------------------------------------------

const COLLECTION_COLORS = [
  '#5C6BC0', '#EF5350', '#26A69A', '#FFA726',
  '#66BB6A', '#AB47BC', '#29B6F6', '#FF7043',
  '#78909C', '#EC407A'
];

const DEFAULT_COLLECTIONS = [
  {
    id: ${jsStr(id)},
    name: ${jsStr(name)},
    color: ${jsStr(color)},
    groups: {},
    ungrouped: []
  }
];
`;
}

function buildCategoryPlaylistJs() {
  return `// --------------------------------------------------------------
// PLAYLIST CONFIG
// Starter file (no playlists yet — create some in the app).
//
// Each playlist: id, name, color, videoIds, videos (full details)
// To apply as defaults: replace this file and clear localStorage.
// --------------------------------------------------------------

const DEFAULT_PLAYLISTS = [];
`;
}

function buildCategoryWatchedJs() {
  return `// --------------------------------------------------------------
// WATCHED HISTORY
//
// WATCHED_VIDEO_IDS: YouTube video IDs marked as watched.
// To restore: replace this file with an exported watched.js
// and clear localStorage.
// --------------------------------------------------------------

const WATCHED_VIDEO_IDS = [];
`;
}

// Builds a full standalone category page from the shared PAGE_TEMPLATE
// (generated by build.js -> page-template.js), keeping runtime category
// creation in lock-step with the built-in pages. Token substitution itself
// goes through TemplateTokens.renderTemplate (template-tokens.js) — the same
// renderer build.js uses — instead of a second, separately-maintained
// .replace() chain here, so the two can't quietly drift apart again. No
// fetch: works on GitHub Pages and when opened via file://.
function buildCategoryHtml(id, name, color) {
  if (typeof PAGE_TEMPLATE === 'undefined') {
    showToast('⚠️ page-template.js missing — category page not generated');
    return '';
  }
  if (typeof TemplateTokens === 'undefined') {
    showToast('⚠️ template-tokens.js missing — category page not generated');
    return '';
  }
  const dir = id + '/';
  // getAppsRegistry() already returns {id, name, color, file} entries, and
  // by the time this runs the new category has already been saved into it
  // (see createCategory()), so the page's own switcher fallback includes
  // itself alongside every other known category.
  return TemplateTokens.renderTemplate(PAGE_TEMPLATE, {
    id, label: name, color, dir,
    builtinApps: getAppsRegistry(),
  });
}


// ──────────────────────────────────────────────
// BRANDING (per-app title / logo subtitle / accent)
// Uses APP_NAME / APP_LABEL / APP_COLOR set in each app's HTML
// ──────────────────────────────────────────────
function applyAppBranding() {
  const label = typeof APP_LABEL !== 'undefined' ? APP_LABEL : '';
  const color = typeof APP_COLOR !== 'undefined' ? APP_COLOR : '';
  if (label) document.title = `TholsStudio — ${label}`;
  const sub = document.getElementById('appSubtitle');
  if (sub && label) sub.textContent = label;
  if (color) {
    document.documentElement.style.setProperty('--indigo', color);
    const icon = document.querySelector('.logo-icon');
    if (icon) icon.style.background = color;
  }
}

// Keeps the "Export as …" dropdown labels honest — they now show the actual
// app-prefixed filename (e.g. "Export as music-playlist.js") instead of the
// generic name, matching what confirmExport() actually writes to disk.
function updateExportMenuLabels() {
  const appName = getAppName();
  const map = {
    exportCollectionsLabel: appName + '-collections.js',
    exportWatchedLabel: appName + '-watched.js',
    exportPlaylistLabel: appName + '-playlist.js',
  };
  Object.entries(map).forEach(([id, filename]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'Export as ' + filename;
  });
}

// ──────────────────────────────────────────────
// EVENT WIRING — every interaction in the app dispatches through here.
//
// There are no inline on*="..." attributes left anywhere in this file or in
// page-template.html. Elements carry data-action (or data-mousedown-action)
// instead, naming a handler below; a small number of one-off elements that
// are freshly created and immediately looked up by a unique id (the rename
// inputs, the floating playlist pickers, the category switcher) are wired
// directly with addEventListener right where they're built, the same way
// startTitleEdit() already did before this file had any of this — that
// part didn't need to change.
//
// Everything else goes through ONE listener per event type, attached to
// document.body a single time, down at the bottom of this file. Because
// that listener lives on an element that's never destroyed or replaced,
// setting it up once is enough: re-rendering the sidebar/cards/track list
// (which happens on nearly every state change here) never needs to
// re-wire anything, and can never accumulate duplicate listeners the way
// attaching a listener inside a render function would (see makeSortable()'s
// container-level dragover/drop listeners for the shape of that problem —
// not touched here, since drag-and-drop was never wired via on*="..." in
// the first place). renderLocationPicker() already used this exact
// closest()-based dispatch pattern for its own body.onclick; everything
// below just extends the same idea to the rest of the app.
//
// Each handler receives (el, event): `el` is the closest element carrying
// the matching data-action — the direct replacement for `this` in the old
// inline-attribute code, and for event.currentTarget, which would
// otherwise (incorrectly) resolve to document.body here.
function dispatchEl(event, attr) {
  const el = event.target.closest(`[${attr}]`);
  return el && document.body.contains(el) ? el : null;
}

const CLICK_ACTIONS = {
  'open-import-modal': () => openImportModal(),
  'open-add-modal': () => openAddModal(),
  'toggle-sidebar-section': (el) => toggleSidebarSection(el.dataset.section, el.querySelector('.section-chev')),
  'filter-collection': (el) => {
    if (el.classList.contains('was-dragging')) { el.classList.remove('was-dragging'); return; }
    filterByCollection(el.dataset.filter, el);
  },
  'filter-playlist-row': (el) => {
    if (el.classList.contains('was-dragging')) { el.classList.remove('was-dragging'); return; }
    if (el.querySelector('.col-rename-input')) return;
    filterByCollection(el.dataset.filter, el);
  },
  'start-new-collection': () => startNewCollection(),
  'open-playlist-modal': () => openPlaylistModal(),
  'pv-set-mode': (el) => pvSetMode(el.dataset.mode),
  'pv-toggle-autoplay': () => pvToggleAutoplay(),
  'pv-track-click': (el) => pvTrackClick(el, parseInt(el.dataset.index, 10)),
  'close-pv-view': () => closePvView(),
  'toggle-location-picker': () => toggleLocationPicker(),
  'quick-add': () => quickAdd(),
  'clear-export-folder': () => clearExportFolder(),
  'browse-export-folder': () => browseExportFolder(),
  'toggle-export-menu': () => toggleExportMenu(),
  'export-data': () => exportData(),
  'export-collections-js': () => exportCollectionsJs(),
  'export-watched-js': () => exportWatchedJs(),
  'export-playlist-js': () => exportPlaylistJs(),
  'export-all-js': () => exportAllJs(),
  'set-view': (el) => setView(el.dataset.view),
  'close-modal': (el) => closeModal(el.dataset.modal),
  'save-video': () => saveVideo(),
  'save-collection': () => saveCollection(),
  'save-playlist': () => savePlaylist(),
  'save-group': () => saveGroup(),
  'confirm-export': () => confirmExport(),
  'import-urls': () => importUrls(),
  'save-move-group': () => saveMoveGroup(),
  'create-category': () => createCategory(),
  'close-confirm-modal': () => closeConfirmModal(),
  'confirm-ok': () => confirmOk(),
  'open-collection-playlist-picker': (el, event) => openCollectionPlaylistPicker(event, el.dataset.id, el),
  'rename-collection': (el, event) => startRename(event, el.dataset.id),
  'delete-collection': (el, event) => deleteCollection(event, el.dataset.id),
  'rename-playlist': (el, event) => startPlaylistRename(event, el.dataset.id),
  'clear-playlist': (el) => clearPlaylist(el.dataset.id),
  'delete-playlist': (el) => deletePlaylist(el.dataset.id),
  'toggle-group': (el) => toggleGroup(el.dataset.key),
  'open-group-playlist-picker': (el, event) => openGroupPlaylistPicker(event, el.dataset.colId, el.dataset.group, el),
  'rename-group': (el) => renameGroupPrompt(el.dataset.colId, el.dataset.group),
  'delete-group': (el) => deleteGroupPrompt(el.dataset.colId, el.dataset.group),
  'open-group-modal': (el) => openGroupModal(el.dataset.colId),
  'mark-watched': (el) => markWatched(el.dataset.id),
  'start-title-edit': (el, event) => { event.stopPropagation(); startTitleEdit(el.dataset.id); },
  'open-move-group-modal': (el) => openMoveGroupModal(el.dataset.id),
  'toggle-note': (el) => toggleNote(el.dataset.id),
  'copy-url': (el) => {
    const v = state.videos.find(v => v.id === el.dataset.id);
    if (v) copyUrl(v.url);
  },
  'toggle-watched': (el) => toggleWatched(el.dataset.id),
  'open-playlist-picker': (el) => openPlaylistPicker(el.dataset.id, el),
  'delete-video': (el) => deleteVideo(el.dataset.id),
  'select-color': (el) => {
    const SETTERS = { collection: selectColor, playlist: selectPlaylistColor, category: selectCategoryColor };
    SETTERS[el.dataset.target]?.(el.dataset.color);
  },
};

const INPUT_ACTIONS = {
  'search-input': () => handleSearch(),
  'pv-search-input': () => pvHandleSearch(),
  'add-url-input': () => { previewUrl(); checkAddDuplicate(); },
  'add-group-new-input': () => checkAddDuplicate(),
};

const CHANGE_ACTIONS = {
  'add-collection-change': () => { refreshGroupSelect('addCollection', 'addGroup'); checkAddDuplicate(); },
  'add-group-change': () => checkAddDuplicate(),
  'import-collection-change': () => refreshGroupSelect('importCollection', 'importGroup'),
};

// Each of these mirrors the original onkeydown="if(event.key==='Enter') fn()"
// — only Enter is handled; every other key is ignored, same as before.
const KEYDOWN_ACTIONS = {
  'quick-add-keydown': (el, event) => { if (event.key === 'Enter') quickAdd(); },
  'playlist-name-keydown': (el, event) => { if (event.key === 'Enter') savePlaylist(); },
  'group-name-keydown': (el, event) => { if (event.key === 'Enter') saveGroup(); },
  'category-name-keydown': (el, event) => { if (event.key === 'Enter') createCategory(); },
};

// blur doesn't bubble, so this is wired on the bubbling 'focusout' event
// instead — same moment, just delegable.
const FOCUSOUT_ACTIONS = {
  'save-note': (el) => saveNote(el.dataset.id, el.value),
};

// error doesn't bubble either; handled below via a capture-phase listener,
// which (unlike bubble-phase) still reaches document.body for these.
const ERROR_ACTIONS = {
  'thumb-error': (el) => { el.style.display = 'none'; el.nextElementSibling.style.display = 'flex'; },
  'pv-thumb-error': (el) => { el.style.visibility = 'hidden'; },
};

const MOUSEDOWN_ACTIONS = {
  'stop-propagation': (el, event) => event.stopPropagation(),
  'start-title-edit-btn': (el, event) => {
    event.stopPropagation();
    event.preventDefault();
    startTitleEdit(el.dataset.id);
  },
};

function wireDelegatedEvents() {
  document.body.addEventListener('click', (event) => {
    const el = dispatchEl(event, 'data-action');
    if (el) CLICK_ACTIONS[el.dataset.action]?.(el, event);
  });
  document.body.addEventListener('input', (event) => {
    const el = dispatchEl(event, 'data-action');
    if (el) INPUT_ACTIONS[el.dataset.action]?.(el, event);
  });
  document.body.addEventListener('change', (event) => {
    const el = dispatchEl(event, 'data-action');
    if (el) CHANGE_ACTIONS[el.dataset.action]?.(el, event);
  });
  document.body.addEventListener('keydown', (event) => {
    const el = dispatchEl(event, 'data-action');
    if (el) KEYDOWN_ACTIONS[el.dataset.action]?.(el, event);
  });
  document.body.addEventListener('focusout', (event) => {
    const el = dispatchEl(event, 'data-action');
    if (el) FOCUSOUT_ACTIONS[el.dataset.action]?.(el, event);
  });
  document.body.addEventListener('error', (event) => {
    const el = dispatchEl(event, 'data-action');
    if (el) ERROR_ACTIONS[el.dataset.action]?.(el, event);
  }, true); // capture phase — 'error' doesn't bubble
  document.body.addEventListener('mousedown', (event) => {
    const el = dispatchEl(event, 'data-mousedown-action');
    if (el) MOUSEDOWN_ACTIONS[el.dataset.mousedownAction]?.(el, event);
  });
}

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
applyAppBranding();
wireDelegatedEvents();
seedData();
restoreExportFolder();
renderSidebar();
renderCards();
renderCategorySwitcher();
updateExportMenuLabels();

// Re-render the category switcher with the real list from categories.json
// when served over HTTP; on file:// the fetch fails and the hardcoded
// fallback (rendered above) stays in place. This keeps the bottom menu in
// sync with the build manifest without manual edits.
getAppsRegistryAsync().then(apps => renderCategorySwitcher(apps));
