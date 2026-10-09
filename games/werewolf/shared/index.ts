import { z } from 'zod';

export const GAME_ID = 'werewolf';
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 16;

export const ROLE_SECONDS_OPTIONS = [20, 30, 45] as const;
export const DISCUSS_SECONDS_OPTIONS = [60, 120, 180] as const;
export const VOTE_SECONDS_OPTIONS = [30, 45, 60] as const;

export const CHAT_MAX = 200;

export type Role = 'wolf' | 'villager' | 'seer' | 'doctor' | 'hunter' | 'witch' | 'cupid' | 'fool';
/** Lobide sayısı ayarlanan roller (köylüler kalan yerleri doldurur). */
export type ConfigurableRole = Exclude<Role, 'villager'>;
export const SPECIAL_ROLES = ['seer', 'doctor', 'hunter', 'witch', 'cupid', 'fool'] as const;
export const ALL_ROLES: Role[] = ['wolf', 'villager', 'seer', 'doctor', 'hunter', 'witch', 'cupid', 'fool'];

export type Side = 'wolves' | 'village';
export const sideOf = (r: Role): Side => (r === 'wolf' ? 'wolves' : 'village');

/** Gece sırası: aşk okçusu yalnızca ilk gece, sonra kurtlar, kahin, doktor, cadı. */
export type NightStep = 'cupid' | 'wolves' | 'seer' | 'doctor' | 'witch';
export const NIGHT_ORDER: NightStep[] = ['cupid', 'wolves', 'seer', 'doctor', 'witch'];
export const STEP_ROLE: Record<NightStep, Role> = {
  cupid: 'cupid',
  wolves: 'wolf',
  seer: 'seer',
  doctor: 'doctor',
  witch: 'witch',
};

export const roleCountsSchema = z.object({
  wolf: z.number().int().min(1).max(5),
  seer: z.number().int().min(0).max(1),
  doctor: z.number().int().min(0).max(1),
  hunter: z.number().int().min(0).max(1),
  witch: z.number().int().min(0).max(1),
  cupid: z.number().int().min(0).max(1),
  fool: z.number().int().min(0).max(1),
});
export type RoleCounts = z.infer<typeof roleCountsSchema>;

export const settingsSchema = z.object({
  roles: roleCountsSchema,
  /** Gece her rolün süresi (sn). Süre dolunca rol eylemsiz geçer. */
  roleSeconds: z.number().int().min(5).max(120),
  /** Gündüz tartışma süresi (sn). Herkes "hazırım" derse erken biter. */
  discussSeconds: z.number().int().min(10).max(600),
  /** Oylama süresi (sn). */
  voteSeconds: z.number().int().min(10).max(300),
  /** Ölenin rolü herkese açıklansın mı. */
  revealRoles: z.boolean(),
  /** Doktor üst üste iki gece aynı kişiyi koruyamaz. */
  doctorNoRepeat: z.boolean(),
  /** Açık oy: kimin kime oy verdiği herkese görünür. */
  openVotes: z.boolean(),
  /** Gündüz oylamasında beraberlik: kimse asılmaz ya da berabere kalanlar arasında ikinci tur. */
  dayTie: z.enum(['none', 'runoff']),
  /** Kurt oylamasında beraberlik: berabere kalanlardan rastgele biri ya da kimse. */
  wolfTie: z.enum(['random', 'none']),
  /** Ölüler (hayaletler) bütün rolleri ve gece olanları görebilir. */
  ghostsSeeRoles: z.boolean(),
});
export type WerewolfSettings = z.infer<typeof settingsSchema>;

/** Oyuncu sayısına göre önerilen dağılım (kalan yerler köylü). */
export function recommendedRoles(n: number): RoleCounts {
  const c = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
  return {
    wolf: c <= 5 ? 1 : c <= 9 ? 2 : c <= 13 ? 3 : 4,
    seer: 1,
    doctor: 1,
    hunter: c >= 7 ? 1 : 0,
    witch: c >= 8 ? 1 : 0,
    cupid: c >= 9 ? 1 : 0,
    fool: c >= 11 ? 1 : 0,
  };
}

export const defaultSettings: WerewolfSettings = {
  roles: recommendedRoles(8),
  roleSeconds: 30,
  discussSeconds: 120,
  voteSeconds: 45,
  revealRoles: true,
  doctorNoRepeat: true,
  openVotes: true,
  dayTie: 'runoff',
  wolfTie: 'random',
  ghostsSeeRoles: true,
};

