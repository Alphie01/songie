import type { ActionKind, LogEntry, LoseReason, Role } from '../shared/index.js';

export const ROLE_NAME: Record<Role, string> = {
  treasurer: 'Hazinedar',
  assassin: 'Fedai',
  guard: 'Muhafız',
  pirate: 'Korsan',
  spy: 'Casus',
};

/** Rolün tek satırlık özeti (kartın altında ve rol tablosunda). */
export const ROLE_ABILITY: Record<Role, string> = {
  treasurer: 'Vergi: hazineden 3 altın al. Yardım isteyeni engeller.',
  assassin: 'Suikast: 3 altın öde, bir oyuncu kart kaybetsin.',
  guard: 'Suikastı engeller.',
  pirate: 'Çal: bir oyuncudan 2 altın al. Çalmayı engeller.',
  spy: 'Değiş tokuş: desteden 2 kart çek, istediğin 2’yi sakla. Çalmayı engeller.',
};

/** Rol tablosu: rolün eylemi ve engellediği eylem. */
export const ROLE_ACTION: Record<Role, string> = {
  treasurer: 'Vergi: +3 altın',
  assassin: 'Suikast: 3 altın öde, hedef kart kaybeder',
  guard: '—',
  pirate: 'Çal: hedeften 2 altın al',
  spy: 'Değiş tokuş: 2 kart çek, istediklerini sakla',
};

export const ROLE_BLOCKS: Record<Role, string> = {
  treasurer: 'Yardım iste',
  assassin: '—',
  guard: 'Suikast',
  pirate: 'Çal',
  spy: 'Çal',
};

export const ACTION_NAME: Record<ActionKind, string> = {
  income: 'Gelir',
  aid: 'Yardım iste',
  coup: 'Darbe',
  tax: 'Vergi',
  assassinate: 'Suikast',
  steal: 'Çal',
  exchange: 'Değiş tokuş',
};

export const ACTION_EFFECT: Record<ActionKind, string> = {
  income: '+1 altın. Engellenemez.',
  aid: '+2 altın. Hazinedar engelleyebilir.',
  coup: '7 altın öde, hedef kart kaybeder. Engellenemez.',
  tax: '+3 altın.',
  assassinate: '3 altın öde, hedef kart kaybeder. Muhafız engeller.',
  steal: 'Hedeften 2 altın al. Korsan ya da Casus engeller.',
  exchange: 'Desteden 2 kart çek, istediğin kartları sakla.',
};

export const LOSE_REASON: Record<LoseReason, string> = {
  challenge: 'İtiraz sonucu bir kartını kaybediyorsun',
  coup: 'Darbeye uğradın: bir kartını kaybediyorsun',
  assassinate: 'Suikasta uğradın: bir kartını kaybediyorsun',
  left: 'Bir kartını kaybediyorsun',
};

type Nick = (id: string | undefined) => string;

