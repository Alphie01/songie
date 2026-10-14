// games/never/client/strings.ts ile birebir.

abstract final class S {
  static const name = 'Ben Hiç';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const categories = 'Kategoriler';
  static const categoriesHint = '+18 kategoriler varsayılan olarak kapalıdır.';
  static const adultHint = '+18 kategoriler açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const coupleHint = 'Çift odası: partnerinle ikiniz için. Pas hakkı her zaman var; durmak isteyen durdurur.';
  static const lives = 'Can (parmak)';
  static String livesHint(int n) =>
      n == 0 ? 'Kimse elenmez; oyun tur sayısıyla ya da oda sahibi bitirince biter.' : '“Yaptım” diyen 1 can kaybeder. $n canı biten elenir ama izlemeye devam eder.';
  static const off = 'Kapalı';
  static const on = 'Açık';
  static const anonymous = 'İsimsiz açıklama';
  static const anonymousHint = 'Açıkken yalnızca kaç kişinin yaptığı gösterilir, kim olduğu gösterilmez. Can sistemi kapanır.';
  static const seconds = 'Cevap süresi';
  static String secondsOpt(int n) => n == 0 ? 'Süresiz' : '$n sn';
  static String secondsHint(int n) => n == 0 ? 'Herkes cevaplayınca açılır.' : 'Herkes cevaplayınca ya da süre bitince açılır.';
  static const rounds = 'Tur sayısı';
  static String roundsOpt(int n) => n == 0 ? 'Sınırsız' : '$n';
  static const unlimitedHint = 'Oda sahibi bitirene kadar sürer.';
  static const addTitle = 'Cümle ekle';
  static const addHint = 'Eklediğin cümle “Arkadaş cümleleri” kategorisine girer.';
  static const addOpen = 'Kendi cümleni yaz';
  static const prefix = 'Ben hiç';
  static const placeholder = 'sınavda kopya çekmedim';
  static const save = 'Cümleyi ekle';
  static const saving = 'Ekleniyor…';
  static String saved(String t) => 'Eklendi: $t';
  static const saveFailed = 'Eklenemedi. Bağlantını kontrol edip tekrar dene.';
}

abstract final class SPlay {
  static String round(int n, int? total) => total != null && total > 0 ? 'Ben Hiç · Tur $n/$total' : 'Ben Hiç · Tur $n';
  static const lead = 'Ben hiç…';
  static String secs(int n) => '$n sn';
  static const noAnswer = 'Sen cevap vermedin';
  static String doerLives(int n) => '$n parmak';
  static String storyteller(String nick) => '$nick, hikâyeyi anlatma sırası sende!';
  static const did = 'Yaptım';
  static const didNot = 'Yapmadım';
  static const answeredNote = 'Cevabın gizli. Açılana kadar fikrini değiştirebilirsin.';
  static const askNote = 'Cevabını kimse görmez; herkes cevaplayınca açılır.';
  static const eliminatedNote = 'Canın bitti. Oyunu izlemeye devam ediyorsun.';
  static const lateNote = 'Sıradaki cümlede sen de cevaplayabilirsin.';
  static String waiting(int n, int total) => '$n/$total kişi cevapladı';
  static String skip(int votes, int needed) => votes > 0 ? 'Bu cümleyi atla ($votes/$needed)' : 'Bu cümleyi atla';
  static String skipUndo(int votes, int needed) => 'Atlama oyumu geri al ($votes/$needed)';
  static const revealNow = 'Cevapları şimdi aç';
  static const nextStatement = 'Başka cümle getir';
  static const next = 'Sıradaki cümle';
  static const toResults = 'Sonuçları gör';
  static const waitHost = 'Oda sahibi sıradaki cümleye geçecek.';
  static const finalNote = 'Son tur bitti. Sonuçlar birazdan açılıyor.';
  static const nobody = 'Kimse yapmamış. Temiz bir grup.';
  static const everyone = 'Herkes yapmış.';
  static String didCount(int n, int total) => '$total kişiden $n kişi yaptı';
  static const noAnswers = 'Kimse cevap vermedi.';
  static String unanswered(int n) => '$n kişi cevap vermedi';
  static String eliminated(String names) => '$names elendi';
  static const you = 'sen';
  static const answered = 'cevapladı';
  static const waitingTag = 'düşünüyor';
  static const eliminatedTag = 'elendi';
  static String yourAnswer(String a) => a == 'did' ? 'Sen: yaptım' : 'Sen: yapmadım';
  static const players = 'Oyuncular';
  static String leader(String nick, int n) => 'Şu ana kadar en çok yapan: $nick ($n kez)';
  static const history = 'Tur geçmişi';
  static const historyEmpty = 'İlk cümle açılınca burada görünecek.';
  static String lives(int n) => '$n parmak kaldı';
  static const more = 'Tur geçmişi ve ayarlar';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static String winner(String names) => '$names ayakta kaldı';
  static const noneLeft = 'Kimse ayakta kalmadı';
  static String mostDid(String nick) => 'En çok yapan: $nick';
  static String cleanest(String nick) => 'En masum: $nick';
  static String summary(int rounds) => '$rounds cümle açıldı';
  static const anonymousNote = 'İsimsiz oynadınız; kişi başı sayılar gösterilmez.';
  static String me(int did, int didNot) => 'Sen $did kez yaptım, $didNot kez yapmadım dedin.';
  static const hottest = 'En çok yapılan';
  static String hottestCount(int n, int total) => '$total kişiden $n kişi';
  static const did = 'Yaptım';
  static const didNot = 'Yapmadım';
  static const lives = 'Can';
  static const back = 'Lobiye dönülüyor…';
  static const gameOver = 'Oyun bitti';
  static const livesLeft = 'parmak kaldı';
  static const timesDid = 'kez yaptı';
  static const mostDidCaption = 'En çok yapan';
  static const cleanestCaption = 'En masum';
  static String timesShort(int n) => '$n kez';
}
