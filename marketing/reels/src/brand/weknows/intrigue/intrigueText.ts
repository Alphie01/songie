/**
 * Entrika copy, copied from games/intrigue/client/strings.ts (the reels package does not depend on the game).
 * Only the lines the ad screens draw; keep them byte-identical to the game when the game changes.
 * Rules (costs, which roles claim / block what) from games/intrigue/shared/index.ts.
 * Lines marked "artboard" come from Entrika.dc.html and are not in strings.ts.
 */

/** The game's own role ids (shared ROLES). */
export type InRole = 'treasurer' | 'assassin' | 'guard' | 'pirate' | 'spy';
export const IN_ROLES: InRole[] = ['treasurer', 'assassin', 'guard', 'pirate', 'spy'];

/** Coup names → Entrika ids: Duke = Hazinedar, Assassin = Fedai, Contessa = Muhafız, Captain = Korsan, Ambassador = Casus. */
export type CoupRole = 'duke' | 'assassin' | 'contessa' | 'captain' | 'ambassador';
export const IN_ROLE_FROM_COUP: Record<CoupRole, InRole> = {
  duke: 'treasurer',
  assassin: 'assassin',
  contessa: 'guard',
  captain: 'pirate',
  ambassador: 'spy',
};
/** Accepts either id set. */
export const inRole = (r: InRole | CoupRole): InRole => (r in IN_ROLE_FROM_COUP ? IN_ROLE_FROM_COUP[r as CoupRole] : (r as InRole));

export type InAction = 'income' | 'aid' | 'coup' | 'tax' | 'assassinate' | 'steal' | 'exchange';
/** PlayView ACTION_ORDER: everyone's actions, role actions, Darbe last. */
export const IN_ACTION_ORDER: InAction[] = ['income', 'aid', 'tax', 'assassinate', 'steal', 'exchange', 'coup'];
export type InLoseReason = 'challenge' | 'coup' | 'assassinate' | 'left';

export const COUP_COST = 7;
export const MUST_COUP_AT = 10;
export const ACTION_COST: Record<InAction, number> = { income: 0, aid: 0, coup: 7, tax: 0, assassinate: 3, steal: 0, exchange: 0 };
export const ACTION_ROLE: Record<InAction, InRole | null> = {
  income: null,
  aid: null,
  coup: null,
  tax: 'treasurer',
  assassinate: 'assassin',
  steal: 'pirate',
  exchange: 'spy',
};
export const BLOCK_ROLES: Record<InAction, InRole[]> = {
  income: [],
  aid: ['treasurer'],
  coup: [],
  tax: [],
  assassinate: ['guard'],
  steal: ['pirate', 'spy'],
  exchange: [],
};
export const TARGETED: Record<InAction, boolean> = {
  income: false,
  aid: false,
  coup: true,
  tax: false,
  assassinate: true,
  steal: true,
  exchange: false,
};

export const ROLE_NAME: Record<InRole, string> = {
  treasurer: 'Hazinedar',
  assassin: 'Fedai',
  guard: 'Muhafız',
  pirate: 'Korsan',
  spy: 'Casus',
};

export const ROLE_ABILITY: Record<InRole, string> = {
  treasurer: 'Vergi: +3 altın · Yardım isteği engeller',
  assassin: 'Suikast: 3 altın öde, hedef kart kaybeder',
  guard: 'Suikastı engeller',
  pirate: 'Çal: 2 altın al · Çalmayı engeller',
  spy: 'Değiş tokuş: 2 kart çek · Çalmayı engeller',
};

export const ACTION_NAME: Record<InAction, string> = {
  income: 'Gelir',
  aid: 'Yardım iste',
  coup: 'Darbe',
  tax: 'Vergi',
  assassinate: 'Suikast',
  steal: 'Çal',
  exchange: 'Değiş tokuş',
};

export const ACTION_FX: Record<InAction, string> = {
  income: '+1 altın · engellenemez',
  aid: '+2 altın',
  coup: '7 altın öde · engellenemez',
  tax: 'Hazinedar · +3 altın',
  assassinate: 'Fedai · 3 altın öde',
  steal: 'Korsan · 2 altın al',
  exchange: 'Casus · 2 kart çek',
};

