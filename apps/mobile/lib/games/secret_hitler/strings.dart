// games/secret-hitler/client/strings.ts ile birebir (günlük metni PlayView.tsx `logText`).
import '../../shared/text.dart';
import 'models.dart';

abstract final class S {
  static const name = 'Secret Hitler';
  static const pitch = 'Liberaller ve faşistler; gizli Hitler’i bul ya da şansölye yap';
}

const roleNames = <String, String>{'liberal': 'Liberal', 'fascist': 'Faşist', 'hitler': 'Hitler'};
const partyNames = <String, String>{'liberal': 'Liberal', 'fascist': 'Faşist'};
const policyNames = <String, String>{'liberal': 'Liberal', 'fascist': 'Faşist'};

const powerNames = <String, String>{
  'peek': 'Politika önizleme',
  'investigate': 'Sadakat sorgulama',
  'specialElection': 'Özel seçim',
  'execution': 'İdam',
};

const powerHints = <String, String>{
  'peek': 'Başkan destenin üstündeki 3 kartı görür.',
  'investigate': 'Başkan bir oyuncunun partisini öğrenir.',
  'specialElection': 'Başkan sıradaki başkanı seçer.',
  'execution': 'Başkan bir oyuncuyu oyundan çıkarır.',
};

/// JS'teki gibi sayı yazımı (`120 / 60` → `2`).
String _num(num n) => n == n.roundToDouble() ? '${n.toInt()}' : '$n';

abstract final class SSettings {
  static const roles = 'Rol dağılımı';
  static String rolesHint(int n) => n >= 5 && n <= 10 ? 'Odada $n kişi var.' : 'Oyun 5–10 kişiyle oynanır.';
  static const players = 'Kişi';
  static const track = 'Faşist pistindeki yetkiler';
  static const skipAfter = 'Bekleyen oyuncuyu atlama';
  static const skipHint = 'Bu süreden sonra oda sahibi, sırası gelen oyuncu adına varsayılanı uygulayabilir. Bağlantısı kopan oyuncu hemen atlanabilir.';
  static String sec(int n) => n < 60 ? '$n sn' : '${_num(n / 60)} dk';
  static const readOnly = 'Ayarları oda sahibi seçer.';
}

