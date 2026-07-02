// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG — Astrology
// Starter file for the Astrology vault (empty — add your own).
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Astrology")
//          ├─ groups: { "Group Name": [ ...videos ], ... }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply a snapshot exported from the app:
//   1. Replace this file with the exported collections.js
//   2. Clear the app's localStorage (or open in a private window)
//      so the new defaults are picked up on next load
// ──────────────────────────────────────────────────────────────

// Color swatches offered in the "New Collection" color picker.
const COLLECTION_COLORS = [
  '#5C6BC0', '#EF5350', '#26A69A', '#FFA726',
  '#66BB6A', '#AB47BC', '#29B6F6', '#FF7043',
  '#78909C', '#EC407A'
];

// Default collections + their videos, shown in the sidebar on first load.
const DEFAULT_COLLECTIONS = [
  {
    id: 'astrology',
    name: 'Astrology',
    color: '#AB47BC',
    groups: {},
    ungrouped: []
  }
];
