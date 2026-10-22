// games/most-likely/client/strings.ts ile birebir.

abstract final class S {
  static const name = 'Aramızdaki En';
  static const prefix = 'Aramızdaki en';
  static const suffix = 'kim?';

  /// Unvan biçimi: "en geç kalan".
  static String title(String text) => 'en $text';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const categories = 'Soru kategorileri';
  static const categoriesHint = '+18 kategoriler varsayılan olarak kapalıdır.';
  static String adultWarning(String names) => '$names açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const seconds = 'Oy süresi';
  static String sec(int n) => n == 0 ? 'Süresiz' : '$n sn';
  static String secondsHint(int n) => n == 0 ? 'Herkes oy verince sonuçlar açılır.' : 'Süre bitince oy vermeyenler beklenmez.';
  static const rounds = 'Soru sayısı';
  static const unlimited = 'Sınırsız';
  static String roundsHint(int n) => n == 0 ? 'Oda sahibi bitirene kadar sürer.' : '$n sorudan sonra oyun biter.';
  static const selfVote = 'Kendine oy';
  static const selfVoteHint = 'Açıkken oyuncular kendini de seçebilir.';
  static const anonymous = 'İsimsiz oylar';
  static String anonymousHint(bool on) =>
      on ? 'Kimin kime oy verdiği kimseye gösterilmez, yalnızca sayılar açılır.' : 'Sonuçlarda kimin kime oy verdiği görünür.';
  static const predict = 'Tahmin modu';
  static const predictHint = 'Oy verirken kimin kazanacağını da tahmin et. Doğru tahmin 1 puan.';
  static const allowed = 'Serbest';
  static const notAllowed = 'Yasak';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const addPrompt = 'Soru ekle';
  static const addPromptHint = 'Eklediğin soru “Arkadaş soruları” kategorisine girer.';
  static const promptPlaceholder = 'ör. çok geç cevap veren';
  static const promptLabel = 'Sorunun boşluğu';
  static const save = 'Soruyu ekle';
  static const saving = 'Ekleniyor…';
  static String saved(String t) => '“Aramızdaki en $t kim?” eklendi.';
  static const saveFailed = 'Soru eklenemedi. Bağlantını kontrol edip tekrar dene.';
}

abstract final class SPlay {
  static String round(int n, int? total) => total != null && total > 0 ? 'Soru $n/$total' : 'Soru $n';
  static const you = 'sen';
  static String tapToVote(bool self) => self
      ? 'Bir oyuncuya dokunarak oy ver; kendine de verebilirsin! Sonuçlar açılana kadar değiştirebilirsin.'
      : 'Bir oyuncuya dokunarak oy ver. Sonuçlar açılana kadar değiştirebilirsin.';
  static const tapToGuess = 'Sence kim kazanacak? Bir oyuncuya dokun.';
  static const modeVote = 'Oyum';
  static const modeGuess = 'Tahminim';
  static const noSelf = 'Kendine oy veremezsin';
  static const myVote = 'Oyun';
  static const myGuess = 'Tahminin';
  static const voted = 'oy verdi';
  static String timeLeft(int n) => '$n saniye kaldı';
  static String progress(int done, int total) => '$done/$total kişi oy verdi';
  static const waiting = 'Beklenenler';
  static const offline = 'bağlantı yok';
  static const skip = 'Soruyu atla';
  static const revealNow = 'Sonuçları şimdi aç';
  static const secondsLeft = 'sn';
  static const untimed = 'Herkes oy verince sonuçlar açılır.';
  static const anonymousNote = 'Oylar isimsiz. Kime verdiğini kimse görmeyecek.';
  static const openNote = 'Oylar açık. Sonuçlarda kimin kime verdiği görünecek.';
  // Açıklama
  static const winnerOne = 'Unvan sahibi';
  static String winnerLine(String title, int votes) => '$title · $votes oy';
  static const winnerTie = 'Beraberlik, unvan paylaşıldı';
  static const noVotes = 'Kimse oy vermedi, bu unvan boşta kaldı.';
  static String votes(int n) => '$n oy';
  static const votedBy = 'Oy verenler';
  static String correctGuess(String names) => 'Doğru tahmin edenler: $names';
  static const nobodyGuessed = 'Kimse doğru tahmin etmedi.';
  static const next = 'Sıradaki soru';
  static const finish = 'Sonuçları gör';
  static const waitHost = 'Oda sahibi sıradaki soruya geçecek.';
}

abstract final class SSide {
  static const players = 'Oyuncular';
  static String titles(int n) => n == 0 ? 'unvan yok' : '$n unvan';
  static String guessPts(int n) => '$n tahmin';
  static const history = 'Unvan geçmişi';
  static const settings = 'Oyun ayarları';
  static const settingsNote = 'Değişiklikler sıradaki sorudan itibaren geçerli.';
  static const historyEmpty = 'Henüz unvan dağıtılmadı. İlk sonuçlar açılınca burada görünecek.';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static String winner(String names) => '$names kazandı!';
  static const titlesLabel = 'Unvanlar';
  static String titleCount(int n) => '$n unvan';
  static String king(int n) => '$n unvanla birinci';
  static const nobody = 'Bu oyunda unvan dağıtılmadı';
  static const noTitles = 'Unvan yok';
  static String guess(int n) => '$n doğru tahmin';
  static const back = 'Lobiye dönülüyor…';
}
