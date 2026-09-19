// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 9/19/2026, 7:59:25 PM
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing parenting-collections.js with this file
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
    id: 'parenting',
    name: 'Parenting',
    color: '#AB34BC',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=eDsDSme7ZVI',
        videoId: 'eDsDSme7ZVI',
        title: 'உங்க குழந்தை Slow இல்ல! 🧠 8 Types of Intelligence | உங்கள் குழந்தை எந்த Type? | MindGroves',
        channel: 'MindGroves',
        note: ''
      },
    ]
  },
  {
    id: 'confidence-building',
    name: 'Confidence Building',
    color: '#FF7043',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/Bxqx_ktWsno',
        videoId: 'Bxqx_ktWsno',
        title: 'என் அகங்காரதை வீழ்த்திய கேரள இளம் பெண் ஐபிஎஸ் அதிகாரி#kaliyamurthyips #shortsfeed #motivation #women',
        channel: 'Tamil Santhippu',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/7fuLSkDBgiI',
        videoId: '7fuLSkDBgiI',
        title: 'அழுகை தீர்வல்ல... 10th - 12th ரெண்டுலயும் மதிப்பெண் எடுத்து சாதித்த ஆயிஷா! - கலியமூர்த்தி IPS Speech',
        channel: 'TAMIL PEOPLE',
        note: ''
      },
    ]
  }
];
