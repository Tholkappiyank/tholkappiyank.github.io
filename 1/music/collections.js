// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 01/07/2026, 18:07:36
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing collections.js with this file
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
    id: 'music',
    name: 'Music',
    color: '#EC407A',
    groups: {
      'Daily Routine': [
        {
          url: 'https://www.youtube.com/watch?v=eF9LRFbkHLQ&list=RDKUN5Uf9mObQ&index=27',
          videoId: 'eF9LRFbkHLQ',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Makkamishi | Brother | Jayam Ravi, Priyanka Mohan| Harris Jayaraj |Paal Dabba| Rajesh.M|Screen Scene',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=MJmxdlCtFWU&list=RDKUN5Uf9mObQ&index=27',
          videoId: 'MJmxdlCtFWU',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Two Two Two - Video Song | Kaathuvaakula Rendu Kaadhal | Vijay Sethupathi | Anirudh | Vignesh Shivan',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=MmvpbLdaIRs&list=RDKUN5Uf9mObQ&index=27',
          videoId: 'MmvpbLdaIRs',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Mersal - Maacho Tamil Video | Vijay, Kajal Aggarwal | A.R. Rahman',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=u_nDlTN0fQk&list=RDKUN5Uf9mObQ&index=28',
          videoId: 'u_nDlTN0fQk',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Bullet Full Video Song (Tamil) | Ram Pothineni, Krithi Shetty | Simbu | Lingusamy | DSP',
          channel: 'Aditya Music Tamil',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=izbydia9jz4&list=RDKUN5Uf9mObQ&index=27',
          videoId: 'izbydia9jz4',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Narivetta - Minnalvala Video Song | Tovino Thomas, Anuraj Manohar, Jakes Bejoy, Sid Sriram, Sithara',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=q_hevkY0hhY&list=RDKUN5Uf9mObQ&index=27',
          videoId: 'q_hevkY0hhY',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Full Video: Mehabooba (Tamil) KGF Chapter 2 | RockingStar Yash | Prashanth Neel | Ravi Basrur',
          channel: 'T-Series Tamil',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=tYSrY4iPX6w&list=RDKUN5Uf9mObQ&index=27',
          videoId: 'tYSrY4iPX6w',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Tum Tum - Video Song | Enemy (Tamil) | Vishal,Arya | Anand Shankar | Vinod Kumar | Thaman S',
          channel: 'Divo Music',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=ijBxe70sd8M&list=RDKUN5Uf9mObQ&index=21',
          videoId: 'ijBxe70sd8M',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Achacho - Video Song | Aranmanai 4  | Sundar.C | Tamannaah | Raashii Khanna | Hiphop Tamizha',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=b68HETiNO98&list=RDKUN5Uf9mObQ&index=20',
          videoId: 'b68HETiNO98',
          playlistId: 'RDKUN5Uf9mObQ',
          title: '@SaiAbhyankkar - Pavazha Malli (Music Video) | Kayadu | Shruti Haasan | Vivek | Thejo | Think Indie',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=R3IKB2tmaC8&list=RDKUN5Uf9mObQ&index=13',
          videoId: 'R3IKB2tmaC8',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'YouTube Video',
          channel: '',
          note: 'Tamil Songs for Daily Routine'
        },
      ],
      'Veena': [
        {
          url: 'https://www.youtube.com/watch?v=aLSA8Su-3ag',
          videoId: 'aLSA8Su-3ag',
          title: 'Ponvaanam paneer',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena Cover by  Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=WPk_ztNMlS4&list=RDxOGOb8NFgoM&index=4',
          videoId: 'WPk_ztNMlS4',
          playlistId: 'RDxOGOb8NFgoM',
          title: 'Ithazhil Kathai Ezhuthum',
          channel: 'Stringwings official',
          note: 'Veena Cover Phaninarayana veena'
        },
        {
          url: 'https://www.youtube.com/watch?v=xGzUq06oqIk&list=RDxOGOb8NFgoM&index=3',
          videoId: 'xGzUq06oqIk',
          playlistId: 'RDxOGOb8NFgoM',
          title: 'Maalaiyil Yaro Manathodu Pesa | மாலையில் யாரோ மனதோடு பேச |',
          channel: 'Veena-Meerakrishna',
          note: 'Veena Cover by Veena Meerakrishna'
        },
        {
          url: 'https://www.youtube.com/watch?v=URIGe3sZbQI&list=RDxOGOb8NFgoM&index=2',
          videoId: 'URIGe3sZbQI',
          playlistId: 'RDxOGOb8NFgoM',
          title: 'Manasu Mayangum | Manasu palike | Sippikkul muthu| Swati Mutyam | Illayaraja hits | Veena cover |',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena Cover by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=xOGOb8NFgoM&list=RDxOGOb8NFgoM&start_radio=1',
          videoId: 'xOGOb8NFgoM',
          playlistId: 'RDxOGOb8NFgoM',
          title: 'Ilamai Enum poongatru',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena cover by Ranjani Mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=YNmM2ylbpw0&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=22',
          videoId: 'YNmM2ylbpw0',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'EllieGoulding|  FiftyShadesOfGrey',
          channel: 'Veena Srivani',
          note: 'Veena cover by Srivani'
        },
        {
          url: 'https://www.youtube.com/watch?v=csD8r48xxTc&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=20',
          videoId: 'csD8r48xxTc',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Oliyile therivathu | Azhagi',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena Cover by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=Ms8-IZWSvvc&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=20',
          videoId: 'Ms8-IZWSvvc',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Thalaiyai kuniyum thamaraiye | Veena cover | Illayaraja| oru odai nadhiyagirathu | Ranjani mahesh',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena Cover by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=z5G1cVSniA8&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=18',
          videoId: 'z5G1cVSniA8',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Varathu vantha nayagan',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena cover by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=tIYnxMmP_UA&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=17',
          videoId: 'tIYnxMmP_UA',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Ooru Sanam',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=plxf9jrzaL8&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=15',
          videoId: 'plxf9jrzaL8',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Pudhumai Pen | Kadhal Mayakkam |',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=Bs3ehfffA5k&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=13',
          videoId: 'Bs3ehfffA5k',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Oliyile Therivadhu | Azhagi',
          channel: 'BandVisai',
          note: 'Veena By Veenai Srinidhi'
        },
        {
          url: 'https://www.youtube.com/watch?v=_XBHxWL18Mg&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=12',
          videoId: '_XBHxWL18Mg',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: '|KEERAVANI |  NINAVALLE KANAVILE',
          channel: 'Stringwings official',
          note: 'Veena by Phani narayana'
        },
        {
          url: 'https://www.youtube.com/watch?v=fqKzSgJDqME&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=10',
          videoId: 'fqKzSgJDqME',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Kannana kanne',
          channel: 'Veena Srivani',
          note: 'Veena by Veena Srivani'
        },
        {
          url: 'https://www.youtube.com/watch?v=AVF0_29_vDA&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=9',
          videoId: 'AVF0_29_vDA',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Kattu malli | காட்டுமல்லி |',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=vq3amtfXZf4&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=8',
          videoId: 'vq3amtfXZf4',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Vizhiyile',
          channel: 'Voice Veena Twins ',
          note: 'Veena by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=XBX2njcow8k&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=7',
          videoId: 'XBX2njcow8k',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Kalyana Then Nila',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena by Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=wrqzXhA22D8&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=6',
          videoId: 'wrqzXhA22D8',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Kadhal oviyam',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veen by Rangani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=hemrgMKNnPQ&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=5',
          videoId: 'hemrgMKNnPQ',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Andhi mazhai pozhigirathu',
          channel: 'Veena Ranjani Mahesh',
          note: 'Veena by  Ranjani mahesh'
        },
        {
          url: 'https://www.youtube.com/watch?v=4jocU6ueaoM&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=4',
          videoId: '4jocU6ueaoM',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Perai Sollava',
          channel: 'INRECO Tamil Film Evergreen Nostalgic Songs',
          note: 'Veena by Veenai Srinidhi'
        },
        {
          url: 'https://www.youtube.com/watch?v=MTKBYTaMHvY&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=3',
          videoId: 'MTKBYTaMHvY',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Germaniyin Senthen Malare',
          channel: 'INRECO Tamil Film Evergreen Nostalgic Songs',
          note: 'Veena by Veenai Srinidhi'
        },
        {
          url: 'https://www.youtube.com/watch?v=vIDl1E26FpU&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY&index=2',
          videoId: 'vIDl1E26FpU',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Azhagu Aayiram',
          channel: 'INRECO Tamil Film Evergreen Nostalgic Songs',
          note: 'Veena by Veenai Srinidhi'
        },
        {
          url: 'https://www.youtube.com/watch?v=5ATSSUZuZNY&list=PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          videoId: '5ATSSUZuZNY',
          playlistId: 'PLvGJzgY6LDpB2AZVXGhN60dR5QhffZrvY',
          title: 'Paruvame Puthiya Paadal Paadu',
          channel: '',
          note: 'Veena by Veenai Srinidhi'
        },
      ]
    },
    ungrouped: []
  }
];
