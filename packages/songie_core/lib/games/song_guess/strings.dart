// games/song-guess/client/strings.ts ile birebir.
import '../../shared/text.dart';

abstract final class S {
  static const name = 'Şarkıyı Bil';

  static const categories = <String, String>{
    'turkce': 'Türkçe',
    'global': 'Global',
    'tur': 'Türler',
    'donem': 'Dönemler',
    'ulke': 'Ülke listeleri',
    'ozel': 'Eklediğin listeler',
  };

  static const difficulty = <String, String>{
    'easy': 'Kolay',
    'medium': 'Orta',
    'hard': 'Zor',
    'expert': 'Uzman',
    'impossible': 'İmkânsız',
  };

  static const difficultyHint = <String, String>{
    'easy': 'Listelerin en çok dinlenen şarkıları',
    'medium': 'Bilinen şarkılar ağırlıkta',
    'hard': 'Orta popülerlikte şarkılar',
    'expert': 'Daha az dinlenmiş şarkılar',
    'impossible': 'Listelerin en az bilinenleri',
  };
}

abstract final class SSettings {
  static const pools = 'Liste';
  static const poolsLoading = 'Listeler hazırlanıyor. İlk açılışta bir dakika sürebilir.';
  static const openCatalog = 'Liste ekle / çıkar';
  static const closeCatalog = 'Kapat';
  static const addPool = 'Deezer ya da Spotify playlist linki';
  static String removeMine(String name) => '$name listesini listelerimden çıkar';
  static const mineHint = 'Eklediğin listeler yalnızca sana görünür.';
  static const addPoolPlaceholder = 'open.spotify.com/playlist/…';
  static const addingSpotify = 'Spotify listesi Deezer’da eşleştiriliyor…';
  static String addedSpotify(String name, int n, int total) => '$name eklendi ve seçildi: $total şarkının $n tanesi bulundu.';
  static const addPoolButton = 'Ekle';
  static const adding = 'Ekleniyor…';
  static String added(String name, int n) => '$name eklendi ve seçildi ($n şarkı).';
  static const difficulty = 'Zorluk';
  static const rounds = 'Tur sayısı';
  static const unlimited = 'Sınırsız';
  static const unlimitedHint = 'Oda sahibi bitirene kadar şarkı şarkı devam eder.';
  static const timer = 'Süre';
  static const timerOff = 'Süresiz';
  static String timerSec(int n) => '$n sn';
  static const timerHintOff = 'Bilmeyen herkes pas deyince ya da yanlış tahmin edince sonraki parça açılır.';
  static String timerHintOn(int n) => 'Her parça için $n saniye. Herkes pas derse daha erken açılır.';
  static const playback = 'Oynatma';
  static const startRandom = 'Rastgele bir yerden';
  static const startBeginning = 'Önizlemenin başından';
  static const search = 'Arama';
  static const easySearch = 'Kolay arama';
  static const easySearchHint = 'Öneriler yalnızca seçili listelerden gelir.';
  static const guessAfter = 'Tahmin şuradan başlasın';
  static const artist = 'Sanatçıyı bilene puan';
  static const artistHint = 'Sadece sanatçıyı bilen puanın %30’unu alır, şarkıyı aramaya devam eder.';
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const liveHint = 'Değişiklikler sıradaki şarkıdan itibaren geçerli olur.';
  static const options = 'Seçenekler';
  static const volume = 'Ses';
  static const on = 'Açık';
  static const off = 'Kapalı';

  /// SettingsPanel.tsx: seçili listedeki çıkarma düğmesinin başlığı.
  static const removePool = 'Listeyi çıkar';

  /// SettingsPanel.tsx: liste eklenemediğinde (sunucu metni yoksa).
  static const addFailed = 'Eklenemedi.';
}

