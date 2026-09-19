// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 9/19/2026, 8:00:36 PM
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing cooking-collections.js with this file
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
    id: 'cooking',
    name: 'Cooking',
    color: '#FF7043',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/0cp1h3LWB00',
        videoId: '0cp1h3LWB00',
        title: 'வாழை பழத்தை தோலுடன் சாப்பிடலாமா? நாம் செய்யும் தவறு என்ன? K Sidhar | OSB',
        channel: 'OmSaravanaBhava',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/SUg5VFfVYrs',
        videoId: 'SUg5VFfVYrs',
        title: 'Is Dalda actually a healthy oil? 🤔',
        channel: 'Dr Santhosh Jacob',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/K0TlRv6TtSA',
        videoId: 'K0TlRv6TtSA',
        title: 'இரும்புச் சத்து பெற சிறந்த 5 கீரைகள்! | Dr Arunkumar',
        channel: 'Doctor Arunkumar',
        note: ''
      },
    ]
  },
  {
    id: 'products',
    name: 'Products',
    color: '#66BB6A',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/b0s1_MWikuo',
        videoId: 'b0s1_MWikuo',
        title: 'இத கேள்வி பட்டுருக்கேங்களா...#trending #dhana #ytshorts #latest',
        channel: 'dhanas food n vlog',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/wDkpO524I20',
        videoId: 'wDkpO524I20',
        title: '',
        channel: '',
        note: ''
      },
    ]
  }
];
