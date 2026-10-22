// games/color-cards/client/strings.ts ile birebir.
import '../../shared/text.dart';
import 'models.dart';

const colorName = <String, String>{
  'green': 'Yeşil',
  'yellow': 'Sarı',
  'red': 'Kırmızı',
  'purple': 'Mor',
};

const valueName = <String, String>{
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  'skip': 'Atla',
  'reverse': 'Yön değiştir',
  'draw2': '+2',
  'wild': 'Renk seç',
  'wild4': 'Renk seç +4',
};

String cardName(String? color, String value) {
  final v = valueName[value] ?? value;
  if (color == null) return v;
  return '${colorName[color] ?? color} $v';
}

abstract final class S {
  static const name = 'Renk Renk';
  static const pitch = 'Rengi ya da sayıyı eşle, elini ilk sen bitir';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const mode = 'Kazanma';
  static const single = 'Tek el';
  static const points = '500 puan';
  static String modeHint(bool single) =>
      single ? 'Elini ilk bitiren oyunu kazanır.' : 'Eli bitiren, rakiplerin elindeki kartların puanını alır. 500’e ilk ulaşan kazanır.';
  static const modeLocked = 'Kazanma şekli oyun başlarken sabitlenir.';
  static const turn = 'Tur süresi';
  static const turnHint = 'Süre dolarsa oyuncu yerine kart çekilir ve sıra geçer.';
  static const unlimited = 'Süresiz';
  static String sec(int n) => '$n sn';
  static const house = 'Ev kuralları';
  static const houseHint = 'Hepsi isteğe bağlı; kapalıyken resmî kurallar geçerli.';
  static const stacking = 'Ceza yığma';
  static const stackingHint = '+2 üstüne +2 ya da +4, +4 üstüne +4 konur; ceza birikir.';
  static const sevenZero = '7-0 kuralı';
  static const sevenZeroHint = '0 oynanınca herkes elini oyun yönündeki komşusuna verir; 7 oynayan seçtiği oyuncuyla el değiştirir.';
  static const drawUntil = 'Sınırsız çekme';
  static const drawUntilHint = 'Oynanabilir kart gelene kadar çekilir.';
}

abstract final class SPlay {
  static const you = 'sen';
  static const yourTurn = 'Sıra sende';
  static String turnOf(String nick) => 'Sıra $nick’de';
  static const spectator = 'Bu oyunu izliyorsun.';
  static String round(int n) => '$n. el';
  static const deck = 'Deste';
  static const activeColor = 'Etkin renk';
  static const dirCw = 'Yön: saat yönü';
  static const dirCcw = 'Yön: saat yönünün tersi';
  static const hand = 'Elin';
  static String cardCount(int n) => '$n kart';
  static const myTurn = 'Rengi ya da sayıyı eşleyen bir kart oyna. Uyan kartın yoksa kart çek.';
  static String myTurnPenalty(int n) => 'Üstüne +2 ya da +4 koy, ya da $n kart çek.';
  static const afterDraw = 'Çektiğin kart oynanabilir. Oyna ya da elinde tutup sırayı geçir.';
  static String otherTurn(String nick) => '$nick düşünüyor…';
  static String otherPenalty(String nick, int n) => '$nick ya üstüne koyacak ya da $n kart çekecek.';
  static const draw = 'Kart çek';
  static String takePenalty(int n) => '$n kart çek';
  static const pass = 'Tut ve sırayı geçir';
  static const lastCard = 'Son kart!';
  static const lastCardDone = 'Son kart dedin';
  static const lastCardHint = 'Elinde 1 kart kalınca söylemezsen yakalanıp 2 kart çekebilirsin.';
  static const lastCardLocked = '“Son kart!” 2 ya da daha az kartın kalınca açılır.';
  static String catchBtn(String nick) => 'Yakaladım! $nick söylemedi';
  static const exposedMe = 'Son kartını söylemedin! Yakalanmadan “Son kart!” de.';
  static const calledBadge = 'son kart';
  static const chooseColor = 'Renk seç';
  static String chooseColorFor(String card) => '$card için renk seç';
  static const chooseSwap = '7: elini kiminle değiştireceksin?';
  static const cancel = 'Vazgeç';
  static const bluffWarn = 'Elinde bu renkte kart var. İtiraz edilirse 4 kartı sen çekersin.';
  static const startColorMe = 'Açılış kartı Renk seç. Başlangıç rengini sen seç.';
  static String startColorOther(String nick) => '$nick başlangıç rengini seçiyor.';
  static String hostSkip(String nick) => '$nick yerine çek';
  static const hostSkipHint = 'Bağlantısı koptu. Sırası, onun yerine kart çekilerek geçer.';
  static const log = 'Olanlar';
  static const rules = 'Bu masada';
  static const noHouse = 'Resmî kurallar, ev kuralı yok.';
  static const error = 'Hamle gönderilemedi. Bağlantını kontrol et.';
  // +4 itirazı
  static String challengeTitle(String by) => '$by Renk seç +4 oynadı';
  static String challengeHint(int n) =>
      'Elinde o renkte kart varken oynadıysa hile yaptı. İtiraz haklıysa $n kartı o çeker; haksızsa sen ${n + 2} kart çekersin.';
  static const challengeStackHint = 'Ya da elindeki +4’ü koyup cezayı sıradakine devret.';
  static const challengeBtn = 'Hile! İtiraz et';
  static String acceptBtn(int n) => 'Kabul et, $n kart çek';
  static String challengeOther(String victim, String by) => '$victim, $by’in +4’üne itiraz edecek mi?';
  static String revealTitle(String nick) => '$nick’in eli';
  static const revealGuilty = 'Hile yakalandı! Elinde o renkte kart vardı.';
  static const revealClean = 'Temiz çıktı. Elinde o renkte kart yoktu.';
  static const close = 'Kapat';
  // El sonu
  static String roundOverTitle(String nick) => '$nick elini bitirdi';
  static String roundOverPoints(int n) => '$n puan topladı';
  static String nextRound(int sec) => 'Yeni el $sec sn içinde';
  static const scores = 'Puanlar';
  static String target(int n) => 'Hedef $n';
}

