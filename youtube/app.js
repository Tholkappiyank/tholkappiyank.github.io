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
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
      // e.g. https://www.youtube.com/watch?v=fjOdtSu4Lm4&list=PLxxxx
      const v = u.searchParams.get('v');
      if (v) return v;
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
    if (list) return list;
  } catch {}
  // fallback regex
  const m = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function getThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function getWatchUrl(videoId, playlistId) {
  return playlistId
    ? `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
    : `https://www.youtube.com/watch?v=${videoId}`;
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
let dragSrcIndex = null;

function renderSidebar() {
  const list = document.getElementById('collectionsList');
  list.innerHTML = '';

  state.collections.forEach((col, index) => {
    const count = state.videos.filter(v => v.collection === col.id).length;

    const btn = document.createElement('button');
    btn.className = 'sidebar-item draggable';
    btn.dataset.index = index;
    btn.dataset.colId = col.id;
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
        <button class="col-action-btn" title="Add collection to playlist" onclick="openCollectionPlaylistPicker(event,'${col.id}')">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button class="col-action-btn" title="Rename" onclick="startRename(event,'${col.id}')">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="col-action-btn danger" title="Delete collection" onclick="deleteCollection(event,'${col.id}')">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </span>
    `;

    // Click to filter (ignore if drag started)
    btn.addEventListener('click', (e) => {
      if (btn.classList.contains('was-dragging')) {
        btn.classList.remove('was-dragging');
        return;
      }
      filterByCollection(col.id, btn);
    });

    // ── Drag events ──
    btn.addEventListener('dragstart', (e) => {
      dragSrcIndex = index;
      btn.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
      // Small delay so the drag ghost renders before opacity drops
      setTimeout(() => btn.classList.add('dragging'), 0);
    });

    btn.addEventListener('dragend', () => {
      btn.classList.remove('dragging');
      btn.classList.add('was-dragging');
      clearDropIndicators();
    });

    btn.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetIndex = parseInt(btn.dataset.index);
      if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
      clearDropIndicators();
      // Determine top/bottom half
      const rect = btn.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        btn.classList.add('drag-over-top');
      } else {
        btn.classList.add('drag-over-bottom');
      }
    });

    btn.addEventListener('dragleave', () => {
      btn.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    btn.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearDropIndicators();
      const targetIndex = parseInt(btn.dataset.index);
      if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

      // Determine insert position
      const rect = btn.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let insertAt = e.clientY < midY ? targetIndex : targetIndex + 1;

      // Reorder
      const moved = state.collections.splice(dragSrcIndex, 1)[0];
      if (insertAt > dragSrcIndex) insertAt--;
      state.collections.splice(insertAt, 0, moved);

      dragSrcIndex = null;
      save();
      renderSidebar();
      renderCards();
      showToast(`↕ "${moved.name}" reordered`);
    });

    list.appendChild(btn);
  });

  // Drop on the list container itself (drop below all items)
  list.addEventListener('dragover', (e) => e.preventDefault());
  list.addEventListener('drop', (e) => {
    // Only fires if not caught by a child item (i.e. dropped on empty space)
    if (dragSrcIndex === null) return;
    const moved = state.collections.splice(dragSrcIndex, 1)[0];
    state.collections.push(moved);
    dragSrcIndex = null;
    clearDropIndicators();
    save();
    renderSidebar();
    renderCards();
    showToast(`↕ "${moved.name}" moved to bottom`);
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

let plDragSrcIndex = null;

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
        <button class="col-action-btn" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();startPlaylistRename(event,'${pl.id}')" title="Rename playlist">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="col-action-btn" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();clearPlaylist('${pl.id}')" title="Clear all items">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
        <button class="col-action-btn danger" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();deletePlaylist('${pl.id}')" title="Delete playlist">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </span>`;

    btn.addEventListener('click', (e) => {
      if (btn.classList.contains('was-dragging')) {
        btn.classList.remove('was-dragging');
        return;
      }
      if (btn.querySelector('.col-rename-input')) return;
      filterByCollection(`playlist:${pl.id}`, btn);
    });

    btn.addEventListener('dragstart', (e) => {
      plDragSrcIndex = index;
      btn.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
      setTimeout(() => btn.classList.add('dragging'), 0);
    });

    btn.addEventListener('dragend', () => {
      btn.classList.remove('dragging');
      btn.classList.add('was-dragging');
      clearDropIndicators();
    });

    btn.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetIndex = parseInt(btn.dataset.index);
      if (plDragSrcIndex === null || plDragSrcIndex === targetIndex) return;
      clearDropIndicators();
      const rect = btn.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        btn.classList.add('drag-over-top');
      } else {
        btn.classList.add('drag-over-bottom');
      }
    });

    btn.addEventListener('dragleave', () => {
      btn.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    btn.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearDropIndicators();
      const targetIndex = parseInt(btn.dataset.index);
      if (plDragSrcIndex === null || plDragSrcIndex === targetIndex) return;

      const rect = btn.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let insertAt = e.clientY < midY ? targetIndex : targetIndex + 1;

      const moved = state.playlists.splice(plDragSrcIndex, 1)[0];
      if (insertAt > plDragSrcIndex) insertAt--;
      state.playlists.splice(insertAt, 0, moved);

      plDragSrcIndex = null;
      save();
      renderSidebar();
      showToast(`↕ "${moved.name}" reordered`);
    });

    list.appendChild(btn);
  });

  list.addEventListener('dragover', (e) => e.preventDefault());
  list.addEventListener('drop', (e) => {
    if (plDragSrcIndex === null) return;
    const moved = state.playlists.splice(plDragSrcIndex, 1)[0];
    state.playlists.push(moved);
    plDragSrcIndex = null;
    clearDropIndicators();
    save();
    renderSidebar();
    showToast(`↕ "${moved.name}" moved to bottom`);
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

function clearDropIndicators() {
  document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(el => {
    el.classList.remove('drag-over-top', 'drag-over-bottom');
  });
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
        maxlength="40"
        onkeydown="handleRenameKey(event,'${colId}')"
        onblur="cancelRename('${colId}')">
      <button class="col-rename-confirm" onmousedown="confirmRename(event,'${colId}')">✓</button>
    </span>
  `;
  // Prevent dragging while renaming
  btn.draggable = false;

  const input = document.getElementById(`rename-input-${colId}`);
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
        maxlength="40"
        onkeydown="handlePlaylistRenameKey(event,'${plId}')"
        onblur="cancelPlaylistRename('${plId}')">
      <button class="col-rename-confirm" onmousedown="confirmPlaylistRename(event,'${plId}')">✓</button>
    </span>
  `;

  const input = document.getElementById(`pl-rename-input-${plId}`);
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
  else if (currentFilter.startsWith('playlist:')) {
    const plId = currentFilter.slice(9);
    const pl = state.playlists.find(p => p.id === plId);
    vids = pl ? vids.filter(v => pl.videoIds.includes(v.id)) : [];
  }
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
  html += `<div class="group-header group-header--collection" onclick="toggleGroup('${colKey}')">
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
      <div class="group-header" onclick="toggleGroup('${gKey}')">
        <span class="${gChevClass}" id="chev-${gKey}">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
        <div class="group-title-wrap">
          <div class="group-title-row">
            <span class="group-title">${escHtml(gName)}</span>
            <span class="group-count">${gVids.length}</span>
            <div class="group-header-line"></div>
          </div>
          <div class="group-header-actions" onclick="event.stopPropagation()">
            <button class="group-action-btn" onclick="openGroupPlaylistPicker(event,'${escAttr(colId)}','${escAttr(gName)}')" title="Add group to playlist">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button class="group-action-btn" onclick="renameGroupPrompt('${escAttr(colId)}','${escAttr(gName)}')" title="Rename group">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="group-action-btn danger" onclick="deleteGroupPrompt('${escAttr(colId)}','${escAttr(gName)}')" title="Delete group">
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
      <button class="add-collection-btn" onclick="openGroupModal('${escAttr(colId)}')">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New group
      </button>
    </div>`;
  }

  return html;
}

function renderCard(v) {
  const col = state.collections.find(c => c.id === v.collection);
  const isPlaylistView = currentFilter.startsWith('playlist:');
  // In single-collection view, don't show the collection tag — group header handles it
  const showColTag = currentFilter === 'all' || currentFilter === 'recent' || currentFilter === 'watched' || isPlaylistView;
  // Build breadcrumb: Collection / Group
  const colPath = col ? (v.group ? `${col.name} / ${v.group}` : col.name) : (v.collection ? '' : (v.group ? v.group : ''));
  const colTag = (showColTag && colPath) ? `<span class="card-collection-tag" title="${colPath}"><span class="tag-dot" style="background:${col ? col.color : 'var(--text-dim)'}"></span>${colPath}</span>` : '';
  const noteHtml = v.note ? `<div class="card-note" id="note-text-${v.id}">${escHtml(v.note)}</div>` : '';
  const watchedStyle = v.watched ? 'opacity:0.6;' : '';

  return `
<div class="video-card${currentView === 'list' ? ' list-view' : ''}" id="card-${v.id}" style="${watchedStyle}">
  <div class="card-thumb">
    <img src="${getThumbnail(v.videoId)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="card-thumb-placeholder" style="display:none;">
      <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" opacity="0.3">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
      </svg>
    </div>
    <div class="card-play-overlay">
      <a href="${getWatchUrl(v.videoId, v.playlistId)}" target="_blank" class="play-btn" onclick="markWatched('${v.id}')">
        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </a>
    </div>
  </div>
  <div class="card-body">
    ${colTag}
    <div class="card-title-row">
      <div class="card-title" id="title-${v.id}" onclick="event.stopPropagation();startTitleEdit('${v.id}')" title="Click to edit title">${escHtml(v.title || 'Untitled Video')}</div>
      <button class="card-title-edit-btn" onmousedown="event.stopPropagation();event.preventDefault();startTitleEdit('${v.id}')" title="Edit title">
        <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>
    ${v.channel ? `<div class="card-channel">${escHtml(v.channel)}</div>` : ''}
    ${noteHtml}
    <textarea class="note-edit" id="note-edit-${v.id}" rows="2" placeholder="Add a note…" onblur="saveNote('${v.id}', this.value)">${escHtml(v.note||'')}</textarea>
    <div class="card-meta">
      <div class="card-actions">
        <button class="card-action-btn" onclick="openMoveGroupModal('${v.id}')" title="Move to group">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        </button>
        <button class="card-action-btn" onclick="toggleNote('${v.id}')" title="Edit note">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="card-action-btn" onclick="copyUrl('${v.url}')" title="Copy URL">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        </button>
        <button class="card-action-btn" onclick="toggleWatched('${v.id}')" title="${v.watched ? 'Mark unwatched' : 'Mark watched'}">
          <svg width="12" height="12" fill="${v.watched ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="card-action-btn" onclick="openPlaylistPicker('${v.id}', this)" title="Add to playlist">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
        ${isPlaylistView ? `<button class="card-action-btn danger" onclick="removeFromCurrentPlaylist('${v.id}')" title="Remove from playlist">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>` : ''}
        <button class="card-action-btn danger" onclick="deleteVideo('${v.id}')" title="Delete video">
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
function escAttr(str) {
  return String(str||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

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
  const playBtn = document.getElementById('playPlaylistBtn');
  if (titles[id]) {
    document.getElementById('sectionTitle').textContent = titles[id];
    if (playBtn) playBtn.style.display = 'none';
  } else {
    const col = state.collections.find(c => c.id === id);
    document.getElementById('sectionTitle').textContent = col ? col.name : 'Collection';
    if (playBtn) playBtn.style.display = 'none';
  }
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

  const existing = state.videos.find(v => v.videoId === videoId && (v.collection || '') === (colId || '') && (v.group || '') === (group || ''));
  if (existing) {
    const location = col ? (group ? `${col.name} / ${group}` : col.name) : (group || 'Uncollected');
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
  const save = () => {
    if (saved) return;
    saved = true;
    const newTitle = input.value.trim();
    v.title = newTitle || v.title;
    saveState();
    titleEl.innerHTML = escHtml(v.title || 'Untitled Video');
    if (document.getElementById('pvTracks')) pvRenderList();
  };
  input.addEventListener('blur', save);
  input.addEventListener('click', e => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); input.blur(); }
    if (e.key === 'Escape') { saved = true; titleEl.innerHTML = escHtml(v.title || 'Untitled Video'); }
  });
}

// save alias that doesn't conflict with the global save() name
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      onclick="selectColor('${c}')"></div>
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
      onclick="selectPlaylistColor('${c}')"></div>
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

function removeFromCurrentPlaylist(videoId) {
  if (!currentFilter.startsWith('playlist:')) return;
  const plId = currentFilter.slice(9);
  removeVideoFromPlaylist(videoId, plId);
}

// Shows a playlist picker to add all videos in a GROUP to a chosen playlist
function openGroupPlaylistPicker(e, colId, groupName) {
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
      return `<button class="playlist-picker-item${allIn ? ' in-playlist' : ''}"
        onclick="event.stopPropagation();addGroupToPlaylist('${escAttr(colId)}','${escAttr(groupName)}','${pl.id}');document.querySelectorAll('.playlist-picker').forEach(e=>e.remove())">
        ${checkIcon}
        ${escHtml(pl.name)} <span style="opacity:0.5;font-size:10px;margin-left:4px;">${label}</span>
      </button>`;
    }).join('')}`;

  document.body.appendChild(picker);
  const rect = e.currentTarget.getBoundingClientRect();
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
function openCollectionPlaylistPicker(e, colId) {
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
      return `<button class="playlist-picker-item${allIn ? ' in-playlist' : ''}"
        onclick="event.stopPropagation();addCollectionToPlaylist('${colId}','${pl.id}');document.querySelectorAll('.playlist-picker').forEach(e=>e.remove())">
        ${checkIcon}
        ${escHtml(pl.name)} <span style="opacity:0.5;font-size:10px;margin-left:4px;">${label}</span>
      </button>`;
    }).join('')}`;

  document.body.appendChild(picker);
  const anchorEl = e.currentTarget;
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
      return `<button class="playlist-picker-item${has ? ' in-playlist' : ''}"
        onclick="event.stopPropagation();${has ? `removeVideoFromPlaylist('${videoId}','${pl.id}')` : `addVideoToPlaylist('${videoId}','${pl.id}')`};document.querySelectorAll('.playlist-picker').forEach(e=>e.remove())">
        ${icon}
        ${escHtml(pl.name)}
      </button>`;
    }).join('')}`;

  document.body.appendChild(picker);

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
function exportCollectionsJs() {
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

  closeExportMenu();
  showExportConfirm(
    'Export Collections',
    'Export your collections and videos as a JavaScript file.',
    'File: ' + fileName + '\nContains: ' + state.collections.length + ' collection(s), ' + state.videos.length + ' video(s)' + (colDetails ? '\n\n' + colDetails : ''),
    () => {
      saveToFolderOrDownload(fileName, fileContents, 'text/javascript').then(saved => {
        showToast(saved ? ('✓ Saved ' + fileName + ' to folder') : ('✓ Exported as ' + fileName));
      });
    }
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

function exportWatchedJs() {
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
  closeExportMenu();
  showExportConfirm(
    'Export Watched',
    'Export your watched video history as a JavaScript file.',
    'File: ' + fileName + '\nContains: ' + n + ' watched video(s)',
    () => {
      saveToFolderOrDownload(fileName, fileContents, 'text/javascript').then(saved => {
        const dest = saved ? ('to folder') : ('as ' + fileName);
        if (n === 0) showToast('\u26a0\ufe0f No watched videos — exported empty ' + fileName);
        else showToast('\u2713 Saved ' + n + ' watched video' + (n !== 1 ? 's' : '') + ' ' + dest);
      });
    }
  );
}

function exportPlaylistJs() {
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
  closeExportMenu();
  showExportConfirm(
    'Export Playlists',
    'Export your playlists as a JavaScript file.',
    'File: ' + fileName + '\n\nPlaylists: ' + n + '\nTotal videos: ' + totalVideos + '\n\n' + playlistDetails,
    () => {
      saveToFolderOrDownload(fileName, fileContents, 'text/javascript').then(saved => {
        showToast('\u2713 ' + (saved ? 'Saved' : 'Exported') + ' ' + n + ' playlist' + (n !== 1 ? 's' : '') + ' ' + (saved ? 'to folder' : ('as ' + fileName)));
      });
    }
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
      exportCollectionsJs();
      setTimeout(function() { exportPlaylistJs(); }, 300);
      setTimeout(function() { exportWatchedJs(); }, 600);
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
// CARD DRAG-AND-DROP (item reorder within group)
// ──────────────────────────────────────────────
function attachCardDrag() {
  document.querySelectorAll('.cards-grid').forEach(grid => {
    const cards = Array.from(grid.querySelectorAll(':scope > .video-card'));
    if (cards.length < 2) return;

    cards.forEach(card => {
      card.draggable = true;

      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);
        setTimeout(() => card.classList.add('card-dragging'), 0);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('card-dragging');
        grid.querySelectorAll('.card-drag-over').forEach(el => el.classList.remove('card-drag-over'));
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        grid.querySelectorAll('.card-drag-over').forEach(el => el.classList.remove('card-drag-over'));
        card.classList.add('card-drag-over');
      });

      card.addEventListener('dragleave', (e) => {
        if (!card.contains(e.relatedTarget)) card.classList.remove('card-drag-over');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('card-drag-over');
        const srcId = e.dataTransfer.getData('text/plain');
        if (srcId === card.id) return;
        const srcCard = document.getElementById(srcId);
        if (!srcCard || srcCard.closest('.cards-grid') !== grid) return;

        // Reorder in DOM
        const allCards = Array.from(grid.querySelectorAll(':scope > .video-card'));
        const srcIdx = allCards.indexOf(srcCard);
        const tgtIdx = allCards.indexOf(card);
        if (srcIdx < tgtIdx) grid.insertBefore(srcCard, card.nextSibling);
        else grid.insertBefore(srcCard, card);

        saveCardOrder(grid);
      });
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

let pvDragSrcIndex = null;

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
    const thumb = `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`;
    const isActive = i === pvState.index;
    return `<div class="pv-track${isActive ? ' active' : ''}" onclick="pvTrackClick(event, ${i})" id="pvt-${i}" draggable="true" data-pv-index="${i}">
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
      <img class="pv-track-thumb" src="${thumb}" loading="lazy" onerror="this.style.visibility='hidden'">
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

function pvTrackClick(event, i) {
  const track = event.currentTarget;
  if (track.classList.contains('was-dragging')) {
    track.classList.remove('was-dragging');
    return;
  }
  pvPlayIndex(i);
}

function pvAttachTrackDrag() {
  const tracks = document.getElementById('pvTracks');
  if (!tracks) return;

  function clearIndicators() {
    tracks.querySelectorAll('.pv-track-drag-over-top, .pv-track-drag-over-bottom').forEach(t => t.classList.remove('pv-track-drag-over-top', 'pv-track-drag-over-bottom'));
  }

  tracks.querySelectorAll('.pv-track').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      pvDragSrcIndex = parseInt(el.dataset.pvIndex);
      el.classList.add('pv-track-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', pvDragSrcIndex);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('pv-track-dragging');
      el.classList.add('was-dragging');
      clearIndicators();
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const targetIndex = parseInt(el.dataset.pvIndex);
      if (pvDragSrcIndex === null || pvDragSrcIndex === targetIndex) return;
      clearIndicators();
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        el.classList.add('pv-track-drag-over-top');
      } else {
        el.classList.add('pv-track-drag-over-bottom');
      }
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('pv-track-drag-over-top', 'pv-track-drag-over-bottom');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      clearIndicators();
      const targetIndex = parseInt(el.dataset.pvIndex);
      if (pvDragSrcIndex === null || pvDragSrcIndex === targetIndex) return;

      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let insertAt = e.clientY < midY ? targetIndex : targetIndex + 1;

      const moved = pvState.order.splice(pvDragSrcIndex, 1)[0];
      if (insertAt > pvDragSrcIndex) insertAt--;
      pvState.order.splice(insertAt, 0, moved);

      const oldPlaying = pvState.index;
      if (pvDragSrcIndex === oldPlaying) {
        pvState.index = insertAt;
      } else if (pvDragSrcIndex < oldPlaying && insertAt >= oldPlaying) {
        pvState.index--;
      } else if (pvDragSrcIndex > oldPlaying && insertAt <= oldPlaying) {
        pvState.index++;
      }

      pvDragSrcIndex = null;
      pvSaveOrderToPlaylist();
      pvRenderList();
      showToast('✓ Playlist order saved');
    });
  });

  // Allow drop on empty space at the bottom
  tracks.addEventListener('dragover', (e) => e.preventDefault());
  tracks.addEventListener('drop', (e) => {
    if (pvDragSrcIndex === null) return;
    clearIndicators();
    const moved = pvState.order.splice(pvDragSrcIndex, 1)[0];
    pvState.order.push(moved);
    const oldPlaying = pvState.index;
    if (pvDragSrcIndex === oldPlaying) pvState.index = pvState.order.length - 1;
    else if (pvDragSrcIndex < oldPlaying) pvState.index--;
    pvDragSrcIndex = null;
    pvSaveOrderToPlaylist();
    pvRenderList();
    showToast('✓ Playlist order saved');
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
      `<iframe src="https://www.youtube.com/embed/${v.videoId}?autoplay=1&rel=0&enablejsapi=1"
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
  const playBtn = document.getElementById('playPlaylistBtn');
  if (playBtn) playBtn.style.display = 'none';
  renderCards();
}

// ──────────────────────────────────────────────
// PLAYLIST PLAYER
let playlistPlayer = {
  active: false,
  plId: null,
  order: [],    // array of video IDs in play order
  index: 0,     // current position in order
  mode: 'sequential', // 'sequential' | 'random'
};

function startPlaylistPlayer() {
  if (!currentFilter.startsWith('playlist:')) return;
  const plId = currentFilter.slice(9);
  const pl = state.playlists.find(p => p.id === plId);
  if (!pl || !pl.videoIds.length) { showToast('⚠️ Playlist is empty'); return; }

  playlistPlayer.plId = plId;
  playlistPlayer.active = true;
  playlistPlayer.mode = playlistPlayer.mode || 'sequential';
  buildPlayOrder(pl);
  playlistPlayer.index = 0;
  updatePlayerBar();
  openCurrentPlaylistVideo();
}

function buildPlayOrder(pl) {
  const ids = [...pl.videoIds];
  if (playlistPlayer.mode === 'random') {
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  playlistPlayer.order = ids;
}

function openCurrentPlaylistVideo() {
  const order = playlistPlayer.order;
  if (!order.length) return;
  const idx = Math.max(0, Math.min(playlistPlayer.index, order.length - 1));
  playlistPlayer.index = idx;
  const vid = state.videos.find(v => v.id === order[idx]);
  if (!vid) { playlistStep(1); return; } // skip deleted videos
  markWatched(vid.id);
  window.open(getWatchUrl(vid.videoId, vid.playlistId), '_blank');
  updatePlayerBar();
  // Highlight the current card
  document.querySelectorAll('.video-card').forEach(el => el.classList.remove('pp-active'));
  const card = document.getElementById('card-' + vid.id);
  if (card) {
    card.classList.add('pp-active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function playlistStep(dir) {
  const order = playlistPlayer.order;
  if (!order.length) return;
  let next = playlistPlayer.index + dir;
  if (next < 0) next = order.length - 1;
  if (next >= order.length) next = 0;
  playlistPlayer.index = next;
  openCurrentPlaylistVideo();
}

function setPlaylistMode(mode) {
  if (playlistPlayer.mode === mode) return;
  playlistPlayer.mode = mode;
  const pl = state.playlists.find(p => p.id === playlistPlayer.plId);
  if (pl) buildPlayOrder(pl);
  playlistPlayer.index = 0;
  updatePlayerBar();
  showToast(mode === 'random' ? '🔀 Random play on' : '➡️ Sequential play on');
}

function updatePlayerBar() {
  const bar = document.getElementById('playlistPlayerBar');
  if (!bar) return;
  const pl = state.playlists.find(p => p.id === playlistPlayer.plId);
  if (!pl || !playlistPlayer.active) {
    bar.style.display = 'none';
    document.querySelector('.main')?.classList.remove('has-player-bar');
    return;
  }

  bar.style.display = 'flex';
  document.querySelector('.main')?.classList.add('has-player-bar');

  // Playlist name + dot
  document.getElementById('ppbName').textContent = pl.name;
  document.getElementById('ppbDot').style.background = pl.color || '#78909C';

  // Current video title
  const order = playlistPlayer.order;
  const idx = playlistPlayer.index;
  const currentVid = order.length ? state.videos.find(v => v.id === order[idx]) : null;
  const titleEl = document.getElementById('ppbVideoTitle');
  if (titleEl) titleEl.textContent = currentVid ? (currentVid.title || currentVid.url || '—') : '—';

  // Counter: current / total
  document.getElementById('ppbTrack').textContent = order.length
    ? `${idx + 1} / ${order.length}`
    : '0 / 0';

  // Mode buttons — toggle active class
  const seqBtn = document.getElementById('ppbSeqBtn');
  const rndBtn = document.getElementById('ppbRndBtn');
  if (seqBtn && rndBtn) {
    seqBtn.classList.toggle('active', playlistPlayer.mode === 'sequential');
    rndBtn.classList.toggle('active', playlistPlayer.mode === 'random');
  }
}

function closePlaylistPlayer() {
  playlistPlayer.active = false;
  document.querySelectorAll('.video-card').forEach(el => el.classList.remove('pp-active'));
  const bar = document.getElementById('playlistPlayerBar');
  if (bar) bar.style.display = 'none';
  document.querySelector('.main')?.classList.remove('has-player-bar');
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

// The three categories that ship with the project. Custom ones created
// via "Create category…" are layered on top of this list.
const BUILTIN_APPS = [
  { id: 'music',       name: 'Music',       color: '#EC407A', file: 'music.html' },
  { id: 'electronics', name: 'Electronics', color: '#29B6F6', file: 'electronics.html' },
  { id: 'astrology',   name: 'Astrology',   color: '#AB47BC', file: 'astrology.html' },
];

function getAppsRegistry() {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem(APPS_REGISTRY_KEY) || '[]'); } catch {}
  const map = new Map();
  BUILTIN_APPS.forEach(a => map.set(a.id, a));
  custom.forEach(a => map.set(a.id, a)); // custom entries win on id collision
  return [...map.values()];
}

function saveCustomApp(app) {
  let custom = [];
  try { custom = JSON.parse(localStorage.getItem(APPS_REGISTRY_KEY) || '[]'); } catch {}
  custom.push(app);
  localStorage.setItem(APPS_REGISTRY_KEY, JSON.stringify(custom));
}

function renderCategorySwitcher() {
  const wrap = document.getElementById('categorySwitcher');
  if (!wrap) return;

  const apps = getAppsRegistry();
  const myId = getAppName();
  const current = apps.find(a => a.id === myId) || { name: APP_LABEL || 'Category', color: APP_COLOR || 'var(--indigo)' };

  wrap.innerHTML = `
    <button class="category-toggle-btn" id="categoryToggleBtn" onclick="toggleCategoryMenu()">
      <span class="category-toggle-dot" style="background:${current.color}"></span>
      <span class="category-toggle-label">${escHtml(current.name)}</span>
      <svg class="category-toggle-chev" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
    </button>
    <div class="category-menu" id="categoryMenu">
      ${apps.map(a => `
        <a class="category-menu-item${a.id === myId ? ' active' : ''}" href="${escAttr(a.file)}">
          <span class="category-menu-dot" style="background:${a.color}"></span>${escHtml(a.name)}
        </a>`).join('')}
      <div class="category-menu-divider"></div>
      <button class="category-menu-item category-menu-create" onclick="openCreateCategoryModal()">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create category…
      </button>
    </div>
  `;
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
      onclick="selectCategoryColor('${c}')"></div>
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

  closeModal('createCategoryModal');
  renderCategorySwitcher();
  showToast(`✓ "${name}" created — save the 4 downloaded files next to your other TholsStudio pages`);
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

// Full standalone HTML page for a brand-new category — mirrors the
// structure of music.html / electronics.html / astrology.html.
function buildCategoryHtml(id, name, color) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TholsStudio — ${name}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%23F5C518'/><polygon points='13,10 13,22 23,16' fill='%23111'/></svg>">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link href="style.css" rel="stylesheet">

</head>
<body>

<!-- TOPBAR -->
<div class="topbar">
  <div class="logo">
    <div class="logo-icon">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>
    </div>
    <div class="logo-text-wrap">
      <span class="logo-title">TholsStudio</span>
      <span class="logo-subtitle" id="appSubtitle"></span>
    </div>
  </div>
  <div class="search-bar">
    <span class="search-icon">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
    </span>
    <input type="text" placeholder="Search videos, channels, notes…" id="searchInput" oninput="handleSearch()">
  </div>
  <div class="topbar-actions">
    <button class="btn btn-ghost" onclick="openImportModal()">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      Import
    </button>
    <button class="btn btn-primary" onclick="openAddModal()">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add Video
    </button>
  </div>
</div>

<!-- APP BODY -->
<div class="app-body">
  <!-- SIDEBAR -->
  <div class="sidebar" id="sidebar">
    <div class="sidebar-resizer" id="sidebarResizer" title="Drag to resize · Double-click to reset"></div>
    <div class="sidebar-section">
      <div class="sidebar-label sidebar-label-toggle" onclick="toggleSidebarSection('librarySection', this.querySelector('.section-chev'))">
        Library
        <svg class="section-chev chev-up" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
      </div>
      <div id="librarySection">
      <button class="sidebar-item active" onclick="filterByCollection('all', this)">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
        <span class="col-name">All Videos</span>
        <span class="count" id="count-all">0</span>
      </button>
      <button class="sidebar-item" onclick="filterByCollection('recent', this)">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <span class="col-name">Recently Added</span>
        <span class="count" id="count-recent">0</span>
      </button>
      <button class="sidebar-item" onclick="filterByCollection('watched', this)">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        <span class="col-name">Watched</span>
        <span class="count" id="count-watched">0</span>
      </button>
      </div><!-- /librarySection -->
    </div><!-- /sidebar-section -->

    <div class="sidebar-divider"></div>

    <div class="sidebar-section">
      <div class="sidebar-label sidebar-label-toggle" onclick="toggleSidebarSection('collectionsSection', this.querySelector('.section-chev'))">
        Collections
        <svg class="section-chev chev-up" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
      </div>
      <div id="collectionsSection">
      <div id="collectionsList"></div>
      <div style="padding: 0 0 0 0; margin-top: 4px;">
        <button class="add-collection-btn" onclick="startNewCollection()">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New collection
        </button>
      </div>
      </div><!-- /collectionsSection -->
    </div><!-- /sidebar-section -->

    <div class="sidebar-divider"></div>

    <div class="sidebar-section">
      <div class="sidebar-label sidebar-label-toggle" onclick="toggleSidebarSection('playlistsSection', this.querySelector('.section-chev'))">
        Playlists
        <svg class="section-chev chev-up" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
      </div>
      <div id="playlistsSection">
        <div id="playlistsList"></div>
        <div style="padding:0; margin-top:4px;">
          <button class="add-collection-btn" onclick="openPlaylistModal()">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New playlist
          </button>
        </div>
      </div><!-- /playlistsSection -->
    </div><!-- /sidebar-section -->

    <!-- CATEGORY SWITCHER (pinned to bottom) -->
    <div class="sidebar-footer" id="categorySwitcher"></div>
  </div><!-- /sidebar -->

  <!-- MAIN -->
  <!-- PLAYLIST SPLIT VIEW (shown instead of .main when a playlist is clicked) -->
  <div class="playlist-view" id="playlistView" style="display:none;">

    <!-- Left panel: playlist track list -->
    <div class="pv-list" id="pvList">
      <div class="pv-list-header">
        <div class="pv-list-meta">
          <span class="pv-list-dot" id="pvDot"></span>
          <div>
            <div class="pv-list-name" id="pvName">Playlist</div>
            <div class="pv-list-count" id="pvCount">0 videos</div>
          </div>
        </div>
        <div class="pv-list-modes">
          <button class="pv-mode-btn active" id="pvSeqBtn" onclick="pvSetMode('sequential')" title="Sequential">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="15 8 19 12 15 16"/></svg>
          </button>
          <button class="pv-mode-btn" id="pvRndBtn" onclick="pvSetMode('random')" title="Random">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
          </button>
          <button class="pv-mode-btn active" id="pvAutoBtn" onclick="pvToggleAutoplay()" title="Auto-play next">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="3" x2="19" y2="21"/></svg>
          </button>
        </div>
      </div>
      <div class="pv-search-wrap">
        <span class="pv-search-icon">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </span>
        <input type="text" id="pvSearchInput" placeholder="Search this playlist…" oninput="pvHandleSearch()">
      </div>
      <div class="pv-tracks" id="pvTracks"></div>
    </div>

    <!-- Right panel: iframe player -->
    <div class="pv-player" id="pvPlayer">
      <button class="pv-close-btn" onclick="closePvView()" title="Close playlist view">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div id="pvIframeContainer" style="width:100%;height:100%;"></div>
    </div>

  </div>

  <div class="main" id="mainView">
    <!-- Quick add bar -->
    <div class="add-url-location" id="quickAddLocation" style="position:relative;">
      <button class="browse-location-btn" onclick="toggleLocationPicker()" title="Choose collection / group to save into">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
      </button>
      <span class="add-url-location-dot" id="quickAddLocationDot"></span>
      <span id="quickAddLocationText">Saving to: Uncollected</span>
      <!-- Location picker dropdown -->
      <div class="location-picker" id="locationPicker" style="display:none;">
        <div class="location-picker-title">Save quick-add to…</div>
        <div class="location-picker-body" id="locationPickerBody"></div>
      </div>
    </div>
    <div class="add-url-bar">
      <svg width="16" height="16" fill="none" stroke="var(--text-dim)" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
      <input type="text" id="quickAddInput" placeholder="Paste a YouTube URL and press Enter to save…" onkeydown="if(event.key==='Enter') quickAdd()">
      <button class="btn btn-primary" onclick="quickAdd()" style="flex-shrink:0;">Save</button>
    </div>

    <!-- Section header -->
    <div class="section-header">
      <span class="section-title" id="sectionTitle">All Videos</span>
      <span class="section-count" id="sectionCount">0 videos</span>
      <button class="btn btn-primary" id="playPlaylistBtn" onclick="startPlaylistPlayer()" style="display:none;padding:5px 12px;font-size:12px;gap:6px;">
        <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Play
      </button>
      <div class="section-header-right">
        <!-- Export folder location label -->
        <div class="export-location-wrap" id="exportLocationWrap" style="display:none;">
          <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          <span id="exportLocationLabel">No folder selected</span>
          <button class="export-location-clear" onclick="clearExportFolder()" title="Clear folder">×</button>
        </div>
        <!-- Browse folder button -->
        <button class="btn-icon" onclick="browseExportFolder()" title="Select export folder">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
        </button>
        <div class="export-dropdown" id="exportDropdown">
          <button class="btn-icon" onclick="toggleExportMenu()" title="Export">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
          </button>
          <div class="export-menu" id="exportMenu">
            <button class="export-menu-item" onclick="exportData()">Export as JSON</button>
            <button class="export-menu-item" onclick="exportCollectionsJs()" id="exportCollectionsLabel">Export as collections.js</button>
            <button class="export-menu-item" onclick="exportWatchedJs()" id="exportWatchedLabel">Export as watched.js</button>
            <button class="export-menu-item" onclick="exportPlaylistJs()" id="exportPlaylistLabel">Export as playlist.js</button>
            <div class="export-menu-divider"></div>
            <button class="export-menu-item export-menu-item-all" onclick="exportAllJs()">
              <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export All JS Files
            </button>
          </div>
        </div>
        <div class="view-toggle">
          <button class="view-btn active" id="gridBtn" onclick="setView('grid')" title="Grid view">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button class="view-btn" id="listBtn" onclick="setView('list')" title="List view">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="11" width="18" height="2"/><rect x="3" y="18" width="18" height="2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Cards -->
    <div class="cards-grid-container" id="cardsGrid"></div>
  </div><!-- end #mainView -->
</div>

<!-- ADD VIDEO MODAL -->
<div class="modal-overlay" id="addModal">
  <div class="modal">
    <div class="modal-title">
      <svg width="18" height="18" fill="none" stroke="var(--indigo-bright)" stroke-width="2" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
      Add YouTube Video
      <button class="modal-close" onclick="closeModal('addModal')">×</button>
    </div>
    <div class="field">
      <label>YouTube URL *</label>
      <input type="text" id="addUrl" placeholder="https://youtube.com/watch?v=..." oninput="previewUrl();checkAddDuplicate()" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="field-error" id="addUrlDuplicateMsg" style="display:none;">Duplicate</div>
    </div>
    <div class="field">
      <label>Title (auto-detected or custom)</label>
      <input type="text" id="addTitle" placeholder="Video title">
    </div>
    <div class="field">
      <label>Collection</label>
      <select id="addCollection" onchange="refreshGroupSelect('addCollection','addGroup');checkAddDuplicate()">
        <option value="">— No collection —</option>
      </select>
    </div>
    <div class="field">
      <label>Group / Topic <span style="color:var(--text-dim);font-weight:400;">(optional sub-section)</span></label>
      <div style="display:flex;gap:8px;">
        <select id="addGroup" style="flex:1;" onchange="checkAddDuplicate()">
          <option value="">— No group —</option>
        </select>
        <input type="text" id="addGroupNew" placeholder="Or type new group…" style="flex:1;" oninput="checkAddDuplicate()">
      </div>
    </div>
    <div class="field">
      <label>Note</label>
      <textarea id="addNote" placeholder="Your thoughts, timestamps, why you saved this…"></textarea>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
      <button class="btn btn-ghost" onclick="closeModal('addModal')">Cancel</button>
      <button class="btn btn-primary" id="saveVideoBtn" onclick="saveVideo()">Save to Vault</button>
    </div>
  </div>
</div>

<!-- NEW COLLECTION MODAL -->
<div class="modal-overlay" id="collectionModal">
  <div class="modal" style="width:360px;">
    <div class="modal-title">
      New Collection
      <button class="modal-close" onclick="closeModal('collectionModal')">×</button>
    </div>
    <div class="field">
      <label>Collection name</label>
      <input type="text" id="collectionName" placeholder="e.g. Unity Tutorials, Game Design…">
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-picker-row" id="colorPicker"></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
      <button class="btn btn-ghost" onclick="closeModal('collectionModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveCollection()">Create</button>
    </div>
  </div>
</div>

<!-- PLAYLIST MODAL -->
<div class="modal-overlay" id="playlistModal">
  <div class="modal" style="width:360px;">
    <div class="modal-title">
      New Playlist
      <button class="modal-close" onclick="closeModal('playlistModal')">×</button>
    </div>
    <div class="field">
      <label>Playlist name</label>
      <input type="text" id="playlistName" placeholder="e.g. Watch Later, Favourites…"
        onkeydown="if(event.key==='Enter') savePlaylist()">
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-picker-row" id="playlistColorPicker"></div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
      <button class="btn btn-ghost" onclick="closeModal('playlistModal')">Cancel</button>
      <button class="btn btn-primary" onclick="savePlaylist()">Create</button>
    </div>
  </div>
</div>

<!-- NEW GROUP MODAL -->
<div class="modal-overlay" id="groupModal">
  <div class="modal" style="width:360px;">
    <div class="modal-title">
      <svg width="16" height="16" fill="none" stroke="var(--indigo-bright)" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
      New Group
      <button class="modal-close" onclick="closeModal('groupModal')">×</button>
    </div>
    <div class="field">
      <label>Group name</label>
      <input type="text" id="groupName" placeholder="e.g. Physics, AI, Shaders…"
        onkeydown="if(event.key==='Enter') saveGroup()">
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
      <button class="btn btn-ghost" onclick="closeModal('groupModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveGroup()">Create</button>
    </div>
  </div>
</div>

<!-- EXPORT CONFIRM MODAL -->
<div class="modal-overlay" id="exportConfirmModal">
  <div class="modal" style="width:400px;">
    <div class="modal-title">
      <svg width="18" height="18" fill="none" stroke="var(--indigo-bright)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      <span id="exportConfirmTitle">Export</span>
      <button class="modal-close" onclick="closeModal('exportConfirmModal')">×</button>
    </div>
    <p id="exportConfirmMessage" style="margin:0;font-size:13px;color:var(--text-muted);line-height:1.6;"></p>
    <div id="exportConfirmDetails" style="font-size:12px;color:var(--text);background:var(--surface-raised);padding:14px 16px;border-radius:8px;border-left:3px solid var(--indigo);margin-top:14px;white-space:pre-wrap;line-height:1.7;font-family:var(--mono);"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
      <button class="btn btn-ghost" onclick="closeModal('exportConfirmModal')">Cancel</button>
      <button class="btn btn-primary" id="exportConfirmBtn" onclick="confirmExport()">Export</button>
    </div>
  </div>
</div>

<!-- IMPORT MODAL -->
<div class="modal-overlay" id="importModal">
  <div class="modal">
    <div class="modal-title">
      Import URLs
      <button class="modal-close" onclick="closeModal('importModal')">×</button>
    </div>
    <div class="field">
      <label>Paste YouTube URLs (one per line)</label>
      <textarea id="importText" placeholder="https://youtube.com/watch?v=abc&#10;https://youtu.be/xyz&#10;…" style="min-height:120px;"></textarea>
    </div>
    <div class="field">
      <label>Add to collection (optional)</label>
      <select id="importCollection" onchange="refreshGroupSelect('importCollection','importGroup')">
        <option value="">— No collection —</option>
      </select>
    </div>
    <div class="field">
      <label>Group / Topic <span style="color:var(--text-dim);font-weight:400;">(optional)</span></label>
      <div style="display:flex;gap:8px;">
        <select id="importGroup" style="flex:1;"><option value="">— No group —</option></select>
        <input type="text" id="importGroupNew" placeholder="Or type new group…" style="flex:1;">
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
      <button class="btn btn-ghost" onclick="closeModal('importModal')">Cancel</button>
      <button class="btn btn-primary" onclick="importUrls()">Import All</button>
    </div>
  </div>
</div>

<!-- MOVE TO GROUP MODAL -->
<div class="modal-overlay" id="moveGroupModal">
  <div class="modal" style="width:380px;">
    <div class="modal-title">
      <svg width="16" height="16" fill="none" stroke="var(--indigo-bright)" stroke-width="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
      Move to Group
      <button class="modal-close" onclick="closeModal('moveGroupModal')">×</button>
    </div>
    <div style="font-size:12px;color:var(--text-muted);background:var(--surface-raised);padding:8px 12px;border-radius:6px;border-left:2px solid var(--indigo);" id="moveGroupVideoTitle"></div>
    <div class="field">
      <label>Choose existing group</label>
      <select id="moveGroupSelect">
        <option value="">— No group (ungrouped) —</option>
      </select>
    </div>
    <div class="field">
      <label>Or create a new group</label>
      <input type="text" id="moveGroupNewInput" placeholder="Type new group name…">
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
      <button class="btn btn-ghost" onclick="closeModal('moveGroupModal')">Cancel</button>
      <button class="btn btn-primary" onclick="saveMoveGroup()">Move</button>
    </div>
  </div>
</div>

<!-- CREATE CATEGORY MODAL -->
<div class="modal-overlay" id="createCategoryModal">
  <div class="modal" style="width:380px;">
    <div class="modal-title">
      <svg width="16" height="16" fill="none" stroke="var(--indigo-bright)" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New Category
      <button class="modal-close" onclick="closeModal('createCategoryModal')">×</button>
    </div>
    <div class="field">
      <label>Category name</label>
      <input type="text" id="newCategoryName" placeholder="e.g. Cooking, Gaming, Fitness…"
        onkeydown="if(event.key==='Enter') createCategory()">
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-picker-row" id="categoryColorPicker"></div>
    </div>
    <p style="margin:0;font-size:12px;color:var(--text-muted);line-height:1.6;">
      This downloads 4 starter files (a new page + 3 config files). Save them into the same folder as your other TholsStudio pages, then open the new page from there.
    </p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
      <button class="btn btn-ghost" onclick="closeModal('createCategoryModal')">Cancel</button>
      <button class="btn btn-primary" onclick="createCategory()">Create &amp; Download</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<!-- CONFIRM MODAL -->
<div class="modal-overlay" id="confirmModal">
  <div class="modal" style="width:380px;">
    <div class="modal-title">
      <span id="confirmTitle">Confirm</span>
      <button class="modal-close" onclick="closeConfirmModal()">×</button>
    </div>
    <p id="confirmMessage" style="margin:0 0 20px;font-size:13px;color:var(--text-muted);line-height:1.6;"></p>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-ghost" onclick="closeConfirmModal()">Cancel</button>
      <button class="btn btn-danger" id="confirmOkBtn" onclick="confirmOk()">Delete</button>
    </div>
  </div>
</div>

<!-- PLAYLIST PLAYER BAR -->
<div class="playlist-player-bar" id="playlistPlayerBar" style="display:none;">

  <!-- Left: playlist name + current video info -->
  <div class="ppb-left">
    <span class="ppb-dot" id="ppbDot"></span>
    <div class="ppb-info">
      <span class="ppb-playlist-name" id="ppbName">Playlist</span>
      <span class="ppb-video-title" id="ppbVideoTitle">—</span>
    </div>
  </div>

  <!-- Centre: mode selectors + playback controls -->
  <div class="ppb-centre">
    <!-- Mode group -->
    <div class="ppb-mode-group">
      <!-- Sequential -->
      <button class="ppb-mode-btn active" id="ppbSeqBtn" onclick="setPlaylistMode('sequential')" title="Sequential — play in order">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="15 8 19 12 15 16"/>
        </svg>
        <span>Sequential</span>
      </button>
      <!-- Random -->
      <button class="ppb-mode-btn" id="ppbRndBtn" onclick="setPlaylistMode('random')" title="Random — shuffle order">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="16 3 21 3 21 8"/>
          <line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/>
          <line x1="15" y1="15" x2="21" y2="21"/>
        </svg>
        <span>Random</span>
      </button>
    </div>

    <!-- Playback controls -->
    <div class="ppb-controls">
      <button class="ppb-btn" onclick="playlistStep(-1)" title="Previous">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
        </svg>
      </button>
      <button class="ppb-btn ppb-play" onclick="openCurrentPlaylistVideo()" title="Open in YouTube">
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
      <button class="ppb-btn" onclick="playlistStep(1)" title="Next">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Right: counter + close -->
  <div class="ppb-right">
    <span class="ppb-track" id="ppbTrack">1 / 5</span>
    <button class="ppb-btn ppb-close" onclick="closePlaylistPlayer()" title="Stop playlist">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>

</div>

<script src="https://www.youtube.com/iframe_api"></script>
<script>
  // Identifies this page to the shared engine (app.js): namespaces
  // localStorage + the export-folder IndexedDB store, and drives branding.
  const APP_NAME = ${jsStr(id)};
  const APP_LABEL = ${jsStr(name)};
  const APP_COLOR = ${jsStr(color)};
</script>
<script src="${id}-collections.js"></script>
<script src="${id}-playlist.js"></script>
<script src="${id}-watched.js"></script>
<script src="app.js"></script>

</body>
</html>
`;
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
// INIT
// ──────────────────────────────────────────────
applyAppBranding();
seedData();
restoreExportFolder();
renderSidebar();
renderCards();
renderCategorySwitcher();
updateExportMenuLabels();
