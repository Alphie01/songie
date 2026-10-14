// games/frequency/client/strings.ts ile birebir.
import 'dart:math' as math;

abstract final class S {
  static const name = 'Frekans';
  static const pitch = 'Bir ipucuyla takımını kadranda doğru noktaya getir';
  static const team = {'a': 'Yeşil takım', 'b': 'Mor takım'};
  static const teamShort = {'a': 'Yeşil', 'b': 'Mor'};
  static const ratings = ['Parazit', 'Cızırtılı yayın', 'Aynı kanaldasınız', 'Net yayın', 'Telepati'];
  static String ratingHint(int score, int rounds) => '$rounds turda $score ortak puan';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const mode = 'Nasıl oynanacak';
  static const modeTeams = 'Takımlı';
  static const modeTeamsHint = 'İki takım yarışır; rakip “sağda mı, solda mı” diye tahmin eder.';
  static const modeCoop = 'Birlikte';
  static const modeCoopHint = 'Herkes tek takım; turlar bitince ortak puanınıza göre derece alırsınız.';
  static const teams = 'Takımlar';
  static const teamsHint = 'Bir oyuncuya dokunarak takımını değiştir. Takımı seçilmeyenler başlarken dağıtılır.';
  static const needTwo = 'Her takımda en az 2 kişi olmalı.';
  static const unassigned = 'Takımsız';
  static const shuffle = 'Karıştır';
  static const shuffleLabel = 'Takımları karıştır';
  static const empty = 'Henüz kimse yok';
  static const targetScore = 'Kazanmak için puan';
  static const rounds = 'Tur sayısı';
  static const seconds = 'Kadran süresi';
  static const secondsHint = 'İpucu verildikten sonra takımın kadranı kilitlemek için süresi. Süre bitince kadran olduğu yerde kilitlenir.';
  static const untimed = 'Süresiz';
  static String sec(int n) => '$n sn';
  static const cardChoice = 'Medyum kartı seçsin';
  static const cardChoiceHint = 'Medyum iki spektrum kartından ipucu bulmaya daha uygun olanı seçer.';
  static const majorityLock = 'Kilit için çoğunluk';
  static const majorityLockHint = 'Kapalıyken takımdan biri kilitler; açıkken takımın yarıdan fazlası onaylamalı.';
  static const catchUp = 'Yetişme kuralı';
  static const catchUpHint = 'Tam isabet (4 puan) yapan takım hâlâ gerideyse bir tur daha oynar. Birlikte modunda +1 tur kazandırır.';
  static const friendCards = 'Arkadaş kartları';
  static const friendCardsHint = 'Oyuncuların eklediği spektrumlar desteye karışır.';
  static const on = 'Açık';
  static const off = 'Kapalı';
  static const addCard = 'Spektrum kartı ekle';
  static const addCardHint = 'Zıt iki kavram yaz. Eklediğin kartlar listelenmez; oyunda sürpriz olarak çıkar.';
  static const left = 'Sol uç (ör. Sessiz)';
  static const right = 'Sağ uç (ör. Gürültülü)';
  static const save = 'Kartı ekle';
  static const saving = 'Ekleniyor…';
  static String saved(String l, String r) => '“$l / $r” desteye eklendi.';
  static const failed = 'Kart eklenemedi. Biraz sonra yeniden dene.';
}

