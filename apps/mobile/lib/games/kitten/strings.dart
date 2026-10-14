// games/kitten/client/strings.ts ile birebir.
import 'dart:math' as math;

import 'models.dart';

const cardName = <String, String>{
  'bomb': 'Bomba',
  'defuse': 'Etkisiz Kıl',
  'attack': 'Saldır',
  'skip': 'Atla',
  'future': 'Geleceği Gör',
  'shuffle': 'Karıştır',
  'favor': 'İyilik İste',
  'nope': 'Hayır',
  'sarman': 'Sarman Paşa',
  'tekir': 'Tekir Hoca',
  'pamuk': 'Pamuk Bulut',
  'kara': 'Kara Kömür',
  'benek': 'Benekli Bıyık',
};

const cardText = <String, String>{
  'bomb': 'Çektiğin an patlarsın; elinde Etkisiz Kıl yoksa oyundan çıkarsın.',
  'defuse': 'Bombayı etkisiz kılar. Sonra bombayı destede istediğin yere gizlice geri koyarsın.',
  'attack': 'Kart çekmeden sıranı bitir. Sıradaki oyuncu art arda 2 tur oynar. Saldırıya saldırıyla karşılık verirsen kalan turların da ona geçer.',
  'skip': 'Kart çekmeden bir turunu bitir. Saldırı altındaysan yalnızca bir turu siler.',
  'future': 'Destenin en üstteki 3 kartına gizlice bak.',
  'shuffle': 'Desteyi karıştır. Kimse bombanın yerini artık bilemez.',
  'favor': 'Bir oyuncu seç; elinden seçtiği bir kartı sana vermek zorunda.',
  'nope': 'Bomba ve Etkisiz Kıl dışındaki her eylemi durdurur. Hayır’a da Hayır denebilir.',
  'sarman': 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  'tekir': 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  'pamuk': 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  'kara': 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  'benek': 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
};

const actionName = <String, String>{
  'attack': 'Saldır',
  'skip': 'Atla',
  'future': 'Geleceği Gör',
  'shuffle': 'Karıştır',
  'favor': 'İyilik İste',
  'pair': 'Kedi çifti',
  'triple': 'Kedi üçlüsü',
  'five': '5 farklı kedi',
};

/// El kartlarının altındaki kısa etki yazısı (tasarım: Bomba Kedi).
const cardFx = <String, String>{
  'bomb': 'Çekersen patlarsın',
  'defuse': 'Bombayı etkisiz kılar',
  'attack': 'Sıradaki 2 tur oynar',
  'skip': 'Çekmeden turu bitir',
  'future': 'Üstteki 3 karta bak',
  'shuffle': 'Desteyi karıştırır',
  'favor': 'Birinden kart iste',
  'nope': 'Bir eylemi durdurur',
  'sarman': 'Kedi · çift yap',
  'tekir': 'Kedi · çift yap',
  'pamuk': 'Kedi · çift yap',
  'kara': 'Kedi · çift yap',
  'benek': 'Kedi · çift yap',
};

abstract final class S {
  static const name = 'Bomba Kedi';
  static const pitch = 'Desteden bomba çekmemeye çalış, son kalan sen ol';
}

abstract final class SSettings {
  static const readOnly = 'Ayarları oda sahibi seçer.';
  static const deck = 'Deste';
  static String deckHint(int n) => n > 5
      ? '$n kişi: iki deste birleştirilir, desteye ${n - 1} bomba girer.'
      : '${math.max(2, n)} kişi: tek deste, desteye ${math.max(1, n - 1)} bomba girer. 6–10 kişide otomatik olarak iki deste kullanılır.';
  static const nope = 'Hayır süresi';
  static const nopeHint = 'Bir eylem oynanınca herkesin Hayır diyebileceği süre. Her Hayır süreyi baştan başlatır.';
  static const turn = 'Tur süresi';
  static const turnHint = 'Süre biterse oyuncu yerine otomatik kart çekilir.';
  static const unlimited = 'Süresiz';
  static String sec(int n) => '$n sn';
  static const five = '5 farklı kedi';
  static const fiveHint = '5 farklı kedi kartını birlikte oynayan, ıskartadan istediği kartı alır.';
  static const on = 'Açık';
  static const off = 'Kapalı';
}