abstract final class SPlay {
  static const you = 'sen';
  static const president = 'Başkan';
  static const chancellor = 'Şansölye';
  static const nominee = 'Aday';
  static const dead = 'İdam edildi';
  static const deadShort = 'İdam';
  static const voted = 'Oy verdi';
  static const ja = 'Ja!';
  static const nein = 'Nein';
  static const table = 'Masa';
  static String turn(int n) => '$n. hükümet';
  static const roleHold = 'Rolünü görmek için basılı tut';
  static const roleHoldHint = 'Yanındakiler görmesin diye yalnızca basılıyken açılır.';
  static const roleTeam = 'Takım arkadaşların';
  static const roleLiberal = 'Liberal yasaları çıkar ya da Hitler’i idam et. Kimin ne olduğunu bilmiyorsun.';
  static const roleFascist = 'Görevin 6 faşist yasa çıkarmak ya da 3 faşist yasadan sonra Hitler’i şansölye seçtirmek.';
  static const roleHitlerBlind = 'Faşistler seni tanıyor ama sen onları tanımıyorsun. Güven kazan, şansölye seçil.';
  static const roleHitlerKnows = 'Görevin 3 faşist yasadan sonra şansölye seçilmek. Liberal gibi davran.';
  static const investigations = 'Sorgulama sonuçların';
  static String investigated(String nick, String party) => '$nick: $party';
  static const liberalTrack = 'Liberal yasalar';
  static String trackCount(String label, int n, int max) => '$label · $n/$max';
  static String pileInfo(int deck, int discard) => 'Deste $deck · Iskarta $discard';
  static const hitlerSlot = 'Hitler bölgesi başlangıcı';
  static const seats = 'Oyuncular';
  static const fascistTrack = 'Faşist yasalar';
  static const hitlerZone = '3 faşist yasadan sonra Hitler şansölye seçilirse faşistler kazanır.';
  static const vetoZone = '5 faşist yasadan sonra veto açılır.';
  static const tracker = 'Seçim sayacı';
  static const trackerHint = '3 başarısız seçimde destenin üstündeki yasa kendiliğinden çıkar.';
  static const deck = 'Deste';
  static const discard = 'Iskarta';
  // Aday gösterme
  static const nominateTitle = 'Şansölye adayını seç';
  static const nominateHint = 'Son seçilen başkan ve şansölye aday olamaz.';
  static const nominateHint5 = 'Son seçilen şansölye aday olamaz.';
  static String nominate(String nick) => '$nick adayım';
  static String waitNominate(String nick) => '$nick şansölye adayını seçiyor.';
  // Oylama
  static String voteTitle(String p, String c) => 'Başkan $p, şansölye $c olsun mu?';
  static const voteHint = 'Oylar herkes oy verince birlikte açılır.';
  static String roleOpen(String role, String blurb) => '$role · $blurb';
  static String voteMine(String v) => '$v dedin; herkes oy verene kadar değiştirebilirsin.';
  static String people(int n) => '$n kişi';
  static String voteProgress(int done, int total) => '$done/$total oy verildi';
  static const deadNoVote = 'İdam edildin; oy veremezsin ama izleyebilirsin.';
  static const spectator = 'Bu oyunu izliyorsun.';
  static String voteResult(bool passed) => passed ? 'Hükümet kuruldu' : 'Hükümet kurulamadı';
  // Yasama
  static const silence = 'Yasama sırasında başkan ve şansölye kartlar hakkında konuşmaz, işaret vermez. Sonrasında istediklerini söyleyebilirler; yalan da serbest.';
  static const presidentTitle = 'Atılacak kartı seç';
  static const presidentHint = 'Kalan iki kart şansölyeye gider.';
  static const discardThis = 'Bu kartı at';
  static const chancellorTitle = 'Yasalaşacak kartı seç';
  static const chancellorHint = 'Diğer kart ıskartaya gider.';
  static const enactThis = 'Bu yasayı çıkar';
  static const veto = 'Veto öner';
  static const vetoHint = 'Başkan kabul ederse iki kart da atılır ve seçim sayacı ilerler.';
  static const vetoWait = 'Veto önerdin. Başkanın cevabı bekleniyor.';
  static const vetoDeniedNote = 'Başkan vetoyu reddetti; bir yasa seçmelisin.';
  static String vetoAsk(String nick) => '$nick veto öneriyor.';
  static const vetoAccept = 'Vetoyu kabul et';
  static const vetoReject = 'Reddet';
  static String waitPresident(String nick) => 'Başkan $nick kartlara bakıyor.';
  static String waitChancellor(String nick) => 'Şansölye $nick yasayı seçiyor.';
  static String waitVeto(String p, String c) => '$c veto önerdi; başkan $p karar veriyor.';
  // Yetkiler
  static String powerTitle(String power) => power;
  static const peekTitle = 'Destenin üstündeki 3 kart';
  static const peekHint = 'Sıradaki yasalar bu sırayla çekilecek. Ne gördüğünü söyleyip söylememek sana kalmış.';
  static const peekDone = 'Gördüm, devam et';
  static const investigateTitle = 'Kimin partisini öğrenmek istiyorsun?';
  static const investigateHint = 'Sonucu yalnızca sen görürsün. Hitler faşist görünür. Daha önce sorgulanan seçilemez.';
  static const specialTitle = 'Sıradaki başkanı seç';
  static const specialHint = 'Bu hükümetten sonra sıra senin solundan devam eder.';
  static const executionTitle = 'Kimi idam ediyorsun?';
  static const executionHint = 'İdam edilen Hitler’se liberaller kazanır. Değilse rolü açıklanmaz.';
  static String pick(String nick) => '$nick seç';
  static String waitPower(String nick, String power) => 'Başkan $nick: ${trLower(power)}.';
  // Atlama
  static String skip(String nicks) => '$nicks adına varsayılanı uygula';
  static String skipIn(int sec) => '$sec sn sonra atlayabilirsin';
  static const skipHint = 'Oy vermeyen Nein sayılır; aday ve kart rastgele seçilir; yetki kullanılmadan geçilir.';
  static String waiting(String nicks) => 'Bekleniyor: $nicks';
  // Sonuç
  static const winner = <String, String>{'liberal': 'Liberaller kazandı', 'fascist': 'Faşistler kazandı'};
  static const noWinner = 'Oyun yarıda bitti';
  static const reason = <String, String>{
    'liberalPolicies': '5 liberal yasa çıktı.',
    'hitlerExecuted': 'Hitler idam edildi.',
    'fascistPolicies': '6 faşist yasa çıktı.',
    'hitlerChancellor': 'Hitler şansölye seçildi.',
    'ended': 'Oda sahibi oyunu bitirdi.',
  };
  static const rolesTitle = 'Roller';
  static const backNow = 'Lobiye dön';
  static String backIn(int sec) => 'Lobiye dönülüyor… · $sec sn';
  static const gameOver = 'Oyun bitti';
  static const winnerTitle = <String, String>{'liberal': 'Liberaller kazandı!', 'fascist': 'Faşistler kazandı!'};
  static const sideLiberal = 'Liberaller';
  static const sideFascist = 'Faşistler';
  static const log = 'Olay günlüğü';
}