export const s = {
  name: 'Entrika',
  pitch: 'Saraydaki rolünü sakla, blöf yap, son ayakta kalan ol',
  settings: {
    readOnly: 'Ayarları oda sahibi seçer.',
    deck: 'Deste',
    deckHint: (n: number, big: boolean) =>
      big || n > 6
        ? `Her rolden 4 kart, toplam 20. ${n > 6 ? '7–10 kişide kendiliğinden açılır.' : ''}`.trim()
        : `Her rolden 3 kart, toplam 15. 7–10 kişide her rolden 4 kart kullanılır.`,
    bigDeck: 'Rol başına 4 kart',
    challenge: 'İtiraz süresi',
    challengeHint: 'Bir rol iddia edilince herkesin “Yalan!” diyebileceği ya da engelleyebileceği süre. Herkes geçerse erken kapanır.',
    turn: 'Tur süresi',
    turnHint: 'Süre biterse oyuncu yerine Gelir alınır (10+ altında rastgele birine Darbe).',
    unlimited: 'Süresiz',
    sec: (n: number) => `${n} sn`,
    on: 'Açık',
    off: 'Kapalı',
  },
  play: {
    you: 'sen',
    yourTurn: 'Sıra sende',
    turnOf: (nick: string) => `Sıra: ${nick}`,
    spectator: 'İzliyorsun',
    eliminated: 'Elendin, izlemeye devam edebilirsin',
    out: 'elendi',
    coins: (n: number) => `${n} altın`,
    deck: (n: number) => `Destede ${n} kart`,
    thinking: (nick: string) => `${nick} eylemini seçiyor.`,
    chooseAction: 'Eylemini seç',
    mustCoup: '10 ya da daha fazla altının var: bu turda Darbe yapmak zorundasın.',
    needCoins: (n: number) => `${n} altın gerekli`,
    mustCoupReason: 'Önce Darbe',
    claims: (role: string) => `${role} iddiası`,
    chooseTarget: 'Hedef seç',
    confirm: (action: string, target: string | null) => (target ? `${action}: ${target}` : action),
    cancel: 'Vazgeç',
    // Pencere
    windowClaim: (actor: string, action: string, target: string | null) =>
      target ? `${actor}, ${target} üzerinde ${action} yapmak istiyor` : `${actor} ${action} yapmak istiyor`,
    windowClaimRole: (role: string) => `${role} olduğunu söylüyor. İnanmıyorsan “Yalan!” de.`,
    windowAid: (actor: string) => `${actor} yardım istiyor (+2 altın)`,
    windowAidHint: 'Hazinedar olduğunu söyleyen herkes engelleyebilir.',
    windowBlockOnly: (target: string) => `${target} hâlâ engelleyebilir`,
    windowCounter: (blocker: string, role: string) => `${blocker} ${role} olarak engelliyor`,
    windowCounterHint: 'İnanmıyorsan “Yalan!” de; yoksa eylem engellenir.',
    lie: 'Yalan!',
    pass: 'Geç',
    blockAs: (role: string) => `${role} olarak engelle`,
    passed: 'Geçtin; diğerleri bekleniyor.',
    waiting: 'Diğer oyuncuların kararı bekleniyor.',
    noSay: 'Bu pencerede söz hakkın yok.',
    passedList: (n: number, total: number) => `${n}/${total} geçti`,
    // Kart kaybı
    loseMeTitle: 'Bir kartını kaybediyorsun',
    loseMeHint: 'Hangi rolü açacağını sen seç. Süre biterse rastgele biri açılır.',
    loseBtn: (role: string) => `${role} kartını aç`,
    loseOther: (nick: string) => `${nick} açacağı kartı seçiyor.`,
    // Değiş tokuş
    exMeTitle: 'Değiş tokuş',
    exMeHint: (n: number) => `Saklamak istediğin ${n} kartı seç; kalanlar desteye karışır. Süre biterse elindekiler kalır.`,
    exBtn: (n: number, chosen: number) => (chosen === n ? 'Bu kartları sakla' : `${n - chosen} kart daha seç`),
    exOther: (nick: string) => `${nick} desteden çektiği kartlara bakıyor.`,
    drawn: 'yeni',
    // El
    hand: 'Elin',
    revealedMine: 'Açılan kartların',
    noHand: 'Elinde kart kalmadı.',
    // Oda sahibi
    hostDefaultHint: 'Bağlantısı kopan oyuncu bekleniyor.',
    hostDefault: 'Yerine varsayılanı uygula',
    // İtiraz sonucu
    flashTrue: (claimant: string, role: string) => `${claimant} gerçekten ${role}`,
    flashFalse: (claimant: string, role: string) => `${claimant} ${role} değilmiş`,
    flashTrueHint: (challenger: string) => `${challenger} bir kart kaybediyor. Gösterilen kart desteye karıştı, yerine yenisi çekildi.`,
    flashFalseHint: 'Blöf yakalandı: iddia eden bir kart kaybediyor.',
    error: 'Bağlantı sorunu. Tekrar dene.',
    log: 'Olaylar',
    secs: (n: number) => `${n}`,
  },
  log(e: LogEntry, nick: Nick): string {
    const by = nick(e.by);
    const to = nick(e.to);
    const role = e.role ? ROLE_NAME[e.role] : '';
    const action = e.action ? ACTION_NAME[e.action] : '';
    switch (e.t) {
      case 'start':
        return `Oyun başladı, her rolden ${e.n} kart.`;
      case 'turn':
        return `Sıra: ${by}.`;
      case 'act':
        if (e.action === 'income') return `${by} Gelir aldı.`;
        if (e.to) return `${by} → ${to}: ${action}${role ? ` (${role} iddiası)` : ''}.`;
        return `${by}: ${action}${role ? ` (${role} iddiası)` : ''}.`;
      case 'block':
        return `${by}, ${role} olarak engelledi.`;
      case 'challenge':
        return e.ok ? `${by} “Yalan!” dedi ama ${to} ${role} kartını gösterdi.` : `${by} “Yalan!” dedi: ${to} ${role} değildi.`;
      case 'lose':
        return `${by} ${role} kartını açtı.`;
      case 'out':
        return `${by} elendi.`;
      case 'done':
        if (e.action === 'income') return `${by} +1 altın.`;
        if (e.action === 'aid') return `${by} +2 altın aldı.`;
        if (e.action === 'tax') return `${by} vergiyle +3 altın aldı.`;
        if (e.action === 'steal') return `${by} → ${to}: ${e.n} altın çalındı.`;
        if (e.action === 'exchange') return `${by} desteden ${e.n} kart çekti.`;
        if (e.action === 'coup') return `${by} → ${to}: Darbe.`;
        if (e.action === 'assassinate') return `${by} → ${to}: Suikast gerçekleşiyor.`;
        return `${by}: ${action}.`;
      case 'blocked':
        return `${action} engellendi (${to}).`;
      case 'failed':
        return `${action} başarısız oldu (${by}).`;
      case 'timeout':
        return `Süre doldu (${by}).`;
      case 'hostDefault':
        return `Oda sahibi varsayılanı uyguladı (${by}).`;
      case 'left':
        return `${by} odadan ayrıldı.`;
    }
  },
  howto: {
    title: 'Nasıl oynanır',
    steps: [
      ['Amaç', 'Herkesin 2 gizli rol kartı ve 2 altını var. İki kartı da açılan elenir; son kalan kazanır.'],
      ['Sıran gelince', 'Bir eylem seç. Gelir, Yardım iste ve Darbe herkese açık; diğerleri bir rol iddia eder. Elinde o rol olmasa da iddia edebilirsin.'],
      ['Yalan!', 'Rol iddia edilince herkes itiraz edebilir. İddia eden kartı gösterebilirse itiraz eden kart kaybeder; gösteremezse iddia eden kart kaybeder ve eylemi boşa gider.'],
      ['Engelle', 'Bazı eylemler rolle engellenir. Engel de bir iddiadır: ona da “Yalan!” denebilir.'],
      ['Altın', '7 altınla Darbe yapabilirsin; 10 ya da daha fazla altınla turunda Darbe zorunlu. Suikastın 3 altını engellense de geri gelmez.'],
    ] as [string, string][],
    roles: 'Roller',
    actions: 'Herkesin yapabildikleri',
    role: 'Rol',
    action: 'Eylem',
    blocks: 'Engeller',
  },
  podium: {
    winner: (nick: string) => `${nick} kazandı`,
    none: 'Oyun bitti',
    title: 'Sarayda son ayakta kalan',
    order: 'Sıralama',
    alive: 'ayakta',
    back: 'Birazdan lobiye dönülecek.',
  },
};