abstract final class SPlay {
  static const you = 'sen';
  static const yourTurn = 'Sıra sende';
  static String turnOf(String nick) => '$nick oynuyor';
  static String turnsLeft(int n) => n > 1 ? '$n tur oynayacak' : '';
  static String myTurnsLeft(int n) => n > 1 ? 'Art arda $n tur oynaman gerekiyor.' : 'İstediğin kadar kart oyna, sonra bir kart çek.';
  static String deck(int n) => '$n kart';
  static const deckLabel = 'Deste';
  static const discardLabel = 'Iskarta';
  static const emptyDiscard = 'Boş';
  static const draw = 'Kart çek ve sırayı bitir';
  static const selectHint = 'Aynı kediden 2 ya da 3 tane seçebilirsin.';
  static const me = 'Sen';
  static String deckN(int n) => 'Deste $n';
  static String discardN(int n) => 'Iskarta $n';
  static String risk(int bombs) => 'Patlama riski · destede $bombs bomba';
  static const seats = 'Oyuncular';
  static const riskLabel = 'Patlama riski';
  static String playAs(String name) => '$name oyna';
  static const chooseTarget = 'Kimden?';
  static const chooseNamed = 'Hangi kartı istiyorsun?';
  static const clear = 'Seçimi temizle';
  static String cards(int n) => '$n kart';
  static const out = 'patladı';
  static const left = 'Oyunda değilsin; izliyorsun.';
  static const spectator = 'Bu oyunu izliyorsun.';
  static const hand = 'Elin';
  static const handEmpty = 'Elinde kart yok.';
  static String timer(int s) => '$s sn';
  static String hostSkip(String nick) => '$nick yerine kart çek';
  static const hostSkipHint = 'Bağlantısı koptu. Sırası, onun yerine kart çekilerek geçer.';
  static const invalid = 'Bu kartlar birlikte oynanmaz';
  static const log = 'Olanlar';
  static const error = 'Hamle gönderilemedi. Bağlantını kontrol et.';
  // Hayır penceresi
  static String pendingTitle(String by, String action, String? target) => target != null ? '$by, $target için $action oynadı' : '$by $action oynadı';
  static String pendingNamed(String name) => 'İstenen kart: $name';
  static const willHappen = 'Kimse durdurmazsa olacak';
  static const willCancel = 'Şimdilik durduruldu';
  static String nopeCount(int n) => n == 1 ? '1 Hayır' : '$n Hayır';
  static const nopeBtn = 'Hayır!';
  static const noNope = 'Elinde Hayır yok.';
  // Bomba
  static const bombMe = 'Bomba çektin!';
  static const bombMeHint = 'Elinde Etkisiz Kıl var. Oyna, yoksa süre bitince otomatik oynanır.';
  static const defuseBtn = 'Etkisiz Kıl’ı oyna';
  static String bombOther(String nick) => '$nick bomba çekti!';
  static const bombOtherHint = 'Etkisiz kılıyor…';
  static const placeMe = 'Bombayı nereye koyacaksın?';
  static const placeHint = 'Konumu yalnızca sen bileceksin. Süre bitince rastgele bir yere konur.';
  static const placeTop = 'En üste';
  static const placeBottom = 'En alta';
  static const placeRandom = 'Rastgele';
  static String placeAt(int n) => 'Üstten $n.';
  static String placeBtn(String label) => '$label koy';
  static const placeExact = 'Ya da tam yerini seç';
  static String placeOther(String nick) => '$nick bombayı gizlice desteye geri koyuyor.';
  static String myBomb(int i) => i == 0 ? 'Koyduğun bomba şu an en üstte.' : 'Koyduğun bomba şu an üstten ${i + 1}. sırada.';
  static String boom(String nick) => '$nick patladı!';
  static const boomMe = 'Patladın!';
  static const boomHint = 'Elindeki kartlar ıskartaya gitti.';
  static String defused(String nick) => '$nick bombayı etkisiz kıldı';
  // Geleceği gör
  static const futureTitle = 'Destenin üstü';
  static const futureHint = 'Yalnızca sen görüyorsun. Soldaki ilk çekilecek kart.';
  static String futureSlot(int i) => i == 0 ? 'Sıradaki' : '${i + 1}.';
  static const futureClose = 'Tamam';
  static const futureAgain = 'Gördüğün kartlar';
  // İyilik
  static String favorMe(String nick) => '$nick senden bir kart istiyor';
  static const favorMeHint = 'Vereceğin kartı elinden seç. Süre bitince rastgele biri gider.';
  static String giveBtn(String name) => '$name ver';
  static String favorOther(String from, String to) => '$to, $from için bir kart seçiyor.';
  // Iskartadan seç
  static const pickMe = 'Iskartadan bir kart al';
  static const pickHint = 'Süre bitince rastgele biri seçilir.';
  static String pickOther(String nick) => '$nick ıskartadan bir kart seçiyor.';
}

