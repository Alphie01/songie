// games/red-flag/client/strings.ts ile birebir.
import 'dart:math' as math;

abstract final class S {
  static const name = 'Red Flag / Green Flag';
  static const vote = {'green': 'Green flag', 'red': 'Red flag', 'never': 'Asla olmaz'};
  static const voteShort = {'green': 'Green', 'red': 'Red', 'never': 'Asla'};

  /// Sınır testi kartlarında seçeneklerin adı.
  static const limitVote = {'green': 'Varım', 'red': 'Hayır', 'never': 'Sınırım'};
}

abstract final class SSettings {
  static const categories = 'Kategoriler';
  static const categoriesHint = '+18 kategoriler varsayılan olarak kapalıdır.';
  static String adultWarning(String names) => '$names açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const dealBreaker = 'Üçüncü seçenek';
  static const dealBreakerHint = 'Green ve red’in yanına “Asla olmaz” eklenir.';
  static const names = 'Kim ne dedi';
  static const open = 'Açık';
  static const anonymous = 'İsimsiz';
  static String namesHint(bool anon) => anon ? 'Yalnızca dağılım görünür. Kimin ne dediği kimseye gönderilmez.' : 'Açıklamada herkesin oyu adıyla görünür.';
  static const predict = 'Tahmin modu';
  static const predictHint = 'Oyuna ek olarak çoğunluğun ne diyeceğini tahmin et; tutarsa +1 puan.';
  static const seconds = 'Oy süresi';
  static String sec(int n) => n == 0 ? 'Süresiz' : '$n sn';
  static String secondsHint(int n) => n == 0 ? 'Herkes oy verince açılır.' : 'Süre bitince verilen oylar açılır.';
  static const discuss = 'Tartışma süresi';
  static String discussHint(int n) =>
      n == 0 ? 'Herkes hazır olunca ya da oda sahibi geçince devam edilir.' : 'Oylar açılınca $n sn tartışılır, sonra sıradaki durum gelir.';
  static const rounds = 'Durum sayısı';
  static const unlimited = 'Sınırsız';
  static String roundsHint(int n) => n == 0 ? 'Oda sahibi bitirene kadar sürer.' : '$n durumdan sonra özet gelir.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const add = 'Durum ekle';
  static const addHint = 'Eklediğin durum “Arkadaşların ekledikleri” kategorisine girer ve kimseye listelenmez.';
  static const addPlaceholder = 'Ör. Sevgilin doğum gününde sana spor salonu üyeliği hediye ediyor.';
  static const addSave = 'Durumu ekle';
  static const addSaving = 'Ekleniyor…';
  static const addSaved = 'Eklendi. Oyunda karşınıza çıkacak.';
  static const addFailed = 'Eklenemedi. Tekrar dene.';
}

abstract final class SPlay {
  static String round(int n, int? total) => total != null && total > 0 ? 'Durum ${math.min(n + 1, total)}/$total' : 'Durum ${n + 1}';
  static String roundDone(int n, int? total) => total != null && total > 0 ? 'Durum $n/$total' : 'Durum $n';
  static const you = 'sen';
  static const pick = 'Sen ne dersin?';
  static const pickHint = 'Bayrağını gizlice kaldır.';
  static const picked = 'Oyun gizli. Açılana kadar değiştirebilirsin.';
  static const guessTitle = 'Çoğunluk ne diyecek?';
  static const guessHint = 'Doğru tahmin +1 puan.';
  static const guessFirst = 'Önce kendi oyunu ver.';
  static String waiting(int done, int total) => '$done/$total kişi oy verdi';
  static const untimed = 'Süresiz';
  static const voters = 'Oyuncular';
  static const votedTag = 'verdi';
  static const thinkingTag = 'düşünüyor';
  static const readyTag = 'hazır';
  static const offline = 'bağlantı yok';
  static const revealNow = 'Oyları şimdi aç';
  static const skip = 'Durumu atla';
  static const hostTools = 'Oda sahibi';
  static const nobody = 'Kimse oy vermedi.';
  static String majority(String v) => 'Çoğunluk: $v';
  static const tie = 'Oylar bölündü';
  static const unanimous = 'Herkes aynı fikirde';
  static String yourVote(String v) => 'Sen: $v';
  static const guessHit = 'Tahminin tuttu, +1';
  static String guessMiss(String v) => 'Tahminin $v idi, tutmadı';
  static const noGuess = 'Tahmin vermedin';
  static const anonNote = 'İsimsiz mod: kimin ne dediği gönderilmez.';
  static const next = 'Sonraki durum';
  static String nextIn(int s) => 'Tartışın… $s';
  static const discussing = 'Tartışın…';
  static String secs(int n) => '$n sn';
  static const ready = 'Hazırım';
  static const readyDone = 'Hazırsın';
  static String readyCount(int n, int total) => '$n/$total kişi hazır. Herkes hazır olunca ya da oda sahibi geçince devam edilir.';
  static String readyCountTimed(int n, int total) => '$n/$total kişi hazır. Süre bitince, herkes hazır olunca ya da oda sahibi geçince devam edilir.';
  static const points = 'puan';
  static const scores = 'Tahmin puanı';
}

abstract final class SPodium {
  static const gameOver = 'Oyun bitti';
  static const title = 'Red flag toleransı';
  static String sub(int n) => '$n durum oylandı';
  static const mostGreen = 'En hoşgörülü';
  static const strictest = 'En katı';
  static const rebel = 'En aykırı';
  static String rebelNote(int n) => '$n kez azınlıkta kaldı';
  static String tolerance(int n) => '%$n green';
  static const profiles = 'Herkesin profili';
  static const mine = 'Senin profilin';
  static const anonNote = 'İsimsiz oynandığı için yalnızca kendi profilini görüyorsun.';
  static const divisive = 'En çok bölen durumlar';
  static const noDivisive = 'Bu oyunda herkes hep aynı fikirdeydi.';
  static const scores = 'Tahmin puanları';
  static const totals = 'Toplam oylar';
  static const back = 'Lobiye dönülüyor…';
}

/// Oyun ekranındaki "Nasıl oynanır" bölümü (`.rf-howto`).
abstract final class SHowTo {
  static const title = 'Nasıl oynanır';
  static const steps = [
    ('Durumu oku', 'Her turda bir durum çıkar: ilişki, iş, ev arkadaşı, aile ve daha fazlası.'),
    ('Gizlice oy ver', 'Green flag mi, red flag mi? Açıksa “Asla olmaz” da seçebilirsin. Kimse açılana kadar oyunu göremez.'),
    ('Çoğunluğu tahmin et', 'Tahmin modunda grubun çoğunluğunun ne diyeceğini de seç. Tutarsa +1 puan.'),
    ('Tartış', 'Oylar birlikte açılır. Dağılıma bakın, tartışın, hazır olunca sıradaki duruma geçin.'),
  ];
}
