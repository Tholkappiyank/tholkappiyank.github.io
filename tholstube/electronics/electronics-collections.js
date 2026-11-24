// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 11/24/2026, 10:22:18 AM
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
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/PA3te8GR76M',
        videoId: 'PA3te8GR76M',
        title: 'Three levels of electronics',
        channel: 'Engineering Nerd science',
        note: ''
      },
    ]
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
  },
  {
    id: 'cpu',
    name: 'CPU',
    color: '#66BB6A',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=b3-4PZhd3LY',
        videoId: 'b3-4PZhd3LY',
        title: '7 Chinese Mini PCs That Are DESTROYING Expensive Brands',
        channel: 'Tech Autopsy',
        note: ''
      },
    ]
  },
  {
    id: 'repairmobile',
    name: 'RepairMobile',
    color: '#FFA726',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/_zieFGc_T94',
        videoId: '_zieFGc_T94',
        title: '🔥 Samsung S23 Ultra DEAD! 😱VPH LINE SHORT FOUND|Step-by-Step Power Short Fault Finding | LIVE Repair',
        channel: 'RATHNA MOBILES TRAINING CENTRE',
        note: ''
      },
    ]
  },
  {
    id: '3d-printer',
    name: '3d Printer',
    color: '#78909C',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/84ek_3fpMhs',
        videoId: '84ek_3fpMhs',
        title: 'New Obsession,So satisfying.',
        channel: 'Graceful Tales By Grace Antony',
        note: ''
      },
    ]
  }
];
