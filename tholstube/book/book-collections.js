// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 11/24/2026, 10:14:46 AM
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
    groups: {
      'Listening': [
        {
          url: 'https://www.youtube.com/watch?v=zqimhmvTaRM',
          videoId: 'zqimhmvTaRM',
          title: 'YouTube Video',
          channel: '',
          note: ''
        },
      ],
      'Communication': [
        {
          url: 'https://www.youtube.com/watch?v=cpKmsjDn5Wg',
          videoId: 'cpKmsjDn5Wg',
          title: 'YouTube Video',
          channel: '',
          note: ''
        },
      ],
      'Words of Jasmine': [
        {
          url: 'https://www.youtube.com/watch?v=baEn3Vb6cRA',
          videoId: 'baEn3Vb6cRA',
          title: 'YouTube Video',
          channel: '',
          note: ''
        },
      ]
    },
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/tGZrB6Ag0aQ',
        videoId: 'tGZrB6Ag0aQ',
        title: '📚 5 Must-Read Books Recommended by Director Mysskin ❤️',
        channel: 'CommonFolks',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=nwo47Ffo8Qg',
        videoId: 'nwo47Ffo8Qg',
        title: 'ஒரு நல்ல பழக்கத்தை ஏற்படுத்துவது எப்படி ? Power of Habits | Motivation Tamil | Sabari Paramasivan',
        channel: 'SABARI PARAMASIVAN ',
        note: ''
      },
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
  },
  {
    id: 'hi',
    name: 'TheBookSmithMathi',
    color: '#78909C',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/p29MDz05Lqk',
        videoId: 'p29MDz05Lqk',
        title: 'Naan ena books lam vaangirkan nu sollava😍✨#bookhaul #tamilbookhaul #tamilbooks',
        channel: 'The Book Smith',
        note: ''
      },
    ]
  },
  {
    id: 'abis-books-beyond',
    name: 'AbiS Books & Beyond',
    color: '#FFA726',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=YKC2NwV2WhU',
        videoId: 'YKC2NwV2WhU',
        title: '​வாழ்க்கையை ஜெயிக்க இந்த ஒரு தத்துவம் போதும்! | The Daily Stoic Book Summary',
        channel: 'AbiS Books & Beyond',
        note: ''
      },
    ]
  },
  {
    id: 'tamil-voice-reads',
    name: 'Tamil Voice Reads',
    color: '#FF7043',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=rgvdv1qQFmo',
        videoId: 'rgvdv1qQFmo',
        title: 'Sapiens A Brief History of Humankind (Yuval Noah Harari) Full Book Explanation Tamil ',
        channel: 'Tamil Voice Reads',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=N-aJp8gY2KQ',
        videoId: 'N-aJp8gY2KQ',
        title: 'Atomic Habits (James Clear) ',
        channel: 'Tamil Voice Reads',
        note: ''
      },
    ]
  }
];
