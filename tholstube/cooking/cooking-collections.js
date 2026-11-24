// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 11/24/2026, 10:21:25 AM
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
        url: 'https://www.youtube.com/shorts/mJNjABOzkoY',
        videoId: 'mJNjABOzkoY',
        title: 'கொத்தவரங்காய் சாப்பிட்டால் உடலுக்கு இவ்வளவு நன்மையா? OSB | Mayan Senthil',
        channel: 'OmSaravanaBhava',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/9RXvM3Wh8Y8',
        videoId: '9RXvM3Wh8Y8',
        title: 'காய்கறி கழிவுகள் & Kitchen Waste அனைத்தையும் உரமாக மாற்றும் Compost Maker! 🔥',
        channel: 'Tiffin Carrier',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/I_4LWJUHT8I',
        videoId: 'I_4LWJUHT8I',
        title: 'பலதானியம் - மண்ணை பொன்னாக்கும் hack!',
        channel: 'Save Soil - மண் காப்போம்',
        note: ''
      },
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
  },
  {
    id: 'honey',
    name: 'Honey',
    color: '#29B6F6',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/oY_uqXnfqao',
        videoId: 'oY_uqXnfqao',
        title: 'பூண்டு + தேன் 🧄🐝',
        channel: 'Tamil Speech Box',
        note: ''
      },
    ]
  },
  {
    id: 'snacks',
    name: 'Snacks',
    color: '#EF5350',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/ijl20Xy7ZyM',
        videoId: 'ijl20Xy7ZyM',
        title: 'Paneer Ke Sholay ❤️🤩 #thecookgirl #paneerkesholay #paneer #easysnacks #snacksrecipe',
        channel: 'The Cook Girl ',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/4F9ye5ylDSs',
        videoId: '4F9ye5ylDSs',
        title: '🥗  சுண்டலோ சுண்டல்! 🫘 😋 | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
    ]
  }
];
