// games/intrigue/client/strings.ts ile birebir.
import 'models.dart';

const roleName = <String, String>{
  'treasurer': 'Hazinedar',
  'assassin': 'Fedai',
  'guard': 'Muhafız',
  'pirate': 'Korsan',
  'spy': 'Casus',
};

/// Rolün tek satırlık özeti (kartın altında ve rol tablosunda).
const roleAbility = <String, String>{
  'treasurer': 'Vergi: +3 altın · Yardım isteği engeller',
  'assassin': 'Suikast: 3 altın öde, hedef kart kaybeder',
  'guard': 'Suikastı engeller',
  'pirate': 'Çal: 2 altın al · Çalmayı engeller',
  'spy': 'Değiş tokuş: 2 kart çek · Çalmayı engeller',
};

/// Rol tablosu: rolün eylemi ve engellediği eylem.
const roleAction = <String, String>{
  'treasurer': 'Vergi: +3 altın',
  'assassin': 'Suikast: 3 altın öde, hedef kart kaybeder',
  'guard': '—',
  'pirate': 'Çal: hedeften 2 altın al',
  'spy': 'Değiş tokuş: 2 kart çek, istediklerini sakla',
};

const roleBlocks = <String, String>{
  'treasurer': 'Yardım iste',
  'assassin': '—',
  'guard': 'Suikast',
  'pirate': 'Çal',
  'spy': 'Çal',
};

const actionName = <String, String>{
  'income': 'Gelir',
  'aid': 'Yardım iste',
  'coup': 'Darbe',
  'tax': 'Vergi',
  'assassinate': 'Suikast',
  'steal': 'Çal',
  'exchange': 'Değiş tokuş',
};

const actionEffect = <String, String>{
  'income': '+1 altın. Engellenemez.',
  'aid': '+2 altın. Hazinedar engelleyebilir.',
  'coup': '7 altın öde, hedef kart kaybeder. Engellenemez.',
  'tax': '+3 altın.',
  'assassinate': '3 altın öde, hedef kart kaybeder. Muhafız engeller.',
  'steal': 'Hedeften 2 altın al. Korsan ya da Casus engeller.',
  'exchange': 'Desteden 2 kart çek, istediğin kartları sakla.',
};

/// Eylem düğmesindeki kısa açıklama (tasarımdaki gibi).
const actionFx = <String, String>{
  'income': '+1 altın · engellenemez',
  'aid': '+2 altın',
  'coup': '7 altın öde · engellenemez',
  'tax': 'Hazinedar · +3 altın',
  'assassinate': 'Fedai · 3 altın öde',
  'steal': 'Korsan · 2 altın al',
  'exchange': 'Casus · 2 kart çek',
};

const loseReason = <String, String>{
  'challenge': 'İtiraz sonucu bir kartını kaybediyorsun',
  'coup': 'Darbeye uğradın: bir kartını kaybediyorsun',
  'assassinate': 'Suikasta uğradın: bir kartını kaybediyorsun',
  'left': 'Bir kartını kaybediyorsun',
};

abstract final class S {
  static const name = 'Entrika';
  static const pitch = 'Saraydaki rolünü sakla, blöf yap, son ayakta kalan ol';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const deck = 'Deste';
  static String deckHint(int n, bool big) => big || n > 6
      ? 'Her rolden 4 kart, toplam 20. ${n > 6 ? '7–10 kişide kendiliğinden açılır.' : ''}'.trim()
      : 'Her rolden 3 kart, toplam 15. 7–10 kişide her rolden 4 kart kullanılır.';
  static const bigDeck = 'Rol başına 4 kart';
  static const challenge = 'İtiraz süresi';
  static const challengeHint = 'Bir rol iddia edilince herkesin “Yalan!” diyebileceği ya da engelleyebileceği süre. Herkes geçerse erken kapanır.';
  static const turn = 'Tur süresi';
  static const turnHint = 'Süre biterse oyuncu yerine Gelir alınır (10+ altında rastgele birine Darbe).';
  static const unlimited = 'Süresiz';
  static String sec(int n) => '$n sn';
  static const on = 'Açık';
  static const off = 'Kapalı';
}

