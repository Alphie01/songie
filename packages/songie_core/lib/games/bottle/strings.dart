// games/bottle/client/strings.ts ile birebir.
import 'dart:math' as math;

abstract final class S {
  static const name = 'Şişe Çevirmece';

  /// `s.kind`
  static String kind(String k) => k == 'dare' ? 'Cesaret' : 'Doğruluk';
}

abstract final class SSettings {
  static const categories = 'Kategoriler';
  static const categoriesHint =
      '+18 kategoriler açık cinsel içerik içerir; yalnızca yetişkinler içindir. Cesaret görevlerinde dokunma yalnızca karşıdaki kabul ederse.';
  static const coupleHint = 'Çift odası: partnerinle ikiniz için. Görevler yalnızca partnerler arasında; pas hakkı her zaman var, durmak isteyen durdurur.';
  static String truthDare(int t, int d) => '$t doğruluk, $d cesaret';
  static const choice = 'Doğruluk mu cesaret mi';
  static const choicePlayer = 'Oyuncu seçer';
  static const choiceRandom = 'Rastgele';
  static const passes = 'Pas hakkı (kişi başı)';
  static const unlimited = 'Sınırsız';
  static const passPenalty = 'Pas cezası';
  static const passPenaltyHint = 'Açıksa pas geçen 1 puan kaybeder.';
  static const vote = '“Yaptı mı?” oylaması';
  static const voteHint = 'Açıksa “Yaptım” diyene diğerleri oy verir; çoğunluk hayır derse puan yok.';
  static const order = 'Sıradaki çeviren';
  static const orderTarget = 'Şişenin gösterdiği';
  static const orderRound = 'Masada sırayla';
  static const rounds = 'Çevirme sayısı';
  static String roundsHint(int n) => n == 0 ? 'Oda sahibi bitirene kadar sürer.' : 'Şişe $n kez çevrilince oyun biter.';
  static const fair = 'Adil şişe';
  static const fairHint = 'Son iki çevirmede seçilenlere şişenin yeniden gelme olasılığı azalır.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const add = 'Soru ya da görev ekle';
  static const addHint = 'Eklediğin metin “Oyuncuların ekledikleri” kategorisine girer ve herkesin oyunlarında çıkabilir.';
  static String addPlaceholder(String kind) => kind == 'dare' ? 'Ör. En sevdiğin şarkının nakaratını söyle.' : 'Ör. Bu odada en çok kime güvenirsin?';
  static const save = 'Ekle';
  static const saving = 'Ekleniyor…';
  static const saved = 'Eklendi. Bir sonraki çekilişlerde çıkabilir.';

  /// AddPrompt.tsx'teki yedek hata metni.
  static const failed = 'Eklenemedi. Tekrar dene.';
}

abstract final class SPlay {
  static String round(int n, int? total) => total != null && total > 0 ? 'Çevirme ${math.min(n + 1, total)}/$total' : 'Çevirme ${n + 1}';
  static const you = 'sen';
  static const yourTurn = 'Sıra sende';
  static String spunBy(String prev, bool prevIsMe, bool mine, String next) =>
      '${prevIsMe ? 'Şişeyi sen çevirdin' : 'Şişeyi $prev çevirdi'}, ${mine ? 'sıra sende' : 'şimdi $next çevirecek'}';
  static const spin = 'Şişeyi çevir';
  static const spinHint = 'Şişe kimi gösterirse o seçecek.';
  static String waitSpinner(String nick) => 'Şişeyi $nick çevirecek.';
  static String spinFor(String nick) => '$nick yerine çevir';
  static const skipSpinner = 'Sırayı atla';
  static String offline(String nick) => '$nick bağlı değil. Sırayı atlayabilir ya da onun yerine çevirebilirsin.';
  static const spinning = 'Şişe dönüyor…';
  static String pointed(String nick) => 'Şişe durdu: $nick';
  static const pointedYou = 'Şişe seni gösterdi';
  static const chooseHint = 'Seç: dürüstçe cevapla ya da görevi yap.';
  static String choosing(String nick) => '$nick seçiyor: doğruluk mu, cesaret mi?';
  static String done(String kind) => kind == 'dare' ? 'Yaptım' : 'Cevapladım';
  static const pass = 'Pas';
  static String passLeft(int? left) => left == null ? 'sınırsız' : '$left hak';
  static const noPass = 'Pas hakkın kalmadı';
  static const passCost = 'Pas geçersen 1 puan kaybedersin.';
  static String doing(String kind, String nick) => kind == 'dare' ? '$nick görevi yapıyor' : '$nick cevaplıyor';
  static String voteTitle(String kind) => kind == 'dare' ? 'Görevi yaptı mı?' : 'Dürüstçe cevapladı mı?';
  static const yes = 'Evet';
  static const no = 'Hayır';
  static const voteWait = 'Diğerleri oyluyor…';
  static String voted(int n, int total) => '$n/$total oy';
  static const skipTurn = 'Turu puansız geç';
  static String targetOffline(String nick) => '$nick bağlı değil.';
  static String last(String outcome, String nick) => switch (outcome) {
    'pass' => '$nick pas geçti',
    'failed' => 'Masa $nick için “yapmadı” dedi',
    'skipped' => '$nick için tur geçildi',
    _ => '$nick +1 puan aldı',
  };
  static String votes(int yes, int no) => '$yes evet, $no hayır';
  static const scores = 'Skorlar';
  static const settings = 'Oyun ayarları';
  static String points(int n) => '$n puan';
  static String doneCount(int n) => '$n tamam';
  static String seconds(int n) => '$n sn';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static String winner(String nick) => '$nick kazandı!';
  static const tie = 'Berabere';
  static const back = 'Lobiye dönülüyor…';
  static const saved = 'Skorlar kaydedildi';
  static String done(int n) => '$n tamam';
}

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Çevir', 'Sırası gelen “Şişeyi çevir”e basar. Şişe herkesin ekranında aynı anda döner ve aynı kişide durur.'),
    ('Seç', 'Şişenin gösterdiği kişi doğruluk ya da cesaret seçer. Soru ya da görev herkese görünür.'),
    ('Yap', 'Dürüstçe cevapla ya da görevi yap, sonra “Yaptım” de. Oylama açıksa masa karar verir.'),
    ('Puan', 'Tamamlanan her soru ve görev 1 puan. Pas hakkı sınırlıdır; ceza açıksa pas 1 puan götürür.'),
  ];
}
