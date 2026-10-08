import type { CardKind, LogEntry, PendingKind } from '../shared/index.js';

export const CARD_NAME: Record<CardKind, string> = {
  bomb: 'Bomba',
  defuse: 'Etkisiz Kıl',
  attack: 'Saldır',
  skip: 'Atla',
  future: 'Geleceği Gör',
  shuffle: 'Karıştır',
  favor: 'İyilik İste',
  nope: 'Hayır',
  sarman: 'Sarman Paşa',
  tekir: 'Tekir Hoca',
  pamuk: 'Pamuk Bulut',
  kara: 'Kara Kömür',
  benek: 'Benekli Bıyık',
};

export const CARD_TEXT: Record<CardKind, string> = {
  bomb: 'Çektiğin an patlarsın; elinde Etkisiz Kıl yoksa oyundan çıkarsın.',
  defuse: 'Bombayı etkisiz kılar. Sonra bombayı destede istediğin yere gizlice geri koyarsın.',
  attack: 'Kart çekmeden sıranı bitir. Sıradaki oyuncu art arda 2 tur oynar. Saldırıya saldırıyla karşılık verirsen kalan turların da ona geçer.',
  skip: 'Kart çekmeden bir turunu bitir. Saldırı altındaysan yalnızca bir turu siler.',
  future: 'Destenin en üstteki 3 kartına gizlice bak.',
  shuffle: 'Desteyi karıştır. Kimse bombanın yerini artık bilemez.',
  favor: 'Bir oyuncu seç; elinden seçtiği bir kartı sana vermek zorunda.',
  nope: 'Bomba ve Etkisiz Kıl dışındaki her eylemi durdurur. Hayır’a da Hayır denebilir.',
  sarman: 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  tekir: 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  pamuk: 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  kara: 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
  benek: 'Kedi kartı. Aynı kediden 2 tane: rastgele kart çal. 3 tane: istediğin kartı iste.',
};

export const ACTION_NAME: Record<PendingKind, string> = {
  attack: 'Saldır',
  skip: 'Atla',
  future: 'Geleceği Gör',
  shuffle: 'Karıştır',
  favor: 'İyilik İste',
  pair: 'Kedi çifti',
  triple: 'Kedi üçlüsü',
  five: '5 farklı kedi',
};

type Nick = (id: string | undefined) => string;

