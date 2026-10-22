// Songie ana ekranının metinleri ("Songie · ana ekran" tasarımı).

abstract final class TrSongie {
  static const free = 'Ücretsiz';
  static String hello(String nick) => 'Selam, $nick';
  static const heroTitle = 'Şarkıyı 0,1 saniyeden bil.';
  static const stages = ['0,1 sn', '0,5 sn', '2 sn', '8 sn', '15 sn'];
  static const heroLead = 'Her “Pas”ta parça biraz daha uzar. Ne kadar erken bilirsen o kadar çok puan.';

  static const solo = 'Tek başına oyna';
  static const soloSub = 'Hemen başla, serini büyüt';
  static const friends = 'Arkadaşlarla oyna';
  static const friendsSub = 'Oda kur, linki gruba at';
  static const starting = 'Hazırlanıyor…';

  static const lists = 'Liste seç';
  static const listsLabel = 'Şarkı listesi';
  static String songs(int n) => '$n şarkı';
  static const listsLoading = 'Listeler hazırlanıyor…';
  static const addList = 'Liste ekle';
  static const addListSub = 'Deezer ya da Spotify linki';
  static const addListTitle = 'Liste ekle';
  static const addListLead = 'Deezer ya da Spotify playlist linkini yapıştır. Eklediğin listeler yalnızca sana görünür.';
  static const addListPlaceholder = 'open.spotify.com/playlist/…';
  static const addListButton = 'Ekle';
  static const adding = 'Ekleniyor…';
  static const addingSpotify = 'Spotify listesi Deezer’da eşleştiriliyor…';
  static const addFailed = 'Liste eklenemedi. Linki kontrol edip tekrar dene.';
  static const cancel = 'Vazgeç';

  static const difficulty = 'Zorluk';
  static const difficultyLabels = <String, String>{
    'easy': 'Kolay',
    'medium': 'Orta',
    'hard': 'Zor',
    'expert': 'Uzman',
    'impossible': 'İmkânsız',
  };
  static const difficultyHints = <String, String>{
    'easy': 'Bilinen hitler, tanıması kolay.',
    'medium': 'Popüler ama her zaman ilk akla gelmeyenler.',
    'hard': 'Daha az bilinen parçalar.',
    'expert': 'Gerçek dinleyiciler için.',
    'impossible': 'Şansına güvenenlere.',
  };

  static const records = 'Rekorların';
  static const profile = 'Profil';
  static const bestScore = 'EN YÜKSEK SKOR';
  static const bestStreak = 'EN UZUN SERİ';
  static const games = 'OYUN';
  static const wins = 'GALİBİYET';

  static const howTo = 'Nasıl oynanır?';
  static const steps = ['0,1 saniyelik kesiti dinle.', 'Bilemezsen “Pas” de, parça uzasın.', 'Şarkıyı ara, bul, puanı kap.'];
}
