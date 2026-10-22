// games/confessions/client/strings.ts ile birebir (TSX içinde sabit yazılmış birkaç metin de burada).

abstract final class S {
  static const name = 'Gizli İtiraflar';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const mode = 'Ne itiraf edilsin';
  static const modeTopics = 'Her tur bir konu';
  static const modeFree = 'Serbest itiraf';
  static const modeHint = {'topics': 'Her tur herkes aynı konuda yazar.', 'free': 'Konu yok; aklına gelen herhangi bir itirafı yaz.'};
  static const categories = 'Konu kategorileri';
  static const cesurHint = '+18 kategoriler açık cinsel içerik içerir; yalnızca yetişkinler içindir.';
  static const coupleHint = 'Çift odası: partnerinle ikiniz için. Konular partnerinle ilgili; pas hakkı her zaman var, durmak isteyen durdurur.';
  static const write = 'Yazma süresi';
  static const guess = 'Tahmin süresi';
  static const rounds = 'Tur sayısı';
  static const unlimited = 'Sınırsız';
  static const untimed = 'Süresiz';
  static String sec(int n) => '$n sn';
  static String roundsHint(int n) => n == 0 ? 'Oda sahibi “Oyunu bitir” diyene kadar sürer.' : '$n tur sonra podyum.';
  static const hidden = 'Yazar açıklanmasın';
  static const hiddenHint = 'Tamamen anonim: kimin yazdığı hiç söylenmez, yalnızca tahmin dağılımı görünür. Kimse puan almaz.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const addPrompt = 'Konu ekle';
  static const addPromptHint = 'Eklediğin konu “Arkadaş konuları” kategorisine girer ve sonraki oyunlarda çıkabilir.';
  static const promptPlaceholder = 'Örneğin: Kimseye söylemediğin bir hayalin';
  static const save = 'Konuyu ekle';
  static const saving = 'Ekleniyor…';
  static const saved = 'Konu eklendi.';

  /// SettingsPanel.tsx içinde sabit.
  static const saveFailed = 'Konu eklenemedi. Tekrar dene.';
}

abstract final class SPlay {
  static String round(int n, int? total) => total != null && total > 0 ? 'Tur $n/$total' : 'Tur $n';
  static const writePhase = 'Yaz';
  static const topicLabel = 'Bu turun konusu';
  static String secs(int n) => '$n sn';
  static const you = 'sen';
  static const me = 'Bu benim';
  static const freeTopic = 'Serbest itiraf';
  static const freeTopicHint = 'Aklına gelen, kimsenin bilmediği bir şey yaz.';
  static const untimed = 'Süresiz';
  static const placeholder = 'İtirafını yaz. İsmin görünmeyecek.';
  static const send = 'İtirafı gönder';
  static const update = 'İtirafı güncelle';
  static const sent = 'İtirafın gönderildi. Süre bitene kadar değiştirebilirsin.';
  static const privacy = 'Kimin yazdığını açıklamaya kadar yalnızca sen bilirsin.';
  static const privacyHidden = 'Bu turda yazarlar hiç açıklanmayacak.';
  static const wroteTitle = 'Yazanlar';
  static const wrote = 'yazdı';
  static const waiting = 'yazıyor';
  static const closeWriting = 'Yazmayı bitir';
  static const closeWritingHint = 'Yazanların itiraflarıyla tahmine geçilir.';
  static String confessionOf(int i, int n) => 'İtiraf $i/$n';
  static const whoWrote = 'Sence kim yazdı?';
  static const whoWroteHint = 'Herkes bir seçim yapar, yazan dahil. Kendi itirafınsa da birini seç; seçimin sayılmaz ve kimse anlamaz.';
  static const whoWroteHidden = 'Yazar açıklanmayacak; yalnızca kimin kaç oy aldığı görünecek.';
  static String picked(int n, int total) => '$n/$total kişi seçti';
  static String myPick(String nick, int n, int total) => 'Seçimin: $nick. $n/$total kişi seçti.';
  static const changePick = 'Süre bitene kadar değiştirebilirsin.';
  static String author(String nick) => 'Yazan: $nick';
  static const gotIt = 'Bildin!';
  static const missed = 'Bilemedin.';
  static const hiddenText = 'Bu itiraf oda sahibi tarafından gizlendi.';
  static const hide = 'İtirafı gizle';
  static const closeGuess = 'Tahmini bitir';
  static const next = 'Sıradaki itiraf';
  static const nextRound = 'Sonraki tura geç';
  static const finish = 'Podyuma geç';
  static const revealTitle = 'Yazan';
  static const revealHidden = 'Yazar gizli kalıyor';
  static const nobodyRight = 'Kimse bilemedi.';
  static String rightList(String names) => 'Bilenler: $names';
  static String fooled(String nick, int n) => n > 0 ? '$nick, $n kişiyi yanılttı.' : '$nick kimseyi yanıltamadı.';
  static String fooledMe(int n) => n > 0 ? 'Sen $n kişiyi yanılttın.' : 'Kimseyi yanıltamadın.';
  static const tally = 'Kime kaç oy';
  static String votes(int n) => '$n oy';
  static const reactions = {'yok': 'Yok artık', 'bende': 'Ben de!', 'efsane': 'Efsane', 'olamaz': 'Olamaz'};
  static String summaryTitle(int n) => 'Tur $n bitti';
  static const summaryEmpty = 'Bu turda kimse itiraf yazmadı.';
  static const summaryNext = 'Sonraki tur birazdan başlıyor.';
  static const summaryLast = 'Podyum birazdan.';
  static String by(String nick) => '$nick yazdı';
  static const anonymous = 'Anonim';
  static const scores = 'Puanlar';
  static String pts(int n) => '$n puan';
  static String detail(int c, int f) => '$c doğru, $f yanıltma';

  /// PlayView.tsx içinde sabit.
  static const youCapital = 'Sen';
  static const meSuffix = ' (sen)';
  static const reactionsLabel = 'Tepkiler';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static String winner(String nick) => '$nick kazandı!';
  static const draw = 'Berabere';
  static const anonymous = 'Sırlar sırrınız olarak kaldı';
  static const detective = 'En iyi dedektif';
  static const trickster = 'En iyi yanıltıcı';
  static const none = 'Henüz kimse';
  static String detectiveValue(int n) => '$n doğru tahmin';
  static String tricksterValue(int n) => '$n kişiyi yanılttı';
  static String confessions(int n) => 'Bu oyunda $n itiraf yazıldı.';
  static const back = 'Lobiye dönülüyor…';
}

/// Oyun ekranındaki "Nasıl oynanır" bölümü (`.cf-howto`).
abstract final class SHowTo {
  static const title = 'Nasıl oynanır';
  static const steps = [
    ('Yaz', 'Her tur bir konu çıkar. Herkes isimsiz bir itiraf yazar; kimin yazdığını yalnızca yazan bilir.'),
    ('Tahmin et', 'İtiraflar karışık sırayla tek tek gelir. Herkes kimin yazdığını seçer. Kendi itirafındaysan da birini seç; seçimin sayılmaz.'),
    ('Açıklama', 'Herkes seçince ya da süre bitince yazan açıklanır. Doğru bilen 1 puan, yazan da yanılttığı her kişi için 1 puan alır.'),
    ('Tepki ver', '“Yok artık”, “Ben de!” gibi tepkiler isimsizdir. Oda sahibi uygunsuz bir itirafı gizleyebilir.'),
  ];
}
