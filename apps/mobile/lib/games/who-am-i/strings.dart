// games/who-am-i/client/strings.ts ile birebir.

abstract final class S {
  static const name = 'Kimim Ben?';
  static const answers = <String, String>{'yes': 'Evet', 'no': 'Hayır', 'maybe': 'Belki', 'irrelevant': 'Alakasız'};
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const categories = 'Kimlikler nereden gelsin';
  static const categoriesHint = 'Herkese seçili kategorilerden rastgele bir kimlik düşer.';
  static const turnMode = 'Soru hakkı';
  static const classic = 'Hayır çıkana kadar';
  static const classicHint = 'Cevap “Evet”, “Belki” ya da “Alakasız” oldukça sormaya devam edersin.';
  static const three = 'Her turda 3 soru';
  static const threeHint = 'Cevaplar ne olursa olsun 3 sorudan sonra sıra geçer.';
  static const typed = 'Yazılı soru';
  static const typedHint = 'Soruyu sesli sormanın yanında yazabilirsin de; soru geçmişinde kalır.';
  static const verify = 'Tahmin kontrolü';
  static const auto = 'Otomatik';
  static const autoHint = 'Yazım farkları (ş/s, büyük harf, boşluk) ve takma adlar kabul edilir.';
  static const group = 'Grup onaylasın';
  static const groupHint = 'Diğerleri yazılan tahmini görüp “Doğru” ya da “Yanlış” der.';
  static const hints = 'Kişi başı ipucu';
  static String hintsHint(int n) => n == 0 ? 'İpucu yok.' : 'Sırayla kategori, baş harf, harf sayısı. Her ipucu 1 soru sayılır.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const add = 'Kendi kimliğini ekle';
  static const addHint = 'Eklediğin kimlik “Arkadaş kartları”na girer; kimseye listelenmez, sana da düşmez.';
  static const addName = 'Kimlik (ör. Bizim Hasan)';
  static const addAliases = 'Başka yazımlar, virgülle (ör. hasan, hasan abi)';
  static const save = 'Kimliği ekle';
  static const saving = 'Ekleniyor…';
  static String saved(String n) => '“$n” eklendi.';

  /// SettingsPanel.tsx içindeki sabit hata metni.
  static const saveFailed = 'Eklenemedi. Tekrar dene.';
}

abstract final class SPlay {
  static String turn(int n) => 'Tur $n';
  static const you = 'sen';
  static const yourCard = 'Senin kartın';
  static const unknown = '?';
  static const asking = 'soruyor';
  static String finished(int place) => '$place. bildi';
  static String questions(int n) => '$n soru';
  static const left = 'ayrıldı';
  static const offline = 'bağlantı yok';

  static const myTurn = 'Sıra sende';
  static String myTurnHint(String mode, int left) => mode == 'classic'
      ? 'Evet/hayır ile cevaplanacak bir soru sor. “Hayır” çıkana kadar sormaya devam edersin.'
      : 'Evet/hayır ile cevaplanacak bir soru sor. Bu turda $left soru hakkın kaldı.';
  static const questionPlaceholder = 'Sorunu yaz (isteğe bağlı)';
  static const askedAloud = 'Soruyu sordum';
  static const askTyped = 'Soruyu gönder';
  static const guessTitle = 'Kim olduğunu biliyor musun?';
  static const guessPlaceholder = 'Kimliğini yaz';
  static const guess = 'Tahmin et';
  static const guessHint = 'Yanlış tahmin sırayı geçirir.';
  static const passMine = 'Sırayı geçir';

  static String waitAsk(String nick) => '$nick sorusunu düşünüyor.';
  static String skip(String nick) => '$nick adlı oyuncuyu atla';
  static const voiceQuestion = 'Sesli soruyu dinle ve cevapla.';
  static String answerTitle(String nick) => '$nick soruyor';
  static const cardIs = 'kartı:';
  static String nextUp(String nick) => 'Sırada $nick';
  static const lastAnswer = 'Son cevap:';
  static const guessLabel = 'Kimliğini yaz';
  static const myQuestion = 'Sorun cevaplanıyor';
  static const myQuestionVoice = 'Sesli sorduğun soru';
  static String answered(int n, int total) => '$n/$total kişi cevapladı';
  static String voted(int n, int total) => '$n/$total kişi oyladı';
  static const closeNow = 'Gelen cevaplarla bitir';

  static String guessPendingMine(String text) => 'Tahminin: “$text”';
  static const guessPendingMineHint = 'Diğerleri doğru mu diye oyluyor.';
  static String guessPending(String nick) => '$nick tahmin etti';
  static const guessCard = 'Kartında yazan';
  static const correct = 'Doğru';
  static const wrong = 'Yanlış';
  static const closeVote = 'Oylamayı bitir';
  static String votes(int c, int w) => '$c doğru, $w yanlış';

  static const hintsTitle = 'İpuçların';
  static String hintButton(int left) => 'İpucu al ($left hak)';
  static const hintNote = 'İpucunu yalnızca sen görürsün; 1 soru sayılır.';

  static String done(int place) => 'Bildin, $place. sıradasın';
  static const doneHint = 'Diğerlerinin sorularını cevaplamaya devam et.';
  static const youAre = 'Sen';

  static const historyTitle = 'Soru geçmişi';
  static const historyEmpty = 'Henüz soru sorulmadı. İlk soru genelde “İnsan mıyım?” olur.';
  static const voice = 'Sesli soru';
  static String guessed(String text) => 'Tahmin: “$text”';
  static const skipped = 'Sırası atlandı';
  static const skippedHost = 'Oda sahibi sırasını atladı';
  static const byGroup = 'grup onayı';
  static const mine = 'Yalnızca benim';
  static const all = 'Herkes';

  static const progressTitle = 'Oyuncular';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static String winner(String nick) => '$nick kazandı!';
  static String asked(int n) => '$n soruda bildi';
  static const ranking = 'Sıralama';
  static const none = 'Kimse bilemedi';
  static String place(int n) => '$n.';
  static String questions(int n) => '$n soru';
  static const notFound = 'bilemedi';
  static const back = 'Lobiye dönülüyor…';
}

abstract final class SHowTo {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Kartın alnında', 'Herkesin alnında bir kimlik var. Başkalarınınkini görürsün, kendininkini göremezsin.'),
    ('Sorunu sor', 'Sıra sana gelince evet/hayır ile cevaplanacak bir soru sor: “İnsan mıyım?”, “Yaşıyor muyum?”'),
    ('Cevapla', 'Diğerleri Evet, Hayır, Belki ya da Alakasız der; çoğunluk geçerli olur. “Hayır” çıkınca sıra geçer.'),
    ('Tahmin et', 'Bildiğini düşündüğünde kimliğini yaz. Doğruysa bitirirsin, yanlışsa sıra geçer.'),
    ('Sıralama', 'Herkes bilince en az soruda bilen kazanır. Bilenler cevaplamaya devam eder.'),
  ];
}
