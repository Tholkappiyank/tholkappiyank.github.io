// ──────────────────────────────────────────────────────────────
// COLLECTIONS CONFIG
// Exported from TubeVault on 7/15/2026, 10:32:02 PM
//
// STRUCTURE — easy to browse/edit in any JSON editor:
//   DEFAULT_COLLECTIONS
//     └─ collection (e.g. "Unity Tutorials")
//          ├─ groups: { "Character Movement": [ ...videos ], "Performance": [ ...videos ] }
//          └─ ungrouped: [ ...videos ]   (videos with no sub-group)
//
// To apply this snapshot:
//   1. Replace your existing music-collections.js with this file
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
      'Daily Routine - Melody': [
        {
          url: 'https://www.youtube.com/watch?v=UmyOwP4-eEU&list=PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn&index=48',
          videoId: 'UmyOwP4-eEU',
          playlistId: 'PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn',
          title: 'Veera Sivaji - Soppanasundari Video Song | D. Imman | Vikram Prabhu | Vaikom Vijayalakshmi',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=NM600z8McII&list=PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn&index=55',
          videoId: 'NM600z8McII',
          playlistId: 'PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn',
          title: 'Engeyum Kaadhal - Lolita Video | Jayam Ravi, Hansika | Harris',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=KFxRL3vhIEs&list=PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn&index=28',
          videoId: 'KFxRL3vhIEs',
          playlistId: 'PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn',
          title: 'Neelangarayil - Pulivaal Video Song | Directed by late G. Marimuthu | N. R. Raghunanthan',
          channel: 'Divo Music',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=GWNrPJyRTcA&list=PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn&index=26',
          videoId: 'GWNrPJyRTcA',
          playlistId: 'PLvGJzgY6LDpA0QVcvaKkR4DyckjNAgGRn',
          title: 'Full Video: Chuttamalle - Devara | NTR | Janhvi Kapoor | Anirudh | Shilpa Rao | Koratala Siva',
          channel: 'T-Series Telugu',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=DZvYKPS3SN0&list=RD9fyOu2dxgOY&index=10',
          videoId: 'DZvYKPS3SN0',
          playlistId: 'RD9fyOu2dxgOY',
          title: 'Kurumugil 8K/4K Video Song - Sita Ramam (Tamil) | Dulquer | Mrunal | Vishal | Hanu Raghavapudi',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=4JrOPlxXl8Q&list=RD9fyOu2dxgOY&index=9',
          videoId: '4JrOPlxXl8Q',
          playlistId: 'RD9fyOu2dxgOY',
          title: 'Othaiyadi Pathayila 8K/4K Video Song | Kanaa | Dhibu Ninan Thomas | Anirudh | Aishwarya Rajesh',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=dvWdFMCC1-I&list=RD9fyOu2dxgOY&index=8',
          videoId: 'dvWdFMCC1-I',
          playlistId: 'RD9fyOu2dxgOY',
          title: 'Lubber Pandhu - Chillanjirukkiye Video Song | Harish Kalyan, Attakathi Dinesh | Sean Roldan',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=U1JLtpJTe84&list=RD9fyOu2dxgOY&index=7',
          videoId: 'U1JLtpJTe84',
          playlistId: 'RD9fyOu2dxgOY',
          title: 'Vazhithunaiye - Video Song | Dragon | Pradeep Ranganathan, Kayadu | Ashwath Marimuthu | Leon James',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=a3Ue-LN5B9U&list=RD9fyOu2dxgOY&index=6',
          videoId: 'a3Ue-LN5B9U',
          playlistId: 'RD9fyOu2dxgOY',
          title: '@SaiAbhyankkar - Aasa Kooda (Music Video) | Thejo Bharathwaj | Preity Mukundhan | Sai Smriti',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=9fyOu2dxgOY&list=RD9fyOu2dxgOY&start_radio=1',
          videoId: '9fyOu2dxgOY',
          playlistId: 'RD9fyOu2dxgOY',
          title: 'Vaa Kannamma | Once More | Arjun Das, Aditi Shankar | Hesham Abdul Wahab | Vignesh Srikanth |Yuvaraj',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=8eYG5QGZAZs&list=RDOCvv031Ga30&index=5',
          videoId: '8eYG5QGZAZs',
          playlistId: 'RDOCvv031Ga30',
          title: 'Jawan: Hayyoda (Tamil) | Shahrukh Khan | Atlee | Anirudh | Nayanthara | Vijay S | Priya Mali | Vivek',
          channel: 'T-Series Tamil',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=N-u9gR8ceQg&list=RDOCvv031Ga30&index=3',
          videoId: 'N-u9gR8ceQg',
          playlistId: 'RDOCvv031Ga30',
          title: 'Asku Maaro Video | Kavin, Teju Ashwini | Dharan Kumar | K. Sivaangi | Dongli Jumbo | Sandy',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=seCVGdhsNYE&list=RDOCvv031Ga30&index=2',
          videoId: 'seCVGdhsNYE',
          playlistId: 'RDOCvv031Ga30',
          title: 'Yaathi Yaathi Music Video | Ashwin Kumar, Harshadaa Vijay | Abhishek CS | Goutham George | Sridhar',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=OCvv031Ga30&list=RDOCvv031Ga30&start_radio=1',
          videoId: 'OCvv031Ga30',
          playlistId: 'RDOCvv031Ga30',
          title: 'Enna Solla Pogirai - Cute Ponnu Video Song | Ashwin Kumar | Vivek - Mervin | Anirudh | A. Hariharan',
          channel: 'Muzik247',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=Et3GVVAamuA&list=RDEt3GVVAamuA&start_radio=1',
          videoId: 'Et3GVVAamuA',
          playlistId: 'RDEt3GVVAamuA',
          title: 'Mayakirriye - Music Video | Mugen Rao | Aathmika | Anirudh Ravichander | AniVee | Jimmyrudh',
          channel: 'Saregama Tamil',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=jqCh3fSNog4&list=RD2R0uOHTEFJE&index=7',
          videoId: 'jqCh3fSNog4',
          playlistId: 'RD2R0uOHTEFJE',
          title: 'Maryan - Innum Konjam Naeram Tamil Lyric | A.R. Rahman | Dhanush',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=I8UrKhurkuk&list=RDI8UrKhurkuk&start_radio=1',
          videoId: 'I8UrKhurkuk',
          playlistId: 'RDI8UrKhurkuk',
          title: 'Maryan - Innum Konjam Naeram Video | A. R. Rahman | Dhanush | Super Hit Song',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=thtAxtEuX6c&list=RD2R0uOHTEFJE&index=5',
          videoId: 'thtAxtEuX6c',
          playlistId: 'RD2R0uOHTEFJE',
          title: 'Paiya - En Kadhal Solla Video | Karthi, Tamannah | Yuvan Shankar Raja',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=U_dSKpLVAEI&list=RD2R0uOHTEFJE&index=3',
          videoId: 'U_dSKpLVAEI',
          playlistId: 'RD2R0uOHTEFJE',
          title: 'Marudaani (From "Sakkarakatti")',
          channel: 'A. R. Rahman - Topic',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=l98b32yBiQg&list=RD2R0uOHTEFJE&index=2',
          videoId: 'l98b32yBiQg',
          playlistId: 'RD2R0uOHTEFJE',
          title: 'Engeyum Kaadhal - Nenjil Nenjil Video | Jayam Ravi, Hansika | Harris',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=MgWrkGfDn-o&list=RDWOxan-rN4Cw&index=13',
          videoId: 'MgWrkGfDn-o',
          playlistId: 'RDWOxan-rN4Cw',
          title: 'Azhagiya Asura 4K Song | Whistle Movie Songs | D. Imman | Vikramaditya | Sherin | Gayathri Raguram',
          channel: 'API Tamil Songs',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=4deZ7o3zfmI&list=RDWOxan-rN4Cw&index=12',
          videoId: '4deZ7o3zfmI',
          playlistId: 'RDWOxan-rN4Cw',
          title: 'Idhayam | Once More |Arjun Das,Aditi Shankar |Hesham Abdul Wahab |Vineeth |Vignesh Srikanth |Yuvaraj',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=6B2jvf81LxE&list=RDWOxan-rN4Cw&index=5',
          videoId: '6B2jvf81LxE',
          playlistId: 'RDWOxan-rN4Cw',
          title: 'Pirai Thedum Iravilae Tamil Video Song | Mayakkam Enna | G.V. Prakash | Dhanush, Richa',
          channel: 'Rajshri Tamil',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=bWlsbVfEnII&list=RDWOxan-rN4Cw&index=4',
          videoId: 'bWlsbVfEnII',
          playlistId: 'RDWOxan-rN4Cw',
          title: 'Naanayam - Naan Pogiren Video | Prasanna, Sibi Raj | James Vasanthan',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=xIO4LFjl1SI&list=RDWOxan-rN4Cw&index=3',
          videoId: 'xIO4LFjl1SI',
          playlistId: 'RDWOxan-rN4Cw',
          title: 'Nenjukkule Official Full Song - Kadal - AR Rahman',
          channel: 'Sony Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=pVkDZueTBpY&list=RDWOxan-rN4Cw&index=2',
          videoId: 'pVkDZueTBpY',
          playlistId: 'RDWOxan-rN4Cw',
          title: 'Maragatha Naanayam | Nee Kavithaigala Song with Lyrics | Aadhi, Nikki Galrani | Dhibu Ninan Thomas',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=WOxan-rN4Cw&list=RDWOxan-rN4Cw&start_radio=1',
          videoId: 'WOxan-rN4Cw',
          playlistId: 'RDWOxan-rN4Cw',
          title: 'Kandaangi Kandaangi - Video Song | 4K | Jilla Movie | Vijay | Kajal Agarwal | D.Imman | Star Music',
          channel: 'Star Music India',
          note: ''
        },
      ],
      'Humming': [
        {
          url: 'https://www.youtube.com/watch?v=MnBbHXu8IyA&list=RD9fyOu2dxgOY&index=11',
          videoId: 'MnBbHXu8IyA',
          playlistId: 'RD9fyOu2dxgOY',
          title: 'Innisai Alapadaiye ❤️ | Heavenly Vibes from Varalaaru | A.R. Rahman Tribute',
          channel: 'Prabhu Musiq Vibez',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=UH3bfZ6Rb9E&list=RDUH3bfZ6Rb9E&start_radio=1',
          videoId: 'UH3bfZ6Rb9E',
          playlistId: 'RDUH3bfZ6Rb9E',
          title: 'Persian & Spanish Fusion Relaxing Music 4K | Persian Gulf & Spanish Beaches | Guitar & Santur',
          channel: 'WolfRelaxMusicHub',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=hUfuDyhxHT8&list=RDhUfuDyhxHT8&start_radio=1&t=5409s',
          videoId: 'hUfuDyhxHT8',
          playlistId: 'RDhUfuDyhxHT8',
          title: 'Persian Trance 🌙 Mystical Middle Eastern Deep Trance Mix for Work, Study & Meditation',
          channel: 'Persian Focus Temple',
          note: ''
        },
      ],
      'Daily Routine': [
        {
          url: 'https://www.youtube.com/watch?v=ohnVWZjSejE&list=RD2R0uOHTEFJE&index=4',
          videoId: 'ohnVWZjSejE',
          playlistId: 'RD2R0uOHTEFJE',
          title: 'Nira Video Song (Extended Version) | Takkar (Tamil) | Siddharth | Karthik G Krish | Nivas K Prasanna',
          channel: 'Think Music India',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=lZORMUufA_Y&list=RDlZORMUufA_Y&start_radio=1',
          videoId: 'lZORMUufA_Y',
          playlistId: 'RDlZORMUufA_Y',
          title: '3 - Idhazhin Oram Video | Dhanush, Shruti | Anirudh',
          channel: 'SonyMusicSouthVEVO',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=Bm9lLpmPM0A&list=PLYloDMfA37Gd8gz_rBSWHaOcMQuHqFHfz&index=1',
          videoId: 'Bm9lLpmPM0A',
          playlistId: 'PLYloDMfA37Gd8gz_rBSWHaOcMQuHqFHfz',
          title: 'Pattampoochi Lyric Video | Vishwanath and Sons | Suriya, Mamitha Baiju | G.V. Prakash | Venky Atluri',
          channel: 'Aditya Music Tamil',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=dR9B_gPxjkk&list=RDKUN5Uf9mObQ&index=31',
          videoId: 'dR9B_gPxjkk',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Kiliye Kiliye - Video Song | Lokah Chapter 1: Chandra | Kalyani Priyadarshan | Naslen | Dominic Arun',
          channel: 'Saregama Malayalam',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=PjT12Ce0Kw8&list=RDKUN5Uf9mObQ&index=27',
          videoId: 'PjT12Ce0Kw8',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Mukkala Mukkabala Video Song | Kadhalan Movie Songs | Prabhudeva | Nagma | AR Rahman',
          channel: 'API Tamil Songs',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=1seR_ckLXz4&list=RDKUN5Uf9mObQ&index=24',
          videoId: '1seR_ckLXz4',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Golden Sparrow - Video Song | Dhanush | Priyanka Mohan | Pavish | Anikha | GV Prakash #NEEK',
          channel: 'Wunderbar Films',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=mNcmezwxWTI&list=RDKUN5Uf9mObQ&index=11',
          videoId: 'mNcmezwxWTI',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Thottu Thottu Pesum Sulthana Song | Ethirum Puthirum (1999) | Vidyasagar | Tamil Hit Song',
          channel: 'RJS Music',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=Hho8U12gf1Y&list=RDKUN5Uf9mObQ',
          videoId: 'Hho8U12gf1Y',
          playlistId: 'RDKUN5Uf9mObQ',
          title: 'Kadhalikka Neramillai - Yennai Izhukkuthadi Video | Feat. AR Rahman | Ravi Mohan | Nithya Menen',
          channel: 'T-Series Tamil',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=paDG3S3UmQM',
          videoId: 'paDG3S3UmQM',
          title: 'Don - Private Party Music Video | Sivakarthikeyan, Priyanka Mohan | Anirudh | Jonita Gandhi | Cibi',
          channel: 'Sony Music South',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=jZEA2mMwL1k&list=RDjZEA2mMwL1k&start_radio=1',
          videoId: 'jZEA2mMwL1k',
          playlistId: 'RDjZEA2mMwL1k',
          title: 'Mutta Kalakki Music Video | Youth | Ken Karunaas | Suraj Venjaramoodu | GV Prakash Kumar',
          channel: 'G.V. Prakash Kumar',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=JEf6C7PYBys&list=RDJEf6C7PYBys&start_radio=1',
          videoId: 'JEf6C7PYBys',
          playlistId: 'RDJEf6C7PYBys',
          title: '✨️🎼Aasa kooda song tamil trending🙏 songs🎶 Sai Abhyankar 💖🎶🍟',
          channel: 'Abinaya Murthy',
          note: ''
        },
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
  },
  {
    id: 'music-english',
    name: 'Music -English',
    color: '#FFA726',
    groups: {
      'English - Lyrics': [
        {
          url: 'https://www.youtube.com/watch?v=OcGe6Hy8qOE&list=RDOcGe6Hy8qOE&start_radio=1',
          videoId: 'OcGe6Hy8qOE',
          playlistId: 'RDOcGe6Hy8qOE',
          title: 'Ed Sheeran - Shape of You (Lyrics)',
          channel: 'Pizza Music',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=mY9fNwGE7YA&list=RDmY9fNwGE7YA&start_radio=1',
          videoId: 'mY9fNwGE7YA',
          playlistId: 'RDmY9fNwGE7YA',
          title: 'Sia - Cheap Thrills (Lyrics) ft. Sean Paul',
          channel: '7clouds',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=czWcyZRAMtk&list=RDczWcyZRAMtk&start_radio=1',
          videoId: 'czWcyZRAMtk',
          playlistId: 'RDczWcyZRAMtk',
          title: 'Shakira - Waka Waka (This Time For Africa) (Lyrics)',
          channel: '7clouds',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=qdpXxGPqW-Y&list=RDoS07d8Gr4tw&index=2',
          videoId: 'qdpXxGPqW-Y',
          playlistId: 'RDoS07d8Gr4tw',
          title: 'Alan Walker - Faded (Lyrics)',
          channel: '7clouds',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=oS07d8Gr4tw&list=RDoS07d8Gr4tw&start_radio=1',
          videoId: 'oS07d8Gr4tw',
          playlistId: 'RDoS07d8Gr4tw',
          title: 'Sia - Unstoppable (Lyrics)',
          channel: '7clouds',
          note: ''
        },
        {
          url: 'https://www.youtube.com/watch?v=dtiafgbsQl4&list=RDdtiafgbsQl4&start_radio=1',
          videoId: 'dtiafgbsQl4',
          playlistId: 'RDdtiafgbsQl4',
          title: 'YouTube Video',
          channel: '',
          note: 'Collection'
        },
      ]
    },
    ungrouped: []
  }
];