export const s = {
  name: 'Bomba Kedi',
  pitch: 'Desteden bomba çekmemeye çalış, son kalan sen ol',
  settings: {
    readOnly: 'Ayarları oda sahibi seçer.',
    deck: 'Deste',
    deckHint: (n: number) =>
      n > 5
        ? `${n} kişi: iki deste birleştirilir, desteye ${n - 1} bomba girer.`
        : `${Math.max(2, n)} kişi: tek deste, desteye ${Math.max(1, n - 1)} bomba girer. 6–10 kişide otomatik olarak iki deste kullanılır.`,
    nope: 'Hayır süresi',
    nopeHint: 'Bir eylem oynanınca herkesin Hayır diyebileceği süre. Her Hayır süreyi baştan başlatır.',
    turn: 'Tur süresi',
    turnHint: 'Süre biterse oyuncu yerine otomatik kart çekilir.',
    unlimited: 'Süresiz',
    sec: (n: number) => `${n} sn`,
    five: '5 farklı kedi',
    fiveHint: '5 farklı kedi kartını birlikte oynayan, ıskartadan istediği kartı alır.',
    on: 'Açık',
    off: 'Kapalı',
  },
  play: {
    you: 'sen',
    yourTurn: 'Sıra sende',
    turnOf: (nick: string) => `${nick} oynuyor`,
    turnsLeft: (n: number) => (n > 1 ? `${n} tur oynayacak` : ''),
    myTurnsLeft: (n: number) => (n > 1 ? `Art arda ${n} tur oynaman gerekiyor.` : 'İstediğin kadar kart oyna, sonra bir kart çek.'),
    deck: (n: number) => `${n} kart`,
    deckLabel: 'Deste',
    discardLabel: 'Iskarta',
    emptyDiscard: 'Boş',
    draw: 'Kart çek ve sırayı bitir',
    selectHint: 'Oynamak için kart seç. Aynı kediden 2 ya da 3 tane seçebilirsin.',
    playAs: (name: string) => `${name} oyna`,
    chooseTarget: 'Kimden?',
    chooseNamed: 'Hangi kartı istiyorsun?',
    clear: 'Seçimi temizle',
    cards: (n: number) => `${n} kart`,
    out: 'patladı',
    left: 'Oyunda değilsin; izliyorsun.',
    spectator: 'Bu oyunu izliyorsun.',
    hand: 'Elin',
    handEmpty: 'Elinde kart yok.',
    timer: (s: number) => `${s} sn`,
    hostSkip: (nick: string) => `${nick} yerine kart çek`,
    hostSkipHint: 'Bağlantısı koptu. Sırası, onun yerine kart çekilerek geçer.',
    invalid: 'Bu kartlar birlikte oynanmaz.',
    log: 'Olanlar',
    error: 'Hamle gönderilemedi. Bağlantını kontrol et.',
    // Hayır penceresi
    pendingTitle: (by: string, action: string, target: string | null) =>
      target ? `${by}, ${target} için ${action} oynadı` : `${by} ${action} oynadı`,
    pendingNamed: (name: string) => `İstenen kart: ${name}`,
    willHappen: 'Kimse durdurmazsa olacak',
    willCancel: 'Şimdilik durduruldu',
    nopeCount: (n: number) => (n === 1 ? '1 Hayır' : `${n} Hayır`),
    nopeBtn: 'Hayır!',
    noNope: 'Elinde Hayır yok.',
    // Bomba
    bombMe: 'Bomba çektin!',
    bombMeHint: 'Elinde Etkisiz Kıl var. Oyna, yoksa süre bitince otomatik oynanır.',
    defuseBtn: 'Etkisiz Kıl’ı oyna',
    bombOther: (nick: string) => `${nick} bomba çekti!`,
    bombOtherHint: 'Etkisiz kılıyor…',
    placeMe: 'Bombayı nereye koyacaksın?',
    placeHint: 'Konumu yalnızca sen bileceksin. Süre bitince rastgele bir yere konur.',
    placeTop: 'En üste',
    placeBottom: 'En alta',
    placeRandom: 'Rastgele',
    placeAt: (n: number) => `Üstten ${n}.`,
    placeBtn: (label: string) => `${label} koy`,
    placeOther: (nick: string) => `${nick} bombayı gizlice desteye geri koyuyor.`,
    myBomb: (i: number) => (i === 0 ? 'Koyduğun bomba şu an en üstte.' : `Koyduğun bomba şu an üstten ${i + 1}. sırada.`),
    boom: (nick: string) => `${nick} patladı!`,
    boomMe: 'Patladın!',
    boomHint: 'Elindeki kartlar ıskartaya gitti.',
    defused: (nick: string) => `${nick} bombayı etkisiz kıldı`,
    // Geleceği gör
    futureTitle: 'Destenin üstü',
    futureHint: 'Yalnızca sen görüyorsun. Soldaki ilk çekilecek kart.',
    futureSlot: (i: number) => (i === 0 ? 'Sıradaki' : `${i + 1}.`),
    futureClose: 'Tamam',
    futureAgain: 'Gördüğün kartlar',
    // İyilik
    favorMe: (nick: string) => `${nick} senden bir kart istiyor`,
    favorMeHint: 'Vereceğin kartı elinden seç. Süre bitince rastgele biri gider.',
    giveBtn: (name: string) => `${name} ver`,
    favorOther: (from: string, to: string) => `${to}, ${from} için bir kart seçiyor.`,
    // Iskartadan seç
    pickMe: 'Iskartadan bir kart al',
    pickHint: 'Süre bitince rastgele biri seçilir.',
    pickOther: (nick: string) => `${nick} ıskartadan bir kart seçiyor.`,
  },
  log: (e: LogEntry, nick: Nick): string => {
    const k = e.kind ? CARD_NAME[e.kind] : null;
    switch (e.t) {
      case 'start':
        return e.n === 2 ? 'Oyun başladı. İki deste birleştirildi.' : 'Oyun başladı.';
      case 'turn':
        return e.n && e.n > 1 ? `${nick(e.by)} art arda ${e.n} tur oynayacak.` : `${nick(e.by)} oynuyor.`;
      case 'play': {
        const a = e.action ? ACTION_NAME[e.action] : '';
        if (e.action === 'triple' && k) return `${nick(e.by)}, ${nick(e.to)} oyuncusundan ${k} istiyor (${a}).`;
        return e.to ? `${nick(e.by)}, ${nick(e.to)} için ${a} oynadı.` : `${nick(e.by)} ${a} oynadı.`;
      }
      case 'nope':
        return `${nick(e.by)} Hayır dedi.`;
      case 'cancelled':
        return `${nick(e.by)} oyuncusunun ${e.action ? ACTION_NAME[e.action] : 'eylemi'} durduruldu.`;
      case 'draw':
        return k ? `${nick(e.by)} kart çekti: ${k}.` : `${nick(e.by)} kart çekti.`;
      case 'bomb':
        return `${nick(e.by)} bomba çekti!`;
      case 'defuse':
        return `${nick(e.by)} bombayı etkisiz kıldı.`;
      case 'placed':
        return `${nick(e.by)} bombayı desteye gizlice geri koydu.`;
      case 'boom':
        return `${nick(e.by)} patladı ve oyundan çıktı.`;
      case 'future':
        return `${nick(e.by)} destenin üstündeki 3 karta baktı.`;
      case 'shuffle':
        return `${nick(e.by)} desteyi karıştırdı.`;
      case 'favorGive':
        return k ? `${nick(e.by)}, ${nick(e.to)} oyuncusuna ${k} verdi.` : `${nick(e.by)}, ${nick(e.to)} oyuncusuna bir kart verdi.`;
      case 'steal':
        return k ? `${nick(e.by)}, ${nick(e.to)} oyuncusundan ${k} çaldı.` : `${nick(e.by)}, ${nick(e.to)} oyuncusundan bir kart çaldı.`;
      case 'named':
        return e.ok ? `${nick(e.by)}, ${nick(e.to)} oyuncusundan ${k} aldı.` : `${nick(e.to)} oyuncusunda ${k} yokmuş.`;
      case 'pick':
        return `${nick(e.by)} ıskartadan ${k} aldı.`;
      case 'empty':
        return `${nick(e.by)} oyuncusunun ${e.action ? ACTION_NAME[e.action] : 'eylemi'} boşa gitti.`;
      case 'timeout':
        return `${nick(e.by)} oyuncusunun süresi doldu; onun yerine kart çekildi.`;
      case 'hostSkip':
        return `Oda sahibi ${nick(e.by)} yerine kart çekti.`;
      case 'left':
        return `${nick(e.by)} odadan ayrıldı.`;
    }
  },
  podium: {
    title: 'Oyun bitti',
    winner: (nick: string) => `${nick} hayatta kaldı`,
    none: 'Oyun erken bitirildi',
    order: 'Patlama sırası',
    alive: 'hayatta',
    back: 'Lobiye dönülüyor…',
  },
  howto: {
    title: 'Nasıl oynanır',
    steps: [
      ['Dağıtım', 'Herkes 1 Etkisiz Kıl ve 7 kartla başlar. Destede oyuncu sayısının bir eksiği kadar bomba var.'],
      ['Sıran', 'İstediğin kadar kart oyna ya da hiç oynama. Sıran, desteden bir kart çekince biter.'],
      ['Bomba', 'Bomba çekersen Etkisiz Kıl oynarsın ve bombayı desteye istediğin yere gizlice koyarsın. Etkisiz Kıl yoksa patlarsın.'],
      ['Hayır', 'Bir eylem oynanınca kısa bir geri sayım başlar. Bu sürede herkes Hayır oynayabilir. Çift sayıda Hayır eylemi geri getirir.'],
      ['Kazanan', 'Patlamayan son oyuncu kazanır.'],
    ] as [string, string][],
    cardsTitle: 'Kartlar',
    cats: 'Kedi kartları',
    catsText: 'Aynı kediden 2 tane: seçtiğin oyuncudan rastgele kart çal. 3 tane: bir kart adı söyle, onda varsa senin olur.',
    five: '5 farklı kedi birlikte oynanırsa ıskartadan istediğin kartı alırsın.',
  },
};
