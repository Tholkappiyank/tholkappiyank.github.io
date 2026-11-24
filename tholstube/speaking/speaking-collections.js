// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 11/24/2026, 10:18:40 AM
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing speaking-collections.js with this file
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
    id: 'speaking',
    name: 'Speaking',
    color: '#AB44BC',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=SwxqLC9uDXk',
        videoId: 'SwxqLC9uDXk',
        title: 'Real English Questions from Movies You MUST Know!',
        channel: 'Real English From Movies',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=7fImda_f4lg',
        videoId: '7fImda_f4lg',
        title: '🎬 Learn English Through Movies | 10 Expressions Native Speakers Actually Use',
        channel: 'Grow With Rabia',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=mem8LerchuA',
        videoId: 'mem8LerchuA',
        title: 'If You Want Fluent English, You NEED to Watch This 🎬',
        channel: 'Real English From Movies',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=OSDJEXQtfhI',
        videoId: 'OSDJEXQtfhI',
        title: 'The Secret to Understanding Fast American English Without Translating (C1–C2)',
        channel: 'English with CTM',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=LC3-NRKTxAA',
        videoId: 'LC3-NRKTxAA',
        title: '800 Advanced English Words Native Speakers Use Every Day (C1–C2) | Speak More Naturally',
        channel: 'English with CTM',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=vrlepDcRxN4',
        videoId: 'vrlepDcRxN4',
        title: 'Shadowing English with the movie Menu | Speak like a Native Ep.22',
        channel: 'Moving English',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=GV_-xdb3qK8',
        videoId: 'GV_-xdb3qK8',
        title: 'Why Your Voice Shakes When You Speak (And Exactly How to Stop It)',
        channel: 'Speak With Power ',
        note: ''
      },
    ]
  },
  {
    id: 'bhakthi',
    name: 'Bhakthi',
    color: '#26A69A',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/cHMT-f9UYUE',
        videoId: 'cHMT-f9UYUE',
        title: 'ரமணரின் உபதேசம்! ஞானம் பெற்ற சீடர்! | #spiritualawakening',
        channel: 'Dhayavu Prabhavathi Amma',
        note: ''
      },
    ]
  },
  {
    id: 'understandmind',
    name: 'UnderstandMind',
    color: '#EF5350',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=sXHJosUhqBM',
        videoId: 'sXHJosUhqBM',
        title: 'WHY NOTHING FEELS INTERESTING ANYMORE (and how to fix it with neuroscience)',
        channel: 'Olga Loiek',
        note: ''
      },
    ]
  }
];
