// games/taboo/client/strings.ts ile birebir.

abstract final class S {
  static const name = 'Tabu';
  static const team = <String, String>{'a': 'Yeşil takım', 'b': 'Mor takım'};
}

abstract final class SSettings {
  static const teams = 'Takımlar';
  static const teamsHint = 'Bir oyuncuya dokunarak takımını değiştir. Takımı seçilmeyenler başlarken dağıtılır.';
  static const unassigned = 'Takımsız';
  static const shuffle = 'Karıştır';
  static const empty = 'Henüz kimse yok';
  static const categories = 'Kategoriler';
  static const adultHint = '+18 kategoriler açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const seconds = 'Tur süresi';
  static String sec(int n) => '$n sn';
  static const passes = 'Pas hakkı';
  static const unlimited = 'Sınırsız';
  static const turns = 'Takım başına anlatma';
  static String turnsHint(int n) => n == 0 ? 'Oda sahibi bitirene kadar sürer.' : 'Toplam ${n * 2} tur.';
  static const penalty = 'Tabu cezası';
  static const penaltyHint = 'Yasaklı kelime söylenirse anlatan takımdan 1 puan düşer.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const addCard = 'Kart ekle';
  static const addCardHint = 'Eklediğin kart “Arkadaş kartları” kategorisine girer.';
  static const word = 'Anlatılacak kelime';
  static String taboo(int i) => 'Yasaklı $i';
  static const save = 'Kartı ekle';
  static const saving = 'Ekleniyor…';
  static String saved(String w) => '“$w” eklendi.';
  static const needTwo = 'Her takımda en az 2 kişi olmalı.';

  /// SettingsPanel.tsx içindeki sabit hata metni.
  static const saveFailed = 'Eklenemedi.';
}

abstract final class SPlay {
  static String turn(int n, int? total) => total != null && total > 0 ? 'Tur ${n + 1 < total ? n + 1 : total}/$total' : 'Tur ${n + 1}';
  static String pill(String turn) => 'Tabu · $turn';
  static String headNarrator(String nick) => '$nick anlatıyor · sen';
  static String headWatcher(String nick) => '$nick anlatıyor · kartı sen de görüyorsun';
  static String headSpectator(String nick) => '$nick anlatıyor';
  static const guessedLabel = 'BU TURDA BİLİNEN';
  static const nextLabel = 'SIRADAKİ ANLATICI';
  static const lastLabel = 'Son tur';
  static const teamsLabel = 'Takımlar';
  static const settingsTitle = 'Oyun ayarları';
  static String timeLeft(int n) => '$n saniye kaldı';
  static const you = 'sen';
  static const narrating = 'anlatıyor';
  static const next = 'Sıradaki anlatıcı';
  static const startMine = 'Anlatmaya başla';
  static const startMineHint = 'Başlayınca kartı yalnızca sen ve rakip takım göreceksiniz.';
  static String startForThem(String nick) => '$nick yerine başlat';
  static const skipNarrator = 'Anlatıcıyı atla';
  static String waitNarrator(String nick) => '$nick turu başlatınca süre işlemeye başlayacak.';
  static const correct = 'Doğru';
  static String pass(int? left) => left == null ? 'Pas' : 'Pas ($left)';
  static const undo = 'Geri al';
  static const taboo = 'Tabu!';
  static const tabooHint = 'Anlatıcı yasaklı kelimelerden birini (ya da anlatılan kelimeyi) söylerse bas.';
  static String guess(String nick) => '$nick anlatıyor. Tahmin et!';
  static const guessHint = 'Kartı göremezsin; anlatıcıyı dinle ve cevabı yüksek sesle söyle.';
  static const spectator = 'Bu tur izliyorsun.';
  static const narratorNote = 'Takımın tahmin edince “Doğru”ya bas.';
  static const stats = <String, String>{'correct': 'Doğru', 'pass': 'Pas', 'taboo': 'Tabu'};
  static const flash = <String, String>{'correct': 'Doğru! +1', 'pass': 'Pas', 'taboo': 'TABU!'};
  static String lastTurn(String team, int pts) => '$team bu turda ${pts > 0 ? '+' : ''}$pts';
  static const noCards = 'Bu turda kart geçmedi.';
  static const seconds = 'sn';
}

abstract final class SPodium {
  static const title = 'OYUN BİTTİ';
  static String winner(String team) => '$team kazandı!';
  static const draw = 'Berabere!';
  static const won = 'kazandı!';
  static const back = 'Lobiye dönülüyor…';
}

/// strings.ts `howto`: Tabu oyun ekranında çizilmez (web PlayView'da da yok); eşlik için tutulur.
abstract final class SHowTo {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Takımlar', 'İki takım sırayla anlatır. Her turda anlatan takımdan bir kişi anlatıcı olur.'),
    ('Anlat', 'Anlatıcı kartı görür; yasaklı 5 kelimeyi ve kelimenin kendisini söylemeden takımına anlatır.'),
    ('Kontrol', 'Rakip takım da kartı görür. Yasaklı kelime söylenirse “Tabu!”ya basar.'),
    ('Puan', 'Her doğru +1 puan. Tabu cezası açıksa her tabu −1. Pas hakkı sınırlıdır.'),
  ];
}