abstract final class SPlay {
  static const you = 'sen';
  static String round(int done, int? total) => total != null && total > 0 ? 'Tur ${math.min(done + 1, total)}/$total' : 'Tur ${done + 1}';
  static const youTag = ' (sen)';
  static String toWin(int n) => '$n puana ilk ulaşan kazanır';
  static const total = 'Ortak puan';
  static const psychic = 'medyum';
  static String psychicIs(String nick) => 'Medyum: $nick';
  static const left = 'Sol';
  static const right = 'Sağ';
  static const dialLabel = 'Kadran';
  static String dialValue(String left, String right, double v) => '$left ile $right arasında, yüzde ${v.round()}';
  // Seçim
  static const pickTitle = 'İpucu bulabileceğin kartı seç';
  static const pickHint = 'Hedef her iki kartta da aynı yerde. Seçtiğin kart herkese görünür.';
  static String pickWait(String nick) => '$nick spektrum kartını seçiyor.';
  // İpucu
  static const clueTitle = 'Hedef yeşil bölgede. Takımına bir ipucu ver.';
  static const clueHint = 'Bir kelime, bir isim, bir şey. Yazmak istemezsen sesli söyle ve düğmeye bas.';
  static const cluePlaceholder = 'İpucu (ör. Ilık süt)';
  static const clueSend = 'İpucunu verdim';
  static String clueWait(String nick) => '$nick ipucunu düşünüyor.';
  static const clueSpoken = 'Sesli söylendi';
  static const clueLabel = 'İpucu';
  static const targetHere = 'Hedef bu bölgede';
  static const dialPsychicBtn = 'Takımın kadranı çeviriyor…';
  // Kadran
  static const dialYou = 'İpucuna göre kadranı çevirin, sonra kilitleyin.';
  static const dialPsychic = 'Takımın kadranı çeviriyor. Yorum yapmak yok, yüzünü de belli etme.';
  static String dialOpp(String team) => '$team kadranı çeviriyor. Tartışmayı dinleyin; sıra size gelecek.';
  static const dialSpectator = 'Takım kadranı çeviriyor.';
  static const lock = 'Kadranı kilitle';
  static String approve(int n, int need) => 'Kilidi onayla ($n/$need)';
  static const unapprove = 'Onayımı geri al';
  static String approved(int n, int need) => 'Onayladın. ${need - n} onay daha gerekiyor; kadran oynarsa onaylar sıfırlanır.';
  static String movedBy(String nick) => 'Son çeviren: $nick';
  // Sağ-sol
  static const sideTitle = 'Hedef ibrenin solunda mı, sağında mı?';
  static const sideHint = 'Doğru bilirseniz 1 puan. Tam isabet olduysa sayılmaz.';
  static const sideLeft = 'Solunda';
  static const sideRight = 'Sağında';
  static String sideWait(String team) => '$team hedefin ibrenin solunda mı sağında mı olduğunu tahmin ediyor.';
  // Açıklama
  static String points(int n) => n == 0 ? 'Iska' : '+$n puan';
  static const bullseye = 'Tam isabet';
  static String sideRes(String team, String side, bool ok) => '$team “$side” dedi: ${ok ? '+1 puan' : 'olmadı'}.';
  static const noSide = 'Rakip tahmin yapmadı.';
  static String again(String team) => 'Yetişme kuralı: $team bir tur daha oynuyor.';
  static const againCoop = 'Tam isabet: bir tur daha kazandınız.';
  static String winner(String team) => '$team kazandı';
  static const coopDone = 'Turlar bitti';
  static const next = 'Sıradaki tura geç';
  static const toPodium = 'Sonuçlara geç';
  // Oda sahibi
  static const skip = 'Medyumu atla';
  static String skipHint(String nick) => '$nick bağlı değil. Atlarsan tur puansız iptal olur ve sıradaki medyum oynar.';
  static const offline = 'bağlı değil';
  static const history = 'Önceki turlar';
  static const seconds = 'sn';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static const draw = 'Berabere';
  static const won = 'kazandı!';
  static const back = 'Lobiye dönülüyor…';
}

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Kart ve hedef', 'Her turda sıradaki medyum iki zıt kavramlı bir kart ve kadranda gizli bir hedef görür. Hedefi yalnızca o bilir.'),
    ('İpucu', 'Medyum, hedefin iki uç arasındaki yerini anlatan tek bir ipucu verir. “Soğuk–Sıcak” kartında hedef ortanın biraz sağındaysa “Ilık çay” gibi.'),
    ('Kadran', 'Medyumun takımı tartışarak ibreyi çevirir ve kilitler. Takımlı modda rakip, hedefin ibrenin solunda mı sağında mı olduğunu tahmin eder.'),
    (
      'Puan',
      'Perde açılır: tam merkez 4, yanları 3, kenarlar 2 puan. Takımlı modda hedef puana ilk ulaşan kazanır; birlikte modunda toplam puan derecenizi belirler.',
    ),
  ];
}
