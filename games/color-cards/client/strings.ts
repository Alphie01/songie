import type { CardColor, CardValue, LogEntry } from '../shared/index.js';

export const COLOR_NAME: Record<CardColor, string> = {
  green: 'Yeşil',
  yellow: 'Sarı',
  red: 'Kırmızı',
  purple: 'Mor',
};

export const VALUE_NAME: Record<CardValue, string> = {
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
  skip: 'Atla',
  reverse: 'Yön değiştir',
  draw2: '+2',
  wild: 'Renk seç',
  wild4: 'Renk seç +4',
};

export function cardName(c: { color: CardColor | null; value: CardValue }): string {
  if (!c.color) return VALUE_NAME[c.value];
  return `${COLOR_NAME[c.color]} ${VALUE_NAME[c.value]}`;
}

type Nick = (id: string | undefined) => string;

export const s = {
  name: 'Renk Renk',
  pitch: 'Rengi ya da sayıyı eşle, elini ilk sen bitir',
  settings: {
    readOnly: 'Ayarları oda sahibi seçer.',
    mode: 'Kazanma',
    single: 'Tek el',
    points: '500 puan',
    modeHint: (single: boolean) =>
      single
        ? 'Elini ilk bitiren oyunu kazanır.'
        : 'Eli bitiren, rakiplerin elindeki kartların puanını alır. 500’e ilk ulaşan kazanır.',
    modeLocked: 'Kazanma şekli oyun başlarken sabitlenir.',
    turn: 'Tur süresi',
    turnHint: 'Süre dolarsa oyuncu yerine kart çekilir ve sıra geçer.',
    unlimited: 'Süresiz',
    sec: (n: number) => `${n} sn`,
    house: 'Ev kuralları',
    houseHint: 'Hepsi isteğe bağlı; kapalıyken resmî kurallar geçerli.',
    stacking: 'Ceza yığma',
    stackingHint: '+2 üstüne +2 ya da +4, +4 üstüne +4 konur; ceza birikir.',
    sevenZero: '7-0 kuralı',
    sevenZeroHint: '0 oynanınca herkes elini oyun yönündeki komşusuna verir; 7 oynayan seçtiği oyuncuyla el değiştirir.',
    drawUntil: 'Sınırsız çekme',
    drawUntilHint: 'Oynanabilir kart gelene kadar çekilir.',
  },
  play: {
    you: 'sen',
    yourTurn: 'Sıra sende',
    turnOf: (nick: string) => `Sıra ${nick}’de`,
    spectator: 'Bu oyunu izliyorsun.',
    round: (n: number) => `${n}. el`,
    deck: 'Deste',
    activeColor: 'Etkin renk',
    dirCw: 'Yön: saat yönü',
    dirCcw: 'Yön: saat yönünün tersi',
    hand: 'Elin',
    cardCount: (n: number) => `${n} kart`,
    myTurn: 'Rengi ya da sayıyı eşleyen bir kart oyna. Uyan kartın yoksa kart çek.',
    myTurnPenalty: (n: number) => `Üstüne +2 ya da +4 koy, ya da ${n} kart çek.`,
    afterDraw: 'Çektiğin kart oynanabilir. Oyna ya da elinde tutup sırayı geçir.',
    otherTurn: (nick: string) => `${nick} düşünüyor…`,
    otherPenalty: (nick: string, n: number) => `${nick} ya üstüne koyacak ya da ${n} kart çekecek.`,
    draw: 'Kart çek',
    takePenalty: (n: number) => `${n} kart çek`,
    pass: 'Tut ve sırayı geçir',
    lastCard: 'Son kart!',
    lastCardDone: 'Son kart dedin',
    lastCardHint: 'Elinde 1 kart kalınca söylemezsen yakalanıp 2 kart çekebilirsin.',
    catchBtn: (nick: string) => `Yakaladım! ${nick} söylemedi`,
    exposedMe: 'Son kartını söylemedin! Yakalanmadan “Son kart!” de.',
    calledBadge: 'son kart',
    chooseColor: 'Renk seç',
    chooseColorFor: (card: string) => `${card} için renk seç`,
    chooseSwap: '7: elini kiminle değiştireceksin?',
    cancel: 'Vazgeç',
    bluffWarn: 'Elinde bu renkte kart var. İtiraz edilirse 4 kartı sen çekersin.',
    startColorMe: 'Açılış kartı Renk seç. Başlangıç rengini sen seç.',
    startColorOther: (nick: string) => `${nick} başlangıç rengini seçiyor.`,
    hostSkip: (nick: string) => `${nick} yerine çek`,
    hostSkipHint: 'Bağlantısı koptu. Sırası, onun yerine kart çekilerek geçer.',
    log: 'Olanlar',
    rules: 'Bu masada',
    noHouse: 'Resmî kurallar, ev kuralı yok.',
    error: 'Hamle gönderilemedi. Bağlantını kontrol et.',
    // +4 itirazı
    challengeTitle: (by: string) => `${by} Renk seç +4 oynadı`,
    challengeHint: (n: number) =>
      `Elinde o renkte kart varken oynadıysa hile yaptı. İtiraz haklıysa ${n} kartı o çeker; haksızsa sen ${n + 2} kart çekersin.`,
    challengeStackHint: 'Ya da elindeki +4’ü koyup cezayı sıradakine devret.',
    challengeBtn: 'Hile! İtiraz et',
    acceptBtn: (n: number) => `Kabul et, ${n} kart çek`,
    challengeOther: (victim: string, by: string) => `${victim}, ${by}’in +4’üne itiraz edecek mi?`,
    revealTitle: (nick: string) => `${nick}’in eli`,
    revealGuilty: 'Hile yakalandı! Elinde o renkte kart vardı.',
    revealClean: 'Temiz çıktı. Elinde o renkte kart yoktu.',
    close: 'Kapat',
    // El sonu
    roundOverTitle: (nick: string) => `${nick} elini bitirdi`,
    roundOverPoints: (n: number) => `${n} puan topladı`,
    nextRound: (sec: number) => `Yeni el ${sec} sn içinde`,
    scores: 'Puanlar',
    target: (n: number) => `Hedef ${n}`,
  },
  podium: {
    winner: (nick: string) => `${nick} kazandı`,
    none: 'Oyun bitti',
    order: 'Sıralama',
    back: 'Birazdan lobiye dönülüyor.',
    pts: (n: number) => `${n} puan`,
    cards: (n: number) => (n === 0 ? 'bitirdi' : `${n} kart`),
  },
  log(e: LogEntry, nick: Nick): string {
    const card = e.card ? cardName(e.card) : '';
    switch (e.t) {
      case 'start':
        return `${e.n} oyuncuyla oyun başladı.`;
      case 'round':
        return `${e.n}. el dağıtıldı. Dağıtan: ${nick(e.by)}.`;
      case 'firstCard':
        return `Açılış kartı: ${card}.`;
      case 'play':
        return e.color ? `${nick(e.by)} ${card} oynadı, ${COLOR_NAME[e.color].toLocaleLowerCase('tr')} seçti.` : `${nick(e.by)} ${card} oynadı.`;
      case 'draw':
        return e.n === 1 ? `${nick(e.by)} kart çekti.` : `${nick(e.by)} ${e.n} kart çekti.`;
      case 'penalty':
        return `${nick(e.by)} ${e.n} kart çekti ve sırası geçti.`;
      case 'pass':
        return `${nick(e.by)} kartı tuttu, sırayı geçirdi.`;
      case 'skipped':
        return `${nick(e.by)} atlandı.`;
      case 'reverse':
        return 'Yön değişti.';
      case 'color':
        return `${nick(e.by)} başlangıç rengini ${COLOR_NAME[e.color!].toLocaleLowerCase('tr')} seçti.`;
      case 'challengeWin':
        return `${nick(e.by)} itiraz etti ve haklı çıktı: ${nick(e.to)} ${e.n} kart çekti.`;
      case 'challengeLose':
        return `${nick(e.by)} itiraz etti ama haksız çıktı: ${e.n} kart çekti.`;
      case 'accept':
        return `${nick(e.by)} +4’ü kabul etti, ${e.n} kart çekti.`;
      case 'call':
        return `${nick(e.by)}: “Son kart!”`;
      case 'caught':
        return `${nick(e.by)}, ${nick(e.to)}’i yakaladı: ${e.n} kart cezası.`;
      case 'swap':
        return `${nick(e.by)} ve ${nick(e.to)} el değiştirdi.`;
      case 'rotate':
        return 'Bütün eller bir yana kaydı.';
      case 'reshuffle':
        return 'Deste bitti, ıskarta karıştırıldı.';
      case 'timeout':
        return `${nick(e.by)} için süre doldu.`;
      case 'hostSkip':
        return `Oda sahibi ${nick(e.by)} yerine oynadı.`;
      case 'left':
        return `${nick(e.by)} oyundan ayrıldı.`;
      case 'roundWin':
        return `${nick(e.by)} elini bitirdi!`;
    }
  },
};
