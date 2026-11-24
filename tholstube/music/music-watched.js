// --------------------------------------------------------------
// WATCHED HISTORY
// Exported from TubeVault on 11/24/2026, 10:27:40 AM
//
// WATCHED_VIDEO_IDS: YouTube video IDs marked as watched.
// To restore: replace music-watched.js with this file and clear localStorage.
// --------------------------------------------------------------

const WATCHED_VIDEO_IDS = [
  'Gg7Jgqb30tE', // 🔥 Fast Tabla & Veena | Temple Rhythms | Virtuoso Solo Tabla
  'Tp-K46Ynj5o', // 🔥 Soul of Tabla | Fast Teentaal Rhythm | Rapid Dayan & Baya
  '3tRHLQSpkMA', // Whispers of India | Soft Emotional Bollywood Music
  'D76XBkNoeac', // Chiri Thottu | Sarvam Maya | Nivin Pauly, Preity Mukhundhan 
  'scRQR-FRfIo', // Puthu Mazha | Sarvam Maya | Nivin Pauly, Riya Shibu | Justin
  'k-YdbnWzn6s', // YouTube Video
  'nMxmb7DeKqk', // 🌙 எங்கே நீ... | Enge Nee | Arabic × Carnatic Sufi Fusion | 
  'Ekyc_iJjwsM', // Bipin Jose | Sithara Vijayan | Romantic Travel Song| Pranah 
  'JXmMgsZFenE', // Pookal Pookum | Madrasapattinam| Cover Version 4k - KS Haris
  'R5ymC7gXWJk', // Idhazhin Mozhi | Tamil Romantic Melody | NMC Productions
  'R722GqixnNA', // நீரோடை... 💎 | காதலில் கரையும் இதயம் | Romantic Tamil Melody
  '2tcIB-YHaNs', // யானும் நீயும் | Yaanum Neeyum
  'wSgJPfr1CT0', // https://www.youtube.com/watch?v=wSgJPfr1CT0&list=RDwSgJPfr1C
  'R1z0ASKw4x4', // https://www.youtube.com/watch?v=R1z0ASKw4x4&list=RDR1z0ASKw4
  'cAU0k_yQjLc', // Carnatic Mridangam Solo • 5 Jathi Tala Journey | Pure South 
  'Po8btQUks3g', // https://www.youtube.com/watch?v=Po8btQUks3g
  'EjYdo-6Zh4I', // https://www.youtube.com/watch?v=EjYdo-6Zh4I&list=RDEjYdo-6Zh
  '5Yvt5t6p88s', // YouTube Video
  '4JrOPlxXl8Q', // Othaiyadi Pathayila 8K/4K Video Song | Kanaa | Dhibu Ninan T
  'dvWdFMCC1-I', // Lubber Pandhu - Chillanjirukkiye Video Song | Harish Kalyan,
  'U1JLtpJTe84', // Vazhithunaiye - Video Song | Dragon | Pradeep Ranganathan, K
  'a3Ue-LN5B9U', // @SaiAbhyankkar - Aasa Kooda (Music Video) | Thejo Bharathwaj
  '9fyOu2dxgOY', // Vaa Kannamma | Once More | Arjun Das, Aditi Shankar | Hesham
  '8eYG5QGZAZs', // Jawan: Hayyoda (Tamil) | Shahrukh Khan | Atlee | Anirudh | N
  'N-u9gR8ceQg', // Asku Maaro Video | Kavin, Teju Ashwini | Dharan Kumar | K. S
  'seCVGdhsNYE', // Yaathi Yaathi Music Video | Ashwin Kumar, Harshadaa Vijay | 
  'OCvv031Ga30', // Enna Solla Pogirai - Cute Ponnu Video Song | Ashwin Kumar | 
  'Et3GVVAamuA', // Mayakirriye - Music Video | Mugen Rao | Aathmika | Anirudh R
  'jqCh3fSNog4', // Maryan - Innum Konjam Naeram Tamil Lyric | A.R. Rahman | Dha
  'I8UrKhurkuk', // Maryan - Innum Konjam Naeram Video | A. R. Rahman | Dhanush 
  'thtAxtEuX6c', // Paiya - En Kadhal Solla Video | Karthi, Tamannah | Yuvan Sha
  'U_dSKpLVAEI', // Marudaani (From "Sakkarakatti")
  'l98b32yBiQg', // Engeyum Kaadhal - Nenjil Nenjil Video | Jayam Ravi, Hansika 
  'MgWrkGfDn-o', // Azhagiya Asura 4K Song | Whistle Movie Songs | D. Imman | Vi
  '4deZ7o3zfmI', // Idhayam | Once More |Arjun Das,Aditi Shankar |Hesham Abdul W
  '6B2jvf81LxE', // Pirai Thedum Iravilae Tamil Video Song | Mayakkam Enna | G.V
  'bWlsbVfEnII', // Naanayam - Naan Pogiren Video | Prasanna, Sibi Raj | James V
  'xIO4LFjl1SI', // Nenjukkule Official Full Song - Kadal - AR Rahman
  'pVkDZueTBpY', // Maragatha Naanayam | Nee Kavithaigala Song with Lyrics | Aad
  'WOxan-rN4Cw', // Kandaangi Kandaangi - Video Song | 4K | Jilla Movie | Vijay 
  'S0XcA4rNdKs', // Indian Monsoon Melody | Gentle Rain Instrumental with Huming
  'YPa9SgASMRw', // Medieval Music with Female Vocals in Old English – A Journey
  'MnBbHXu8IyA', // Innisai Alapadaiye ❤️ | Heavenly Vibes from Varalaaru | A.R.
  'hUfuDyhxHT8', // Persian Trance 🌙 Mystical Middle Eastern Deep Trance Mix fo
  'fMKQTLP4aO0', // Pure Relaxation Music | Deep Meditation, Stress Relief & Inn
  'aLSA8Su-3ag', // Ponvaanam paneer
  'WPk_ztNMlS4', // Ithazhil Kathai Ezhuthum
  'xGzUq06oqIk', // Maalaiyil Yaro Manathodu Pesa | மாலையில் யாரோ மனதோடு பேச |
  'URIGe3sZbQI', // Manasu Mayangum | Manasu palike | Sippikkul muthu| Swati Mut
  'xOGOb8NFgoM', // Ilamai Enum poongatru
  'YNmM2ylbpw0', // EllieGoulding|  FiftyShadesOfGrey
  'csD8r48xxTc', // Oliyile therivathu | Azhagi
  'Ms8-IZWSvvc', // Thalaiyai kuniyum thamaraiye | Veena cover | Illayaraja| oru
  'z5G1cVSniA8', // Varathu vantha nayagan
  'tIYnxMmP_UA', // Ooru Sanam
  'plxf9jrzaL8', // Pudhumai Pen | Kadhal Mayakkam |
  'Bs3ehfffA5k', // Oliyile Therivadhu | Azhagi
  '_XBHxWL18Mg', // |KEERAVANI |  NINAVALLE KANAVILE
  'fqKzSgJDqME', // Kannana kanne
  'AVF0_29_vDA', // Kattu malli | காட்டுமல்லி |
  'vq3amtfXZf4', // Vizhiyile
  'XBX2njcow8k', // Kalyana Then Nila
  'wrqzXhA22D8', // Kadhal oviyam
  'hemrgMKNnPQ', // Andhi mazhai pozhigirathu
  '4jocU6ueaoM', // Perai Sollava
  'MTKBYTaMHvY', // Germaniyin Senthen Malare
  'vIDl1E26FpU', // Azhagu Aayiram
  '5ATSSUZuZNY', // Paruvame Puthiya Paadal Paadu
  'syGyHZYsob0', // Best Trance 2026 🚀 | Uplifting, Vocal & Melodic Trance Mix 
  'Dg9ePUDm4Vs', // Positive Energy 2026 🌞 Feel Good Deep House Music for Morni
  'Tg2vlqd47Yo', // Persian & Balkan Fusion Music 4K 🌊 | Relaxing Instrumental 
  'UH3bfZ6Rb9E', // Persian & Spanish Fusion Relaxing Music 4K | Persian Gulf & 
  'GmtTDvNcXcU', // Despacito (Piano Cover) - Peter Bence
  'MhQKe-aERsU', // Ed Sheeran - Shape Of You ( cover by J.Fla )
  'dtiafgbsQl4', // YouTube Video
  'WcIcVapfqXw', // Rema, Selena Gomez - Calm Down (Official Music Video)
  'oebpYD4cXVA',
  'FBVVUvFgsnE', // Staccato | Unplucked  | Niranjana Ramanan
];
