// Test seed data for tests.html — NOT a real category, just fixtures so the
// feature tests have collections / videos / a playlist / watched ids to act on.
const COLLECTION_COLORS = [
  '#5C6BC0', '#EF5350', '#26A69A', '#FFA726',
  '#66BB6A', '#AB47BC', '#29B6F6', '#FF7043',
  '#78909C', '#EC407A'
];

const DEFAULT_COLLECTIONS = [
  {
    id: 'demo',
    name: 'Demo',
    color: '#26A69A',
    groups: {
      'Basics': [
        { url: 'https://www.youtube.com/watch?v=aaaaaaaaaa1', videoId: 'aaaaaaaaaa1', title: 'Demo One', channel: 'Demo Chan', note: 'first' },
        { url: 'https://www.youtube.com/watch?v=bbbbbbbbbb2', videoId: 'bbbbbbbbbb2', title: 'Demo Two', channel: 'Demo Chan', note: 'second' }
      ]
    },
    ungrouped: [
      { url: 'https://www.youtube.com/watch?v=cccccccccc3', videoId: 'cccccccccc3', title: 'Demo Three', channel: 'Demo Chan', note: '' }
    ]
  }
];
