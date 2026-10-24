/**
 * Kurt Adam copy, copied from games/werewolf/client/strings.ts (the reels package does not depend on the game).
 * Only the lines the ad screens draw; keep them byte-identical to the game when the game changes.
 */

export type KurtRole = 'wolf' | 'villager' | 'seer' | 'doctor' | 'hunter' | 'witch' | 'cupid' | 'fool';
export type KurtStep = 'cupid' | 'wolves' | 'seer' | 'doctor' | 'witch';
export type KurtReason = 'wolvesDead' | 'wolvesParity' | 'foolHanged' | 'loversLast' | 'ended';

export const KURT_TEXT = {
  name: 'Kurt Adam',
  /** Room code the design artboard shows top right. */
  code: 'ODAK',

  role: {
    wolf: 'Kurt Adam',
    villager: 'Köylü',
    seer: 'Kahin',
    doctor: 'Doktor',
    hunter: 'Avcı',
    witch: 'Cadı',
    cupid: 'Aşk okçusu',
    fool: 'Köyün delisi',
  } satisfies Record<KurtRole, string>,
  roleBlurb: {
    wolf: 'Her gece diğer kurtlarla birlikte bir kurban seçersin. Gündüz köylü gibi davran; sayınız köylülere eşit olunca kazanırsınız.',
    villager: 'Gece uyursun. Gündüz konuş, şüphelendiğini aday göster ve kurtları asmaya çalış.',
    seer: 'Her gece bir kişinin kurt olup olmadığını öğrenirsin. Bildiğini dikkatli paylaş; kurtlar seni arar.',
    doctor: 'Her gece bir kişiyi kurtlara karşı korursun. Kendini de koruyabilirsin.',
    hunter: 'Öldüğün an birini yanında götürürsün. Köyün tarafındasın.',
    witch: 'Bir iyileştirme ve bir zehir iksirin var. Her gece kurtların kurbanını görürsün; iksirleri oyun boyunca birer kez kullanırsın.',
    cupid: 'İlk gece iki kişiyi âşık edersin. Biri ölürse diğeri de ölür. Sen köyün tarafındasın.',
    fool: 'Tek amacın gündüz oylamasında asılmak. Asılırsan tek başına kazanırsın; gece ölürsen kaybedersin.',
  } satisfies Record<KurtRole, string>,

  step: {
    cupid: 'Aşk okçusu',
    wolves: 'Kurtlar',
    seer: 'Kahin',
    doctor: 'Doktor',
    witch: 'Cadı',
  } satisfies Record<KurtStep, string>,
  stepWakes: {
    cupid: 'Aşk okçusu uyanıyor ve iki kişiyi âşık ediyor.',
    wolves: 'Kurtlar uyanıyor ve kurbanını seçiyor.',
    seer: 'Kahin uyanıyor ve birine bakıyor.',
    doctor: 'Doktor uyanıyor ve birini koruyor.',
    witch: 'Cadı uyanıyor ve iksirlerine bakıyor.',
  } satisfies Record<KurtStep, string>,

  phase: {
    night: 'Gece',
    discuss: 'Tartışma',
    vote: 'Oylama',
    verdict: 'Karar',
    over: 'Oyun bitti',
  },

  night: (n: number) => `${n}. gece`,
  day: (n: number) => `${n}. gün`,
  alive: (n: number) => `${n} kişi hayatta`,

  // Rol kartı
  roleHold: 'Rolünü görmek için basılı tut',
  roleHoldHint: 'Yanındakiler görmesin diye yalnızca basılıyken açılır.',
  allies: 'Diğer kurtlar',
  noAllies: 'Bu oyunda tek kurt sensin.',
  seerResults: 'Bakışların',
  isWolf: 'kurt',
  notWolf: 'kurt değil',

  // Gece
  sleepTitle: 'Gözlerini kapat, köy uyuyor',
  sleepBody: 'Sıran gelirse ekranın kendiliğinden uyanır. Ekranını kimseye gösterme.',
  nightOrder: 'Gecenin sırası',
  aliveNow: 'Köyde hayatta olanlar',
  wolvesTitle: 'Bu gece kimi avlıyorsunuz?',
  wolfVotes: (n: number) => `${n} kurt`,
  seerTitle: 'Kime bakmak istiyorsun?',
  seerHint: 'Gecede bir kişiye bakabilirsin. Sonucu yalnızca sen görürsün.',
  seerIsWolf: (nick: string) => `${nick} bir kurt.`,
  seerNotWolf: (nick: string) => `${nick} kurt değil.`,
  stepDone: 'Seçimin kaydedildi. Süre dolunca uyuyacaksın.',
  pending: 'Gönderiliyor…',

  // Kurt sohbeti
  wolfChat: 'Kurtların sohbeti',
  wolfChatHint: 'yalnızca kurtlar görür',

  // Sabah
  dawnTitle: (n: number) => `${n}. gecenin sabahı`,
  dawnNone: 'Bu gece kimse ölmedi.',
  dawnDied: 'Bu gece ölenler',

  // Tartışma
  discussRule: 'Hayattakiler konuşur, ölüler susar. Rol kartını kimseye gösterme.',
  discussPick: 'Aday göstermek için birine dokun',
  candidates: 'Adaylar',
  noCandidates: 'Henüz aday yok. Kimse aday gösterilmezse bugün kimse asılmaz.',
  nominatedBy: (names: string) => `Aday gösteren: ${names}`,
  myNomination: (nick: string) => `${nick} kişisini aday gösterdin.`,
  readyBtn: 'Hazırım, oylamaya geçelim',
  readyCount: (a: number, b: number) => `${a}/${b} kişi hazır`,

  // Oylama
  voteTitle: 'Kimi asıyoruz?',
  voteHint: (open: boolean) => (open ? 'Açık oy: herkes kimin kime oy verdiğini görür.' : 'Gizli oy: yalnızca sayılar açıklanır.'),
  voteNone: 'Kimseyi asma',
  voteProgress: (a: number, b: number) => `${a}/${b} kişi oy verdi`,
  voteMine: (nick: string) => `Oyun: ${nick}`,
  nobody: 'Kimse',

  // Karar
  hanged: (nick: string) => `${nick} asıldı.`,
  hangedRole: (role: string) => `Rolü: ${role}`,
  spared: 'Bugün kimse asılmadı.',
  sparedTie: 'Oylar eşit çıktı; kimse asılmadı.',
  sparedNone: 'Kimse aday gösterilmedi.',
  tally: 'Oylar',
  nightFalls: 'Birazdan gece çöküyor.',

  // Sonuç
  reason: {
    wolvesDead: 'Bütün kurtlar öldü.',
    wolvesParity: 'Kurtlar sayıca köylülere yetişti.',
    foolHanged: 'Deli asılmayı başardı.',
    loversLast: 'Farklı taraftaki âşıklar son iki kişi kaldı.',
    ended: 'Oda sahibi oyunu bitirdi.',
  } satisfies Record<KurtReason, string>,
  backIn: (n: number) => `Lobiye dönülüyor… · ${n} sn`,
  gameOver: 'Oyun bitti',
  winnerTitle: {
    village: 'Köy kazandı!',
    wolves: 'Kurtlar kazandı!',
  },
  sideWolves: 'Kurtlar',
  sideVillage: 'Köy',
} as const;

/** Uppercase the way the game's `text-transform: uppercase` renders under lang="tr" (i → İ). */
export const trUpper = (t: string) => t.toLocaleUpperCase('tr-TR');