abstract final class SPlay {
  static const you = 'sen';
  static const yourTurn = 'Sıra sende';
  static String yourTurnLeft(int sec) => 'Sıra sende · $sec sn';
  static const ok = 'Tamam';
  static const rivals = 'Rakipler';
  static const passedMark = 'geçti';
  static const decidingMark = 'karar veriyor';
  static String turnOf(String nick) => 'Sıra: $nick';
  static const spectator = 'İzliyorsun';
  static const eliminated = 'Elendin, izlemeye devam edebilirsin';
  static const out = 'elendi';
  static String coins(int n) => '$n altın';
  static String deck(int n) => 'Destede $n kart';
  static String thinking(String nick) => '$nick eylemini seçiyor.';
  static const chooseAction = 'Eylemini seç';
  static const mustCoup = '10 ya da daha fazla altının var: bu turda Darbe yapmak zorundasın.';
  static String needCoins(int n) => '$n altın gerekli';
  static const mustCoupReason = 'Önce Darbe';
  static String claims(String role) => '$role iddiası';
  static const chooseTarget = 'Hedef seç';
  static String confirm(String action, String? target) => target != null ? '$action: $target' : action;
  static const cancel = 'Vazgeç';
  // Pencere
  static String windowClaim(String actor, String action, String? target) =>
      target != null ? '$actor, $target üzerinde $action yapmak istiyor' : '$actor $action yapmak istiyor';
  static String windowClaimRole(String role) => '$role olduğunu söylüyor. İnanmıyorsan “Yalan!” de.';
  static String windowAid(String actor) => '$actor yardım istiyor (+2 altın)';
  static const windowAidHint = 'Hazinedar olduğunu söyleyen herkes engelleyebilir.';
  static String windowBlockOnly(String target) => '$target hâlâ engelleyebilir';
  static String windowCounter(String blocker, String role) => '$blocker $role olarak engelliyor';
  static const windowCounterHint = 'İnanmıyorsan “Yalan!” de; yoksa eylem engellenir.';
  static const lie = 'Yalan!';
  static const pass = 'Geç';
  static String blockAs(String role) => '$role olarak engelle';
  static const passed = 'Geçtin; diğerleri bekleniyor.';
  static const waiting = 'Diğer oyuncuların kararı bekleniyor.';
  static const noSay = 'Bu pencerede söz hakkın yok.';
  static String passedList(int n, int total) => '$n/$total geçti';
  // Kart kaybı
  static const loseMeTitle = 'Bir kartını kaybediyorsun';
  static const loseMeHint = 'Hangi rolü açacağını sen seç. Süre biterse rastgele biri açılır.';
  static String loseBtn(String role) => '$role kartını aç';
  static String loseOther(String nick) => '$nick açacağı kartı seçiyor.';
  // Değiş tokuş
  static const exMeTitle = 'Değiş tokuş';
  static String exMeHint(int n) => 'Saklamak istediğin $n kartı seç; kalanlar desteye karışır. Süre biterse elindekiler kalır.';
  static String exBtn(int n, int chosen) => chosen == n ? 'Bu kartları sakla' : '${n - chosen} kart daha seç';
  static String exOther(String nick) => '$nick desteden çektiği kartlara bakıyor.';
  static const drawn = 'yeni';
  // El
  static const hand = 'Elin';
  static const revealedMine = 'Açılan kartların';
  static const noHand = 'Elinde kart kalmadı.';
  // Oda sahibi
  static const hostDefaultHint = 'Bağlantısı kopan oyuncu bekleniyor.';
  static const hostDefault = 'Yerine varsayılanı uygula';
  // İtiraz sonucu
  static String flashTrue(String claimant, String role) => '$claimant gerçekten $role';
  static String flashFalse(String claimant, String role) => '$claimant $role değilmiş';
  static String flashTrueHint(String challenger) => '$challenger bir kart kaybediyor. Gösterilen kart desteye karıştı, yerine yenisi çekildi.';
  static const flashFalseHint = 'Blöf yakalandı: iddia eden bir kart kaybediyor.';
  static const error = 'Bağlantı sorunu. Tekrar dene.';
  static const log = 'Olaylar';
  static String secs(int n) => '$n';
}