export const specialCount = (r: RoleCounts) => SPECIAL_ROLES.reduce((sum, k) => sum + r[k], 0);
export const villagerCount = (r: RoleCounts, n: number) => n - r.wolf - specialCount(r);

/** Dağılım bu oyuncu sayısıyla oynanabilir mi; değilse oyuncuya gösterilecek metin. */
export function rolesProblem(r: RoleCounts, n: number): string | null {
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) return `Kurt Adam ${MIN_PLAYERS}–${MAX_PLAYERS} kişiyle oynanır. Şu an ${n} kişi var.`;
  if (r.wolf * 2 >= n) return `${n} kişide en fazla ${Math.ceil(n / 2) - 1} kurt olabilir. Kurt sayısını azalt.`;
  if (villagerCount(r, n) < 0) return `Roller ${r.wolf + specialCount(r)} kişilik ama odada ${n} kişi var. Bazı rolleri kapat.`;
  return null;
}

const session = z.number().int();
const id = z.string().min(1).max(64);

export const actionSchema = z.discriminatedUnion('type', [
  /** Aşk okçusu (ilk gece): iki kişiyi âşık eder. */
  z.object({ type: z.literal('cupid'), session, a: id, b: id }),
  /** Kurt: kurban oyu (null = oyunu geri al). */
  z.object({ type: z.literal('wolfVote'), session, target: id.nullable() }),
  /** Kurtların gizli sohbeti (yalnızca gece, yalnızca kurtlar). */
  z.object({ type: z.literal('wolfChat'), text: z.string().trim().min(1).max(CHAT_MAX) }),
  /** Kahin: bir kişinin kurt olup olmadığına bakar. */
  z.object({ type: z.literal('seer'), session, target: id }),
  /** Doktor: bir kişiyi korur. */
  z.object({ type: z.literal('doctor'), session, target: id }),
  /** Cadı: iyileştirme (kurbanı kurtar) ve/veya zehir (hedef). Tek seferde gönderilir. */
  z.object({ type: z.literal('witch'), session, heal: z.boolean(), poison: id.nullable() }),
  /** Avcı: ölürken yanında götüreceği kişi. */
  z.object({ type: z.literal('shoot'), session, target: id }),
  /** Tartışmada "hazırım". */
  z.object({ type: z.literal('ready'), session, ready: z.boolean() }),
  /** Tartışmada aday göster (null = adaylığı geri çek). */
  z.object({ type: z.literal('nominate'), session, target: id.nullable() }),
  /** Oylama: aday ya da null = kimseyi asma. */
  z.object({ type: z.literal('vote'), session, target: id.nullable() }),
  /** Hayaletler kanalı (yalnızca ölüler). */
  z.object({ type: z.literal('ghostChat'), text: z.string().trim().min(1).max(CHAT_MAX) }),
  /** Oda sahibi: tartışmayı ya da oylamayı erken bitir. */
  z.object({ type: z.literal('hostSkip'), session }),
  /** Oda sahibi: oyun bittiyse lobiye hemen dön. */
  z.object({ type: z.literal('finish') }),
]);
export type WerewolfAction = z.infer<typeof actionSchema>;

export type Phase = 'night' | 'hunter' | 'discuss' | 'vote' | 'verdict' | 'over';
export type Winner = 'village' | 'wolves' | 'fool' | 'lovers';
export type WinReason = 'wolvesDead' | 'wolvesParity' | 'foolHanged' | 'loversLast' | 'ended';

export interface ChatMsg {
  n: number;
  from: string;
  text: string;
}

/** Açık olay günlüğü (herkese). `role` yalnızca rol açıklama ayarı açıksa dolu. */
export type LogEntry =
  | { k: 'start'; players: number }
  | { k: 'night'; night: number }
  | { k: 'dawn'; night: number; deaths: { id: string; role: Role | null }[] }
  | { k: 'grief'; id: string; partner: string; role: Role | null }
  | { k: 'shot'; hunter: string; target: string; role: Role | null }
  | { k: 'noShot'; hunter: string }
  | { k: 'nominate'; by: string; target: string }
  | { k: 'noCandidates' }
  | { k: 'runoff'; candidates: string[] }
  | { k: 'hanged'; id: string; role: Role | null; votes: number }
  | { k: 'spared'; tie: boolean }
  | { k: 'over'; winner: Winner | null; reason: WinReason };

