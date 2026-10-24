/**
 * Secret Hitler copy, copied from games/secret-hitler/client/strings.ts (the reels package does not depend on the game).
 * Only the lines the ad screens draw; keep them byte-identical to the game when the game changes.
 * Rules from games/secret-hitler/shared/index.ts (track powers, limits).
 */

export type ShRole = 'liberal' | 'fascist' | 'hitler';
export type ShParty = 'liberal' | 'fascist';
export type ShPolicy = 'liberal' | 'fascist';
export type ShPower = 'peek' | 'investigate' | 'specialElection' | 'execution';
export type ShPhase = 'nominate' | 'vote' | 'presidentLegislate' | 'chancellorLegislate' | 'power' | 'over';
export type ShWinReason = 'liberalPolicies' | 'hitlerExecuted' | 'fascistPolicies' | 'hitlerChancellor' | 'ended';

export const LIBERAL_TO_WIN = 5;
export const FASCIST_TO_WIN = 6;
export const VETO_AT = 5;
export const HITLER_ZONE = 3;

/** shared/index.ts fascistTrack: the i-th power comes with the (i+1)-th fascist policy. */
export function fascistTrack(playerCount: number): (ShPower | null)[] {
  if (playerCount <= 6) return [null, null, 'peek', 'execution', 'execution', null];
  if (playerCount <= 8) return [null, 'investigate', 'specialElection', 'execution', 'execution', null];
  return ['investigate', 'investigate', 'specialElection', 'execution', 'execution', null];
}

/** 5–6 players: Hitler knows the fascist; 7+: does not. */
export const hitlerKnowsFascists = (playerCount: number) => playerCount <= 6;