/// `s.log(e, nick)`: günlük satırı.
String logText(KtLogEntry e, String Function(String? id) nick) {
  final k = e.kind != null ? cardName[e.kind] : null;
  switch (e.t) {
    case 'start':
      return e.n == 2 ? 'Oyun başladı. İki deste birleştirildi.' : 'Oyun başladı.';
    case 'turn':
      return e.n != null && e.n! > 1 ? '${nick(e.by)} art arda ${e.n} tur oynayacak.' : '${nick(e.by)} oynuyor.';
    case 'play':
      final a = e.action != null ? (actionName[e.action] ?? '') : '';
      if (e.action == 'triple' && k != null) return '${nick(e.by)}, ${nick(e.to)} oyuncusundan $k istiyor ($a).';
      return e.to != null ? '${nick(e.by)}, ${nick(e.to)} için $a oynadı.' : '${nick(e.by)} $a oynadı.';
    case 'nope':
      return '${nick(e.by)} Hayır dedi.';
    case 'cancelled':
      return '${nick(e.by)} oyuncusunun ${e.action != null ? actionName[e.action] : 'eylemi'} durduruldu.';
    case 'draw':
      return k != null ? '${nick(e.by)} kart çekti: $k.' : '${nick(e.by)} kart çekti.';
    case 'bomb':
      return '${nick(e.by)} bomba çekti!';
    case 'defuse':
      return '${nick(e.by)} bombayı etkisiz kıldı.';
    case 'placed':
      return '${nick(e.by)} bombayı desteye gizlice geri koydu.';
    case 'boom':
      return '${nick(e.by)} patladı ve oyundan çıktı.';
    case 'future':
      return '${nick(e.by)} destenin üstündeki 3 karta baktı.';
    case 'shuffle':
      return '${nick(e.by)} desteyi karıştırdı.';
    case 'favorGive':
      return k != null ? '${nick(e.by)}, ${nick(e.to)} oyuncusuna $k verdi.' : '${nick(e.by)}, ${nick(e.to)} oyuncusuna bir kart verdi.';
    case 'steal':
      return k != null ? '${nick(e.by)}, ${nick(e.to)} oyuncusundan $k çaldı.' : '${nick(e.by)}, ${nick(e.to)} oyuncusundan bir kart çaldı.';
    case 'named':
      return e.ok == true ? '${nick(e.by)}, ${nick(e.to)} oyuncusundan $k aldı.' : '${nick(e.to)} oyuncusunda $k yokmuş.';
    case 'pick':
      return '${nick(e.by)} ıskartadan $k aldı.';
    case 'empty':
      return '${nick(e.by)} oyuncusunun ${e.action != null ? actionName[e.action] : 'eylemi'} boşa gitti.';
    case 'timeout':
      return '${nick(e.by)} oyuncusunun süresi doldu; onun yerine kart çekildi.';
    case 'hostSkip':
      return 'Oda sahibi ${nick(e.by)} yerine kart çekti.';
    case 'left':
      return '${nick(e.by)} odadan ayrıldı.';
  }
  return '';
}

abstract final class SPodium {
  static const title = 'Oyun bitti';
  static String winner(String nick) => '$nick hayatta kaldı';
  static const none = 'Oyun erken bitirildi';
  static const order = 'Patlama sırası';
  static const alive = 'hayatta';
  static const back = 'Lobiye dönülüyor…';
  static const gameOver = 'Oyun bitti';
  static String winnerTitle(String nick) => '$nick hayatta kaldı!';
  static const survivor = 'Hayatta kaldı';
  static String outAt(int n) => '$n. patlayan';
}

abstract final class SHowTo {
  static const title = 'Nasıl oynanır';
  static const steps = <(String, String)>[
    ('Dağıtım', 'Herkes 1 Etkisiz Kıl ve 7 kartla başlar. Destede oyuncu sayısının bir eksiği kadar bomba var.'),
    ('Sıran', 'İstediğin kadar kart oyna ya da hiç oynama. Sıran, desteden bir kart çekince biter.'),
    ('Bomba', 'Bomba çekersen Etkisiz Kıl oynarsın ve bombayı desteye istediğin yere gizlice koyarsın. Etkisiz Kıl yoksa patlarsın.'),
    ('Hayır', 'Bir eylem oynanınca kısa bir geri sayım başlar. Bu sürede herkes Hayır oynayabilir. Çift sayıda Hayır eylemi geri getirir.'),
    ('Kazanan', 'Patlamayan son oyuncu kazanır.'),
  ];
  static const cardsTitle = 'Kartlar';
  static const cats = 'Kedi kartları';
  static const catsText = 'Aynı kediden 2 tane: seçtiğin oyuncudan rastgele kart çal. 3 tane: bir kart adı söyle, onda varsa senin olur.';
  static const five = '5 farklı kedi birlikte oynanırsa ıskartadan istediğin kartı alırsın.';
}