export const LOSE_REASON: Record<InLoseReason, string> = {
  challenge: 'İtiraz sonucu bir kartını kaybediyorsun',
  coup: 'Darbeye uğradın: bir kartını kaybediyorsun',
  assassinate: 'Suikasta uğradın: bir kartını kaybediyorsun',
  left: 'Bir kartını kaybediyorsun',
};

/** Accepts an action id or its Turkish name. */
export const actionOf = (a: string): InAction | null =>
  a in ACTION_NAME ? (a as InAction) : ((Object.keys(ACTION_NAME) as InAction[]).find((k) => ACTION_NAME[k] === a) ?? null);

export const IN_TEXT = {
  name: 'Entrika',
  /** Artboard: the viewer as the target in the window title ("Mert, senin üzerinde …"). */
  youTarget: 'senin',
  /** Artboard: the viewer as the loser in the reveal hint ("Sen bir kart kaybediyorsun …"). */
  youLoser: 'Sen',
  /** Artboard: "Destede 7 kart". */
  deckDefault: 7,
  /** Room code shown top right on game over (same placeholder as the other We Knows ad screens). */
  code: 'ODAK',
  play: {
    you: 'sen',
    yourTurn: 'Sıra sende',
    yourTurnLeft: (sec: number) => `Sıra sende · ${sec} sn`,
    ok: 'Tamam',
    passedMark: 'geçti',
    decidingMark: 'karar veriyor',
    turnOf: (nick: string) => `Sıra: ${nick}`,
    out: 'elendi',
    coins: (n: number) => `${n} altın`,
    deck: (n: number) => `Destede ${n} kart`,
    thinking: (nick: string) => `${nick} eylemini seçiyor.`,
    chooseAction: 'Eylemini seç',
    mustCoup: '10 ya da daha fazla altının var: bu turda Darbe yapmak zorundasın.',
    needCoins: (n: number) => `${n} altın gerekli`,
    mustCoupReason: 'Önce Darbe',
    chooseTarget: 'Hedef seç',
    confirm: (action: string, target: string | null) => (target ? `${action}: ${target}` : action),
    windowClaim: (actor: string, action: string, target: string | null) =>
      target ? `${actor}, ${target} üzerinde ${action} yapmak istiyor` : `${actor} ${action} yapmak istiyor`,
    windowClaimRole: (role: string) => `${role} olduğunu söylüyor. İnanmıyorsan “Yalan!” de.`,
    windowAid: (actor: string) => `${actor} yardım istiyor (+2 altın)`,
    windowAidHint: 'Hazinedar olduğunu söyleyen herkes engelleyebilir.',
    lie: 'Yalan!',
    pass: 'Geç',
    blockAs: (role: string) => `${role} olarak engelle`,
    passed: 'Geçtin; diğerleri bekleniyor.',
    waiting: 'Diğer oyuncuların kararı bekleniyor.',
    passedList: (n: number, total: number) => `${n}/${total} geçti`,
    /** Artboard status after blocking (not in strings.ts). */
    blockedMine: (role: string, actor: string) => `${role} olarak engelledin. ${actor}’in itirazı bekleniyor.`,
    loseMeTitle: 'Bir kartını kaybediyorsun',
    loseMeHint: 'Hangi rolü açacağını sen seç. Süre biterse rastgele biri açılır.',
    loseBtn: (role: string) => `${role} kartını aç`,
    hand: 'Elin',
    noHand: 'Elinde kart kalmadı.',
    flashTrue: (claimant: string, role: string) => `${claimant} gerçekten ${role}`,
    flashFalse: (claimant: string, role: string) => `${claimant} ${role} değilmiş`,
    flashTrueHint: (challenger: string) => `${challenger} bir kart kaybediyor. Gösterilen kart desteye karıştı, yerine yenisi çekildi.`,
    /** Artboard: the viewer lost the challenge (second person; strings.ts only has the third-person line above). */
    flashTrueHintMe: 'Sen bir kart kaybediyorsun. Gösterilen kart desteye karıştı, yerine yenisi çekildi.',
    flashFalseHint: 'Blöf yakalandı: iddia eden bir kart kaybediyor.',
  },
  podium: {
    none: 'Oyun bitti',
    title: 'Sarayda son ayakta kalan',
    back: 'Lobiye dönülüyor…',
    gameOver: 'Oyun bitti',
    winnerTitle: (nick: string) => `${nick} kazandı!`,
    place: (n: number) => `${n}.`,
  },
};

export const trUpper = (t: string) => t.toLocaleUpperCase('tr-TR');
