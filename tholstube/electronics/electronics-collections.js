// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 9/19/2026, 8:01:46 PM
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing electronics-collections.js with this file
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
const DEFAULT_COLLECTIONS = [
  {
    id: 'electronics',
    name: 'electronics',
    color: '#29B6F6',
    groups: {},
    ungrouped: []
  },
  {
    id: 'light',
    name: 'Light',
    color: '#26A69A',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=i3H9RcOI2q0',
        videoId: 'i3H9RcOI2q0',
        title: 'HP-375 1500W Strong Torch 🔥 3KM Range! 😱 18000mAh Battery | Zoom + Blinking | செம்ம Powerful Torch!',
        channel: 'APPLE ELECTRONICS',
        note: ''
      },
    ]
  }
];