/** Gece olanlar: hayaletlere (ayar açıksa) ve oyun sonunda herkese. */
export type SecretEntry =
  | { k: 'lovers'; night: number; a: string; b: string }
  | { k: 'wolves'; night: number; target: string | null }
  | { k: 'seer'; night: number; seer: string; target: string; wolf: boolean }
  | { k: 'doctor'; night: number; doctor: string; target: string }
  | { k: 'heal'; night: number; witch: string; target: string }
  | { k: 'poison'; night: number; witch: string; target: string }
  | { k: 'saved'; night: number; target: string };

export interface SeatView {
  id: string;
  alive: boolean;
  /** Herkese açık rol (öldüyse ve rol açıklama ayarı açıksa, ya da oyun bittiyse). */
  role: Role | null;
  /** Tartışmada "hazırım" dedi mi. */
  ready: boolean;
  /** Bu oylamada oy verdi mi (gizli oyda da görünür, kime verdiği değil). */
  voted: boolean;
  /** Tartışmada bu oyuncuyu aday gösterenler. */
  nominatedBy: string[];
}

/** Sıra sende olduğunda (yalnızca kendi görünümünde) eylem paneli. */
export type NightTurn =
  | { step: 'cupid'; targets: string[]; pair: [string, string] | null }
  | { step: 'wolves'; targets: string[]; votes: Record<string, string> }
  | { step: 'seer'; targets: string[]; result: { id: string; wolf: boolean } | null }
  | { step: 'doctor'; targets: string[]; picked: string | null; blocked: string | null }
  | {
      step: 'witch';
      victim: string | null;
      canHeal: boolean;
      canPoison: boolean;
      targets: string[];
      done: boolean;
      healed: boolean;
      poisoned: string | null;
    };

/** Yalnızca o oyuncunun kendi görünümünde: rol kartı ve rolüne ait gizli bilgiler. */
export interface MeView {
  role: Role;
  alive: boolean;
  /** Kurtlarda diğer kurtlar. */
  allies: string[];
  /** Âşıksan partnerin ve onun tarafı. */
  lover: { id: string; side: Side } | null;
  /** Aşk okçusunun eşleştirdiği çift. */
  cupidPair: [string, string] | null;
  /** Kahinin bugüne kadarki bakışları. */
  seerResults: { night: number; id: string; wolf: boolean }[];
  /** Doktorun bir önceki gece koruduğu. */
  doctorLast: string | null;
  /** Cadının kalan iksirleri. */
  potions: { heal: boolean; poison: boolean } | null;
  /** Gece sırası sendeyse eylem paneli. */
  turn: NightTurn | null;
  /** Kurtların gizli sohbeti (yalnızca kurtlara). */
  wolfChat: ChatMsg[] | null;
}

/** Yalnızca ölen oyunculara. */
export interface GhostView {
  chat: ChatMsg[];
  /** Ayar açıksa bütün roller. */
  roles: Record<string, Role> | null;
  lovers: [string, string] | null;
  secret: SecretEntry[] | null;
}

export interface VoteResult {
  round: number;
  /** Aday başına oy (null = kimse). */
  tally: { id: string | null; n: number }[];
  /** Açık oyda kim kime verdi; gizli oyda null. */
  votes: Record<string, string | null> | null;
  hanged: string | null;
  tie: boolean;
  noCandidates: boolean;
}

export interface WerewolfView {
  phase: Phase;
  /** Gece/gün numarası (1'den). */
  day: number;
  session: number;
  /** Bu gecenin sırası (ayarlardan çıkar, herkese aynı). */
  nightSteps: NightStep[];
  nightStep: NightStep | null;
  endsAt: number;
  serverNow: number;
  seats: SeatView[];
  /** Rol başına oyundaki sayı (herkese açık; ayarlardan). */
  roleCounts: Record<Role, number>;
  candidates: string[];
  runoff: boolean;
  /** Açık oylamada anlık oylar. */
  liveVotes: Record<string, string | null> | null;
  /** Bu oylamadaki oyun (null = henüz vermedin; target null = kimse). */
  myVote: { target: string | null } | null;
  myNomination: string | null;
  lastNight: { night: number; deaths: { id: string; role: Role | null }[] } | null;
  lastVote: VoteResult | null;
  /** Son atışını yapan avcı (herkese açık). */
  hunter: string | null;
  log: LogEntry[];
  me: MeView | null;
  ghost: GhostView | null;
  winner: Winner | null;
  winReason: WinReason | null;
  /** Yalnızca oyun bitince. */
  roles: Record<string, Role> | null;
  lovers: [string, string] | null;
  secret: SecretEntry[] | null;
  finishAt: number;
}