export const SH_TEXT = {
  name: 'Secret Hitler',
  /** Room code the design artboard shows top right. */
  code: 'ODAK',
  role: { liberal: 'Liberal', fascist: 'Faşist', hitler: 'Hitler' } satisfies Record<ShRole, string>,
  party: { liberal: 'Liberal', fascist: 'Faşist' } satisfies Record<ShParty, string>,
  policy: { liberal: 'Liberal', fascist: 'Faşist' } satisfies Record<ShPolicy, string>,
  power: {
    peek: 'Politika önizleme',
    investigate: 'Sadakat sorgulama',
    specialElection: 'Özel seçim',
    execution: 'İdam',
  } satisfies Record<ShPower, string>,
  powerHint: {
    peek: 'Başkan destenin üstündeki 3 kartı görür.',
    investigate: 'Başkan bir oyuncunun partisini öğrenir.',
    specialElection: 'Başkan sıradaki başkanı seçer.',
    execution: 'Başkan bir oyuncuyu oyundan çıkarır.',
  } satisfies Record<ShPower, string>,
  play: {
    you: 'sen',
    president: 'Başkan',
    chancellor: 'Şansölye',
    nominee: 'Aday',
    dead: 'İdam edildi',
    deadShort: 'İdam',
    voted: 'Oy verdi',
    ja: 'Ja!',
    nein: 'Nein',
    roleHold: 'Rolünü görmek için basılı tut',
    roleHoldHint: 'Yanındakiler görmesin diye yalnızca basılıyken açılır.',
    roleTeam: 'Takım arkadaşların',
    roleLiberal: 'Liberal yasaları çıkar ya da Hitler’i idam et. Kimin ne olduğunu bilmiyorsun.',
    roleFascist: 'Görevin 6 faşist yasa çıkarmak ya da 3 faşist yasadan sonra Hitler’i şansölye seçtirmek.',
    roleHitlerBlind: 'Faşistler seni tanıyor ama sen onları tanımıyorsun. Güven kazan, şansölye seçil.',
    roleHitlerKnows: 'Görevin 3 faşist yasadan sonra şansölye seçilmek. Liberal gibi davran.',
    investigations: 'Sorgulama sonuçların',
    liberalTrack: 'Liberal yasalar',
    trackCount: (label: string, n: number, max: number) => `${label} · ${n}/${max}`,
    pileInfo: (deck: number, discard: number) => `Deste ${deck} · Iskarta ${discard}`,
    fascistTrack: 'Faşist yasalar',
    hitlerZone: '3 faşist yasadan sonra Hitler şansölye seçilirse faşistler kazanır.',
    vetoZone: '5 faşist yasadan sonra veto açılır.',
    tracker: 'Seçim sayacı',
    // Aday gösterme
    nominateTitle: 'Şansölye adayını seç',
    waitNominate: (nick: string) => `${nick} şansölye adayını seçiyor.`,
    // Oylama
    voteTitle: (p: string, c: string) => `Başkan ${p}, şansölye ${c} olsun mu?`,
    voteHint: 'Oylar herkes oy verince birlikte açılır.',
    roleOpen: (role: string, blurb: string) => `${role} · ${blurb}`,
    voteMine: (v: string) => `${v} dedin; herkes oy verene kadar değiştirebilirsin.`,
    voteProgress: (done: number, total: number) => `${done}/${total} oy verildi`,
    voteResult: (passed: boolean) => (passed ? 'Hükümet kuruldu' : 'Hükümet kurulamadı'),
    // Yasama
    silence: 'Yasama sırasında başkan ve şansölye kartlar hakkında konuşmaz, işaret vermez. Sonrasında istediklerini söyleyebilirler; yalan da serbest.',
    presidentTitle: 'Atılacak kartı seç',
    presidentHint: 'Kalan iki kart şansölyeye gider.',
    discardThis: 'Bu kartı at',
    chancellorTitle: 'Yasalaşacak kartı seç',
    chancellorHint: 'Diğer kart ıskartaya gider.',
    enactThis: 'Bu yasayı çıkar',
    veto: 'Veto öner',
    vetoHint: 'Başkan kabul ederse iki kart da atılır ve seçim sayacı ilerler.',
    waitPresident: (nick: string) => `Başkan ${nick} kartlara bakıyor.`,
    waitChancellor: (nick: string) => `Şansölye ${nick} yasayı seçiyor.`,
    // Yetkiler
    investigateTitle: 'Kimin partisini öğrenmek istiyorsun?',
    investigateHint: 'Sonucu yalnızca sen görürsün. Hitler faşist görünür. Daha önce sorgulanan seçilemez.',
    specialTitle: 'Sıradaki başkanı seç',
    specialHint: 'Bu hükümetten sonra sıra senin solundan devam eder.',
    executionTitle: 'Kimi idam ediyorsun?',
    executionHint: 'İdam edilen Hitler’se liberaller kazanır. Değilse rolü açıklanmaz.',
    peekTitle: 'Destenin üstündeki 3 kart',
    peekHint: 'Sıradaki yasalar bu sırayla çekilecek. Ne gördüğünü söyleyip söylememek sana kalmış.',
    peekDone: 'Gördüm, devam et',
    waitPower: (nick: string, power: string) => `Başkan ${nick}: ${power.toLocaleLowerCase('tr-TR')}.`,
    // Sonuç
    reason: {
      liberalPolicies: '5 liberal yasa çıktı.',
      hitlerExecuted: 'Hitler idam edildi.',
      fascistPolicies: '6 faşist yasa çıktı.',
      hitlerChancellor: 'Hitler şansölye seçildi.',
      ended: 'Oda sahibi oyunu bitirdi.',
    } satisfies Record<ShWinReason, string>,
    backIn: (sec: number) => `Lobiye dönülüyor… · ${sec} sn`,
    gameOver: 'Oyun bitti',
    winnerTitle: { liberal: 'Liberaller kazandı!', fascist: 'Faşistler kazandı!' } satisfies Record<ShParty, string>,
    sideLiberal: 'Liberaller',
    sideFascist: 'Faşistler',
  },
  phase: {
    nominate: 'Aday gösterme',
    vote: 'Oylama',
    presidentLegislate: 'Yasama',
    chancellorLegislate: 'Yasama',
    power: 'Yürütme yetkisi',
    over: 'Oyun bitti',
  } satisfies Record<ShPhase, string>,
} as const;

/** Uppercase the way the game's `text-transform: uppercase` renders under lang="tr" (i → İ). */
export const trUpper = (t: string) => t.toLocaleUpperCase('tr-TR');
