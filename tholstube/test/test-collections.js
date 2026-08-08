// --------------------------------------------------------------
// COLLECTIONS CONFIG — Test
//
// HAND-MAINTAINED TEST FIXTURE — not demo data, not a generated seed.
// tests.js asserts against the exact contents of this file (video counts,
// group names, the watched flag), so changing it changes what the feature
// tests expect. build.js's writeCategorySeeds() skips files that already
// exist, so `node build.js` will not overwrite this.
//
// Shape matches what buildCollectionsJsExport() (app.js) emits, so an export
// from the running test page round-trips back into this format.
//
// The videoIds below are deliberately fake 11-character strings: no assertion
// should depend on a real YouTube video still existing. Their thumbnails 404
// harmlessly into the app's own thumb-error handler.
// --------------------------------------------------------------

const COLLECTION_COLORS = [
  '#5C6BC0', '#EF5350', '#26A69A', '#FFA726',
  '#66BB6A', '#AB47BC', '#29B6F6', '#FF7043',
  '#78909C', '#EC407A'
];

const DEFAULT_COLLECTIONS = [
  {
    id: 'test',
    name: 'Test',
    color: '#5C6BC0',
    groups: {
      'Fixtures': [
        {
          url: 'https://www.youtube.com/watch?v=testVideo01',
          videoId: 'testVideo01',
          title: 'Fixture video one',
          channel: 'Test Channel',
          note: 'Grouped fixture — also marked watched in test-watched.js'
        },
        {
          url: 'https://www.youtube.com/watch?v=testVideo02&list=PLtestFixture01',
          videoId: 'testVideo02',
          playlistId: 'PLtestFixture01',
          title: 'Fixture video two',
          channel: 'Test Channel',
          note: 'Grouped fixture — carries a playlistId'
        }
      ]
    },
    ungrouped: [
      {
        url: 'https://youtu.be/testVideo03',
        videoId: 'testVideo03',
        title: 'Fixture video three',
        channel: 'Test Channel',
        note: 'Ungrouped fixture'
      }
    ]
  }
];
