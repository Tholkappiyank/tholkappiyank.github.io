// --------------------------------------------------------------
// PLAYLIST CONFIG — Test
//
// HAND-MAINTAINED TEST FIXTURE. tests.js looks up the playlist by the literal
// id 'pl1' and asserts it ends up holding 3 videos, so neither the id nor the
// video count can change without updating that assertion.
//
// videoIds starts empty on purpose: remapPlaylistIds() (app.js) resolves the
// `videos[].videoId` entries below to the internal ids seedData() generates,
// and fills videoIds in. That resolution step is exactly what the
// 'playlist remapped by yt id' test covers.
//
// Shape matches what buildPlaylistJsExport() (app.js) emits.
// --------------------------------------------------------------

const DEFAULT_PLAYLISTS = [
  {
    id: 'pl1',
    name: 'Fixture Playlist',
    color: '#26A69A',
    videoIds: [],
    videos: [
      {
        url: 'https://www.youtube.com/watch?v=testVideo01',
        videoId: 'testVideo01',
        title: 'Fixture video one',
        channel: 'Test Channel',
        collectionPath: 'Test / Fixtures',
        note: 'Grouped fixture — also marked watched in test-watched.js'
      },
      {
        url: 'https://www.youtube.com/watch?v=testVideo02&list=PLtestFixture01',
        videoId: 'testVideo02',
        playlistId: 'PLtestFixture01',
        title: 'Fixture video two',
        channel: 'Test Channel',
        collectionPath: 'Test / Fixtures',
        note: 'Grouped fixture — carries a playlistId'
      },
      {
        url: 'https://youtu.be/testVideo03',
        videoId: 'testVideo03',
        title: 'Fixture video three',
        channel: 'Test Channel',
        collectionPath: 'Test',
        note: 'Ungrouped fixture'
      }
    ]
  }
];