abstract final class SPodium {
  static const over = 'Oyun bitti';
  static String winner(String nick) => '$nick kazandı!';
  static const none = 'Oyun bitti';
  static const order = 'Sıralama';
  static const back = 'Lobiye dönülüyor…';
  static String cardsLeft(int n) => n == 0 ? 'Elini bitirdi' : '$n kart kaldı';
  static String pts(int n) => '$n puan';
  static String cards(int n) => n == 0 ? 'bitirdi' : '$n kart';
}

/// `s.log(e, nick)`: günlük satırı.
String logText(CcLogEntry e, String Function(String? id) nick) {
  final card = e.card != null ? cardName(e.card!.color, e.card!.value) : '';
  String lower(String? color) => trLower(colorName[color] ?? '');
  switch (e.t) {
    case 'start':
      return '${e.n} oyuncuyla oyun başladı.';
    case 'round':
      return '${e.n}. el dağıtıldı. Dağıtan: ${nick(e.by)}.';
    case 'firstCard':
      return 'Açılış kartı: $card.';
    case 'play':
      return e.color != null ? '${nick(e.by)} $card oynadı, ${lower(e.color)} seçti.' : '${nick(e.by)} $card oynadı.';
    case 'draw':
      return e.n == 1 ? '${nick(e.by)} kart çekti.' : '${nick(e.by)} ${e.n} kart çekti.';
    case 'penalty':
      return '${nick(e.by)} ${e.n} kart çekti ve sırası geçti.';
    case 'pass':
      return '${nick(e.by)} kartı tuttu, sırayı geçirdi.';
    case 'skipped':
      return '${nick(e.by)} atlandı.';
    case 'reverse':
      return 'Yön değişti.';
    case 'color':
      return '${nick(e.by)} başlangıç rengini ${lower(e.color)} seçti.';
    case 'challengeWin':
      return '${nick(e.by)} itiraz etti ve haklı çıktı: ${nick(e.to)} ${e.n} kart çekti.';
    case 'challengeLose':
      return '${nick(e.by)} itiraz etti ama haksız çıktı: ${e.n} kart çekti.';
    case 'accept':
      return '${nick(e.by)} +4’ü kabul etti, ${e.n} kart çekti.';
    case 'call':
      return '${nick(e.by)}: “Son kart!”';
    case 'caught':
      return '${nick(e.by)}, ${nick(e.to)}’i yakaladı: ${e.n} kart cezası.';
    case 'swap':
      return '${nick(e.by)} ve ${nick(e.to)} el değiştirdi.';
    case 'rotate':
      return 'Bütün eller bir yana kaydı.';
    case 'reshuffle':
      return 'Deste bitti, ıskarta karıştırıldı.';
    case 'timeout':
      return '${nick(e.by)} için süre doldu.';
    case 'hostSkip':
      return 'Oda sahibi ${nick(e.by)} yerine oynadı.';
    case 'left':
      return '${nick(e.by)} oyundan ayrıldı.';
    case 'roundWin':
      return '${nick(e.by)} elini bitirdi!';
  }
  return '';
}