abstract final class SPlay {
  static String round(int r, int? total) => total != null && total != 0 ? 'Tur $r/$total' : 'Şarkı $r';
  static const countdown = 'Hazır ol';
  static String playLabel(String clip) => '$clip klibi çal';
  static const stopLabel = 'Durdur';
  static const tapToListen = 'Dinlemek için dokun';
  static String stageHint(double seconds) => 'Sadece ${trDecimal(seconds)} saniye! Kulağını aç.';
  static const scoreYou = 'Sen';
  static const searchPlaceholder = 'Şarkıyı bul';
  static const guessLabel = 'Tahminin';
  static const noHits = 'Sonuç yok. Başka bir yazımla dene.';
  static const searching = 'Aranıyor…';
  static const skip = 'Pas';
  static const giveUp = 'Pes et';
  static const advance = 'Sonraki parçayı herkese aç';
  static const replayHint = 'Beklerken açılmış parçalara çubuktan dokunup tekrar dinleyebilirsin.';
  static String waiting(int n) => n == 1 ? '1 kişi bekleniyor' : '$n kişi bekleniyor';
  static const states = <String, String>{
    'locked': 'Yanlış. Diğerleri pas deyince sonraki parça açılır.',
    'skipped': 'Pas geçtin. Diğerleri bekleniyor.',
    'correct': 'Bildin! Diğerleri bekleniyor.',
    'artist': 'Sanatçı doğru, şimdi şarkının adını bul.',
    'listening': '',
  };
  static String verdictWrong(String t) => '$t değil.';
  static String verdictArtist(String t) => 'Sanatçı doğru, ama $t değil.';
  static const verdictCorrect = 'Doğru!';
  static const loading = 'Sıradaki şarkı hazırlanıyor…';
  static const streak = 'Seri';
  static const best = 'En iyi';
  static const scores = 'Skor';

  /// ProgressBar.tsx etiketleri.
  static String openClip(String clip) => 'Açık klip: $clip';
  static String playPart(String clip) => '$clip parçasını çal';
}

abstract final class SReveal {
  static const itWas = 'Şarkı buydu';
  static String fromPool(String name) => 'Liste: $name';
  static const won = 'Bildin!';
  static const lost = 'Bilemedin';
  static const nobody = 'Bu turda kimse bilemedi.';
  static String atStage(String clip) => '$clip’de';
  static const artistOnly = 'sanatçıyı bildi';
  static const listen = 'Deezer’da dinle';
  static const replay = 'Önizlemeyi çal';
  static const stop = 'Durdur';
  static const next = 'Sonraki şarkı';
  static const finish = 'Sonuçları gör';
  static String waitingOthers(int ready, int total) => '$ready/$total kişi hazır';
  static const skipWait = 'Beklemeden geç';
  static String autoNext(int n) => '$n sn içinde sıradaki şarkı';
}

abstract final class SFeed {
  static const title = 'Canlı akış';
  static const you = 'Sen';
  static String text(String kind, String clip, [String? extra]) => switch (kind) {
    'correct' => '$clip’de bildi',
    'artist' => '$clip’de sanatçıyı bildi',
    'wrong' => 'yanlış tahmin etti',
    'skip' => 'pas geçti',
    'settings' => 'listeyi değiştirdi: ${extra ?? ''}. Sıradaki şarkıdan itibaren geçerli.',
    _ => '',
  };
}

abstract final class SHowTo {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Dinle', 'Şarkı 0,1 saniyelik bir parçayla başlar. Çal butonuyla parçayı istediğin kadar tekrar dinle.'),
    ('Tahmin et', 'Şarkının ya da sanatçının adını yaz, önerilerden doğru şarkıyı seç. Her parçada bir tahmin hakkın var.'),
    ('Pas geç ya da bekle', 'Bilmeyen herkes pas deyince ya da yanlış tahmin edince sonraki, daha uzun parça herkese açılır: 0,5 sn, 2 sn, 8 sn, 15 sn.'),
    ('Puanı topla', 'Ne kadar kısa parçada ve ne kadar hızlı bilirsen o kadar çok puan alırsın. Art arda bildiklerin serini büyütür.'),
  ];
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static String winner(String nick) => '$nick kazandı!';
  static const draw = 'Berabere!';
  static String points(int n) => '${trNumber(n)} puan';
  static String streak(int n) => 'En uzun seri: $n';
  static const back = 'Lobiye dönülüyor…';
}

/// `toLocaleString('tr-TR')` (ondalıklı): 0.1 → "0,1", 1500 → "1.500".
String trDecimal(num n) {
  if (n == n.roundToDouble()) return trNumber(n);
  final fixed = n.abs().toStringAsFixed(3).replaceFirst(RegExp(r'0+$'), '');
  final parts = fixed.split('.');
  return '${n < 0 ? '-' : ''}${trNumber(int.parse(parts[0]))},${parts[1]}';
}

/// JS'deki `${n}`: 2 → "2", 0.1 → "0.1".
String jsNumber(num n) => n == n.roundToDouble() ? n.toInt().toString() : n.toString();

/// 0.1 → "0,1 sn"
String clipLabel(double seconds) => '${trDecimal(seconds)} sn';

/// Songspot'taki gibi kısa etiket: 0.1 → "0.1s"
String clipShort(double seconds) => '${jsNumber(seconds)}s';
