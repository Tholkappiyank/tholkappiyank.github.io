// ──────────────────────────────────────────────
// STATE
// (COLLECTION_COLORS and DEFAULT_COLLECTIONS come from collections.js.
//  DEFAULT_COLLECTIONS is nested: collection -> groups -> videos.
//  state.collections only stores {id, name, color}; the nested
//  video data is flattened into state.videos by seedData() below.)
// ──────────────────────────────────────────────
let state = JSON.parse(localStorage.getItem('tholsstudio') || 'null') || {
  videos: [],
  collections: DEFAULT_COLLECTIONS.map(c => ({ id: c.id, name: c.name, color: c.color })),
  playlists: DEFAULT_PLAYLISTS.map(p => ({ id: p.id, name: p.name, color: p.color, videoIds: [...p.videoIds] })),
  selectedColor: COLLECTION_COLORS[0],
  lastUsedCollection: '',
  lastUsedGroup: '',
  videoOrder: {},
  watchedIds: [],   // YouTube videoId strings of watched videos
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

let currentFilter = 'all';
let currentView = 'grid';
let searchQuery = '';

function save() {
  localStorage.setItem('tholsstudio', JSON.stringify(state));
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

function renderPlaylistsSidebar() {
  const list = document.getElementById('playlistsList');
  if (!list) return;
  list.innerHTML = '';
  state.playlists.forEach(pl => {
    const isActive = currentFilter === `playlist:${pl.id}`;
    const count = pl.videoIds ? pl.videoIds.length : 0;
    const btn = document.createElement('button');
    btn.className = 'sidebar-item' + (isActive ? ' active' : '');
    const dotColor = pl.color || '#78909C';
    btn.innerHTML = `
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
    btn.onclick = (e) => {
      // If rename UI is active inside this button, ignore the click
      if (btn.querySelector('.col-rename-input')) return;
      filterByCollection(`playlist:${pl.id}`, btn);
    };
    list.appendChild(btn);
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
    ? `Delete "${col.name}"? Its ${count} video(s) will become uncollected.`
    : `Delete empty collection "${col.name}"?`;
  if (!confirm(msg)) return;

  // Unassign videos
  state.videos.forEach(v => { if (v.collection === colId) v.collection = ''; });
  state.collections = state.collections.filter(c => c.id !== colId);
  if (currentFilter === colId) currentFilter = 'all';
  save();
  renderSidebar();
  renderCards();
  showToast(`"${col.name}" deleted`);
}

function getGroupsForCollection(colId) {
  if (!colId) return [];
  return [...new Set(
    state.videos
      .filter(v => v.collection === colId && v.group && v.group.trim())
      .map(v => v.group.trim())
  )].sort();
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
  const chevClass = expanded ? 'group-chevron chev-up' : 'group-chevron collapsed';
  const bodyClass = expanded ? 'group-body' : 'group-body collapsed';
  let html = `<div class="group-section" style="${dividerStyle}">`;
  html += `<div class="group-header group-header--collection" onclick="toggleGroup('col-${colId}')">
    <span class="${chevClass}" id="chev-col-${colId}">
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
    const gChevClass = expanded ? 'group-chevron chev-up' : 'group-chevron collapsed';
    const gBodyClass = expanded ? 'group-body' : 'group-body collapsed';
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
      <button class="add-collection-btn" style="width:auto;padding:5px 12px;" onclick="showAddGroupInput('${escAttr(colId)}')">
        <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New group
      </button>
    </div>
    <div id="newGroupInputRow-${colId}" style="display:none;padding:4px 0;">
      <div style="display:flex;gap:8px;align-items:center;">
        <input class="add-group-input" id="newGroupInput-${colId}" placeholder="Group name (e.g. Physics, AI, Shaders…)"
          onkeydown="if(event.key==='Enter') confirmNewGroup('${escAttr(colId)}'); if(event.key==='Escape') hideAddGroupInput('${escAttr(colId)}')">
        <button class="btn btn-primary" style="padding:5px 12px;font-size:12px;" onclick="confirmNewGroup('${escAttr(colId)}')">Add</button>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px;" onclick="hideAddGroupInput('${escAttr(colId)}')">Cancel</button>
      </div>
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
}

function showAddGroupInput(colId) {
  document.getElementById(`addGroupRow-${colId}`).style.display = 'none';
  const row = document.getElementById(`newGroupInputRow-${colId}`);
  row.style.display = 'block';
  document.getElementById(`newGroupInput-${colId}`)?.focus();
}

function hideAddGroupInput(colId) {
  document.getElementById(`addGroupRow-${colId}`).style.display = 'flex';
  const row = document.getElementById(`newGroupInputRow-${colId}`);
  row.style.display = 'none';
  if (document.getElementById(`newGroupInput-${colId}`))
    document.getElementById(`newGroupInput-${colId}`).value = '';
}

function confirmNewGroup(colId) {
  const input = document.getElementById(`newGroupInput-${colId}`);
  const name = input?.value.trim();
  if (!name) { showToast('⚠️ Enter a group name'); return; }
  // Group is just a label — no video assigned yet; just re-render with the knowledge it exists
  // We store "pending groups" in state so they show even with 0 videos
  if (!state.pendingGroups) state.pendingGroups = {};
  if (!state.pendingGroups[colId]) state.pendingGroups[colId] = [];
  if (!state.pendingGroups[colId].includes(name)) state.pendingGroups[colId].push(name);
  save();
  hideAddGroupInput(colId);
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
    ? `Delete group "${groupName}"? Its ${count} video(s) will become ungrouped.`
    : `Delete empty group "${groupName}"?`;
  if (!confirm(msg)) return;
  state.videos.forEach(v => { if (v.collection === colId && v.group === groupName) v.group = ''; });
  if (state.pendingGroups?.[colId]) {
    state.pendingGroups[colId] = state.pendingGroups[colId].filter(g => g !== groupName);
  }
  save(); renderCards();
  showToast(`Group "${groupName}" deleted`);
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
  localStorage.setItem('tholsstudio', JSON.stringify(state));
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
  if (v) {
    v.note = value.trim();
    save();
    // Update the note text display in-place without re-rendering
    const nt = document.getElementById('note-text-' + id);
    if (nt) {
      nt.textContent = v.note;
      nt.style.display = v.note ? '' : 'none';
    }
    const ta = document.getElementById('note-edit-' + id);
    if (ta) {
      ta.classList.remove('visible');
      if (nt) nt.style.display = v.note ? '' : 'none';
    }
  }
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

  // Register group as pending if new
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

  // Remember this collection + group so quick-add (and the location label) use it next time
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
  state.playlists = state.playlists.filter(p => p.id !== id);
  // If currently viewing the deleted playlist, go back to All
  if (currentFilter === `playlist:${id}`) {
    filterByCollection('all', document.querySelector('.sidebar-item'));
  }
  save(); renderSidebar(); renderCards();
  showToast('✓ Playlist removed');
}

function addVideoToPlaylist(videoId, playlistId) {
  const pl = state.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  if (!pl.videoIds.includes(videoId)) {
    pl.videoIds.push(videoId);
    save(); renderSidebar();
    const v = state.videos.find(v => v.id === videoId);
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
  pl.videoIds = pl.videoIds.filter(id => id !== videoId);
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
      const allIn = groupVids.every(v => pl.videoIds.includes(v.id));
      const someIn = !allIn && groupVids.some(v => pl.videoIds.includes(v.id));
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
    if (!pl.videoIds.includes(v.id)) { pl.videoIds.push(v.id); added++; }
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
      const allIn = colVideos.every(v => pl.videoIds.includes(v.id));
      const someIn = !allIn && colVideos.some(v => pl.videoIds.includes(v.id));
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
    if (!pl.videoIds.includes(v.id)) { pl.videoIds.push(v.id); added++; }
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
      const has = pl.videoIds.includes(videoId);
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

// ──────────────────────────────────────────────
// EXPORT FOLDER (File System Access API)
// ──────────────────────────────────────────────
let exportFolderHandle = null; // FileSystemDirectoryHandle when selected

async function browseExportFolder() {
  if (!window.showDirectoryPicker) {
    showToast('⚠️ Folder picker not supported in this browser — files will download normally');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    exportFolderHandle = handle;
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
  const wrap = document.getElementById('exportLocationWrap');
  if (wrap) wrap.style.display = 'none';
  showToast('Export folder cleared — files will download normally');
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
function exportData() {
  const data = JSON.stringify(state, null, 2);
  saveToFolderOrDownload('tubevault-export.json', data, 'application/json').then(saved => {
    showToast(saved ? '✓ Saved tubevault-export.json to folder' : '✓ Exported as JSON');
  });
  closeExportMenu();
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
//   1. Replace your existing collections.js with this file
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

  saveToFolderOrDownload('collections.js', fileContents, 'text/javascript').then(saved => {
    showToast(saved ? '✓ Saved collections.js to folder' : '✓ Exported as collections.js');
  });
  closeExportMenu();
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

  const fileContents = [
    SEP,
    '// WATCHED HISTORY',
    '// Exported from TubeVault on ' + ts,
    '//',
    '// WATCHED_VIDEO_IDS: YouTube video IDs marked as watched.',
    '// To restore: replace watched.js with this file and clear localStorage.',
    SEP,
    '',
    'const WATCHED_VIDEO_IDS = [',
  ].join('\n') + '\n' +
  (idLines.length ? idLines.join('\n') + '\n' : '') +
  '];\n';

  const n = watchedVideoIds.length;
  saveToFolderOrDownload('watched.js', fileContents, 'text/javascript').then(saved => {
    const dest = saved ? 'to folder' : 'as watched.js';
    if (n === 0) showToast('\u26a0\ufe0f No watched videos — exported empty watched.js');
    else showToast('\u2713 Saved ' + n + ' watched video' + (n !== 1 ? 's' : '') + ' ' + dest);
  });
  closeExportMenu();
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

  const header = [
    SEP,
    '// PLAYLIST CONFIG',
    '// Exported from TubeVault on ' + new Date().toLocaleString(),
    '//',
    '// Each playlist: id, name, color, videoIds, videos (full details)',
    '// To apply as defaults: replace playlist.js and clear localStorage.',
    SEP,
    '',
    'const DEFAULT_PLAYLISTS = ['
  ].join('\n');

  const fileContents = header + '\n' + blocks.join(',\n') + '\n];\n';
  const n = state.playlists.length;
  saveToFolderOrDownload('playlist.js', fileContents, 'text/javascript').then(saved => {
    showToast('\u2713 ' + (saved ? 'Saved' : 'Exported') + ' ' + n + ' playlist' + (n !== 1 ? 's' : '') + ' ' + (saved ? 'to folder' : 'as playlist.js'));
  });
  closeExportMenu();
}

function exportAllJs() {
  closeExportMenu();
  exportCollectionsJs();
  setTimeout(function() { exportPlaylistJs(); }, 300);
  setTimeout(function() { exportWatchedJs(); }, 600);
  setTimeout(function() {
    const dest = exportFolderHandle ? 'to folder' : 'as downloads';
    showToast('\u2713 Exported collections.js, playlist.js & watched.js ' + dest);
  }, 700);
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
  const picker = document.getElementById('locationPicker');
  if (picker) picker.style.display = 'none';
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
function exportAllJs() {
  closeExportMenu();
  // Fire all three JS exports in sequence with small delays
  // so browsers don't block multiple simultaneous downloads
  exportCollectionsJs();
  setTimeout(function() { exportPlaylistJs(); }, 300);
  setTimeout(function() { exportWatchedJs(); }, 600);
  // Short delay then toast
  setTimeout(function() {
    showToast('✓ Exported collections.js, playlist.js & watched.js');
  }, 700);
}

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
      // Videos inside named groups
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
      // Videos directly in the collection (no sub-group)
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
    // Apply watched history from watched.js
    if (typeof WATCHED_VIDEO_IDS !== 'undefined' && WATCHED_VIDEO_IDS.length) {
      state.videos.forEach(v => {
        if (WATCHED_VIDEO_IDS.includes(v.videoId)) {
          v.watched = true;
          if (!state.watchedIds.includes(v.videoId)) state.watchedIds.push(v.videoId);
        }
      });
    }
    save();
  }
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
};

function openPlaylistView(plId) {
  const pl = state.playlists.find(p => p.id === plId);
  if (!pl) return;

  pvState.plId = plId;
  pvState.mode = pvState.mode || 'sequential';
  pvBuildOrder(pl);
  pvState.index = 0;

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

  // Track list
  const tracks = document.getElementById('pvTracks');
  tracks.innerHTML = pvState.order.map((vidId, i) => {
    const v = state.videos.find(v => v.id === vidId);
    if (!v) return '';
    const col = state.collections.find(c => c.id === v.collection);
    const path = col ? (v.group ? `${col.name} / ${v.group}` : col.name) : (v.group || '');
    const thumb = `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`;
    const isActive = i === pvState.index;
    return `<div class="pv-track${isActive ? ' active' : ''}" onclick="pvPlayIndex(${i})" id="pvt-${i}">
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
  }).join('');
}

function pvPlayIndex(i) {
  pvState.index = i;
  const vidId = pvState.order[i];
  const v = state.videos.find(v => v.id === vidId);
  if (!v) { pvPlayIndex(i + 1); return; }

  // Set iframe src
  const iframe = document.getElementById('pvIframe');
  iframe.src = `https://www.youtube.com/embed/${v.videoId}?autoplay=1&rel=0`;

  // Mark watched
  markWatched(v.id);

  // Update active track highlight
  document.querySelectorAll('.pv-track').forEach((el, idx) => {
    el.classList.toggle('active', idx === i);
  });

  // Scroll active track into view
  const activeTrack = document.getElementById('pvt-' + i);
  if (activeTrack) activeTrack.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  // Blank the iframe to stop video playback
  const iframe = document.getElementById('pvIframe');
  if (iframe) iframe.src = '';
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
// INIT
// ──────────────────────────────────────────────
seedData();
renderSidebar();
renderCards();