/// `s.log(e, nick)`: günlük satırı.
String logText(LogEntry e, String Function(String? id) nick) {
  final by = nick(e.by);
  final to = nick(e.to);
  final role = e.role != null ? (roleName[e.role] ?? '') : '';
  final action = e.action != null ? (actionName[e.action] ?? '') : '';
  switch (e.t) {
    case 'start':
      return 'Oyun başladı, her rolden ${e.n} kart.';
    case 'turn':
      return 'Sıra: $by.';
    case 'act':
      if (e.action == 'income') return '$by Gelir aldı.';
      if (e.to != null && e.to!.isNotEmpty) return '$by → $to: $action${role.isNotEmpty ? ' ($role iddiası)' : ''}.';
      return '$by: $action${role.isNotEmpty ? ' ($role iddiası)' : ''}.';
    case 'block':
      return '$by, $role olarak engelledi.';
    case 'challenge':
      return e.ok == true ? '$by “Yalan!” dedi ama $to $role kartını gösterdi.' : '$by “Yalan!” dedi: $to $role değildi.';
    case 'lose':
      return '$by $role kartını açtı.';
    case 'out':
      return '$by elendi.';
    case 'done':
      if (e.action == 'income') return '$by +1 altın.';
      if (e.action == 'aid') return '$by +2 altın aldı.';
      if (e.action == 'tax') return '$by vergiyle +3 altın aldı.';
      if (e.action == 'steal') return '$by → $to: ${e.n} altın çalındı.';
      if (e.action == 'exchange') return '$by desteden ${e.n} kart çekti.';
      if (e.action == 'coup') return '$by → $to: Darbe.';
      if (e.action == 'assassinate') return '$by → $to: Suikast gerçekleşiyor.';
      return '$by: $action.';
    case 'blocked':
      return '$action engellendi ($to).';
    case 'failed':
      return '$action başarısız oldu ($by).';
    case 'timeout':
      return 'Süre doldu ($by).';
    case 'hostDefault':
      return 'Oda sahibi varsayılanı uyguladı ($by).';
    case 'left':
      return '$by odadan ayrıldı.';
  }
  return '';
}

abstract final class SHowto {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Amaç', 'Herkesin 2 gizli rol kartı ve 2 altını var. İki kartı da açılan elenir; son kalan kazanır.'),
    ('Sıran gelince', 'Bir eylem seç. Gelir, Yardım iste ve Darbe herkese açık; diğerleri bir rol iddia eder. Elinde o rol olmasa da iddia edebilirsin.'),
    ('Yalan!', 'Rol iddia edilince herkes itiraz edebilir. İddia eden kartı gösterebilirse itiraz eden kart kaybeder; gösteremezse iddia eden kart kaybeder ve eylemi boşa gider.'),
    ('Engelle', 'Bazı eylemler rolle engellenir. Engel de bir iddiadır: ona da “Yalan!” denebilir.'),
    ('Altın', '7 altınla Darbe yapabilirsin; 10 ya da daha fazla altınla turunda Darbe zorunlu. Suikastın 3 altını engellense de geri gelmez.'),
  ];
  static const roles = 'Roller';
  static const actions = 'Herkesin yapabildikleri';
  static const role = 'Rol';
  static const action = 'Eylem';
  static const blocks = 'Engeller';
}

abstract final class SPodium {
  static String winner(String nick) => '$nick kazandı';
  static const none = 'Oyun bitti';
  static const title = 'Sarayda son ayakta kalan';
  static const order = 'Sıralama';
  static const alive = 'ayakta';
  static const back = 'Lobiye dönülüyor…';
  static const gameOver = 'Oyun bitti';
  static String winnerTitle(String nick) => '$nick kazandı!';
  static String place(int n) => '$n.';
}
