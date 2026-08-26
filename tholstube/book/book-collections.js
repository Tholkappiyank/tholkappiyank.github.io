// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 22/8/2026, 4:22:14 pm
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing book-collections.js with this file
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
    id: 'book',
    name: 'Book',
    color: '#AB64BC',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=6_TkbYlvKA0',
        videoId: '6_TkbYlvKA0',
        title: 'A complete note taking guide! The Book Show ft. RJ Ananthi',
        channel: 'The Book Show',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=SaXUkmp0Hvo&t=12s',
        videoId: 'SaXUkmp0Hvo',
        title: '"Behind the scenes" of great minds | The Book Show ft. RJ Ananthi',
        channel: 'The Book Show',
        note: ''
      },
    ]
  }
];
