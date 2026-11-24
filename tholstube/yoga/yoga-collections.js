// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 11/24/2026, 10:19:52 AM
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing yoga-collections.js with this file
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
    id: 'yoga',
    name: 'Yoga',
    color: '#AB24BC',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/iNGTtM5W1wY',
        videoId: 'iNGTtM5W1wY',
        title: '👁️எதுக்குங்க மூன்றாவது கண் வேணும்❓| Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/QJvdZ2vI3oA',
        videoId: 'QJvdZ2vI3oA',
        title: 'தரையில் கைகளை ஊன்றி சாப்பிடுவது..Good? Or Bad? | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/5JCbGVu7iPc',
        videoId: '5JCbGVu7iPc',
        title: '🌞 சூரிய நாடி🌙சந்திர நாடி ரகசியம்! | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/TpGJJAwT1SY',
        videoId: 'TpGJJAwT1SY',
        title: 'Glow Naturally – Face Yoga Without Any Cream 🌿 | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/TVgsIboESM8',
        videoId: 'TVgsIboESM8',
        title: 'மன பதட்டம் குறைய Super Technique!👌| Suganthi Jaya | International Yoga Trainer | Box Breathing',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/Hf2rmC1Kmas',
        videoId: 'Hf2rmC1Kmas',
        title: 'அளவற்ற மன அமைதி தரும்  கேசரி முத்திரை!🧘‍♀️✨ | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/BKq3Qyevj2U',
        videoId: 'BKq3Qyevj2U',
        title: 'வயிறு பிரச்சனைக்கு🤘 ருத்ர முத்திரை! 🧘‍♀️✨| Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/75JwF--xj-M',
        videoId: '75JwF--xj-M',
        title: 'சர்க்கரை (நீரிழிவு) நோய் ஒரு வியாதி அல்ல...| Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/aWkklvxXOvI',
        videoId: 'aWkklvxXOvI',
        title: '✅தூக்கமின்மைக்கு எளிய தீர்வு 🙅‍♀️| Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/MkH9jevn-Yk',
        videoId: 'MkH9jevn-Yk',
        title: 'அடிமையாக்கும் மூச்சுப் பயிற்சி! சந்திர பேதனா | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/O9vzJs9uqjw',
        videoId: 'O9vzJs9uqjw',
        title: '🙏🏻 கடவுள் சிலைகள் சொல்லும் ஆழமான அர்த்தம்! | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/grk61Dv1gsk',
        videoId: 'grk61Dv1gsk',
        title: '🤔 நீங்கள் நல்லவரா❓ இல்ல கெட்டவரா❓| Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/shorts/35ien1Y6tcA',
        videoId: '35ien1Y6tcA',
        title: '💯கனவுகளை நிஜமாக்கும் குபேர முத்திரை👌Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
      {
        url: 'https://www.youtube.com/watch?v=Zsvpce94jSM',
        videoId: 'Zsvpce94jSM',
        title: 'ஞாபக சக்தி அதிகரிக்க கட்டாயம் செய்ய வேண்டிய யோக பயிற்சி | Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
    ]
  },
  {
    id: 'body',
    name: 'Body',
    color: '#AB47BC',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=vSrDrPvA3kI',
        videoId: 'vSrDrPvA3kI',
        title: 'Jeevitha Sureshkumar interview: கடவுளா? ஜோதிடமா? இந்த தவறு செய்தால்..😱 | how to get succeed in life',
        channel: 'The Divine தமிழ்',
        note: ''
      },
    ]
  },
  {
    id: 'hair',
    name: 'Hair',
    color: '#5C6BC0',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/7OH9fB3OwPc',
        videoId: '7OH9fB3OwPc',
        title: 'வெள்ளை முடி கருப்பாக... டாக்டர் நித்யா சொல்லும் கடுக்காய் பொடி ரகசியம்! 💡#haircare #shorts #viral',
        channel: 'Tharaa Speakz',
        note: ''
      },
    ]
  },
  {
    id: 'mudras',
    name: 'Mudras',
    color: '#AB47BC',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/shorts/Muh_zqguUqs',
        videoId: 'Muh_zqguUqs',
        title: '⚡எனர்ஜி குறையுதா❓ உத்தரபோதி முத்திரை! (Uttara Bodhi Mudra)Suganthi Jaya | International Yoga Trainer',
        channel: 'Yoga with Suganthi',
        note: ''
      },
    ]
  },
  {
    id: 'mouth',
    name: 'Mouth',
    color: '#29B6F6',
    groups: {},
    ungrouped: [
      {
        url: 'https://www.youtube.com/watch?v=Iq-CPRvycAI',
        videoId: 'Iq-CPRvycAI',
        title: 'Kottakkal Ayurveda: Why I’ve Used These Products for Years 🌿',
        channel: 'Daisy Bopanna',
        note: ''
      },
    ]
  }
];