const phaseNames = <String, String>{
  'nominate': 'Aday gösterme',
  'vote': 'Oylama',
  'presidentLegislate': 'Yasama',
  'chancellorLegislate': 'Yasama',
  'power': 'Yürütme yetkisi',
  'over': 'Oyun bitti',
};

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Roller', 'Herkes gizlice rolünü öğrenir. Çoğunluk liberaldir; faşistler birbirini ve Hitler’i tanır. Hitler, 5–6 kişide faşisti tanır, daha kalabalıkta tanımaz.'),
    ('Seçim', 'Başkanlık sırayla döner. Başkan bir şansölye adayı gösterir, herkes aynı anda Ja! ya da Nein der. Çoğunluk Ja! derse hükümet kurulur; kurulamazsa seçim sayacı ilerler.'),
    ('Yasama', 'Başkan desteden 3 kart çeker, birini atar, ikisini şansölyeye verir; şansölye birini yasalaştırır. Bu sırada ikisi de konuşmaz. 5 faşist yasadan sonra veto açılır.'),
    ('Yetkiler', 'Bazı faşist yasalar başkana yetki verir: önizleme, sadakat sorgulama, özel seçim ya da idam. Pistteki simgeler hangisinin geleceğini gösterir.'),
    ('Kazanma', 'Liberaller 5 liberal yasa çıkarınca ya da Hitler idam edilince kazanır. Faşistler 6 faşist yasayla ya da 3 faşist yasadan sonra Hitler şansölye seçilince kazanır.'),
  ];
  static const licenseBefore = 'Secret Hitler, Goat, Wolf & Cabbage tarafından ';
  static const licenseName = 'CC BY-NC-SA 4.0';
  static const licenseAfter = ' lisansıyla yayımlanmıştır. Bu ticari olmayan uyarlama aynı lisansla paylaşılır; görseller özgündür, orijinal çizimler kullanılmamıştır. ';
  static const licenseSite = 'secrethitler.com';
}

const licenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/';
const siteUrl = 'https://www.secrethitler.com/';

/// PlayView.tsx `logText`.
String logText(ShLogEntry e, String Function(String id) nick) {
  String n(String? id) => nick(id ?? '');
  switch (e.k) {
    case 'start':
      return 'Oyun başladı. İlk başkan ${n(e.president)}.';
    case 'nominate':
      return '${n(e.president)}, ${n(e.chancellor)} adlı oyuncuyu şansölye adayı gösterdi.';
    case 'vote':
      final ja = e.ja.map(nick).join(', ');
      final nein = e.nein.map(nick).join(', ');
      return '${e.passed == true ? 'Hükümet kuruldu' : 'Hükümet kurulamadı'}. Ja!: ${ja.isEmpty ? 'kimse' : ja}. Nein: ${nein.isEmpty ? 'kimse' : nein}.';
    case 'tracker':
      return 'Seçim sayacı ${e.count}/3.';
    case 'enact':
      final policy = policyNames[e.policy] ?? '';
      return e.chaos == true
          ? 'Kargaşa: destenin üstündeki ${trLower(policy)} yasa kendiliğinden çıktı. Dönem sınırları sıfırlandı.'
          : '$policy yasa çıktı.';
    case 'vetoAsked':
      return '${n(e.chancellor)} veto önerdi.';
    case 'veto':
      return '${n(e.president)} vetoyu kabul etti; iki kart da atıldı.';
    case 'vetoDenied':
      return '${n(e.president)} vetoyu reddetti.';
    case 'reshuffle':
      return 'Iskarta desteye karıştırıldı. Destede ${e.deck} kart var.';
    case 'peek':
      return '${n(e.president)} destenin üstündeki 3 karta baktı.';
    case 'investigate':
      return '${n(e.president)}, ${n(e.target)} adlı oyuncunun sadakatini sorguladı.';
    case 'special':
      return '${n(e.president)} özel seçimle ${n(e.target)} adlı oyuncuyu başkan yaptı.';
    case 'execute':
      return '${n(e.president)}, ${n(e.target)} adlı oyuncuyu idam etti.';
    case 'powerSkipped':
      return '${powerNames[e.power] ?? ''} kullanılmadan geçildi.';
    case 'skip':
      return 'Oda sahibi ${e.who.map(nick).join(', ')} adına varsayılanı uyguladı.';
    case 'notHitler':
      return '${n(e.chancellor)} şansölye seçildi; Hitler olmadığı kesinleşti.';
    case 'over':
      return '${e.winner != null ? (SPlay.winner[e.winner] ?? '') : SPlay.noWinner}. ${SPlay.reason[e.reason] ?? ''}';
  }
  return '';
}
