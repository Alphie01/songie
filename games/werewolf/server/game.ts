import { UserFacingError, type GameContext, type GameResult, type ServerGame } from '@songie/game-kit/server';
import {
  ALL_ROLES,
  GAME_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NIGHT_ORDER,
  SPECIAL_ROLES,
  STEP_ROLE,
  actionSchema,
  defaultSettings,
  rolesProblem,
  recommendedRoles,
  settingsSchema,
  sideOf,
  villagerCount,
  type ChatMsg,
  type LogEntry,
  type MeView,
  type NightStep,
  type NightTurn,
  type Phase,
  type Role,
  type SecretEntry,
  type VoteResult,
  type WerewolfAction,
  type WerewolfSettings,
  type WerewolfView,
  type WinReason,
  type Winner,
} from '../shared/index.js';

export class GameError extends UserFacingError {}

export interface WerewolfTiming {
  /** Gündüz oylama sonucunun ekranda kaldığı süre. */
  verdictMs: number;
  /** Oyun bitince rollerin açık kaldığı süre; sonra lobiye dönülür. */
  podiumMs: number;
  /**
   * Gece boyunca görünümler bu aralıkla herkese birlikte gönderilir. Gece eylemleri anında
   * gönderim tetiklemez: böylece "kim ne zaman bir şey yaptı" mesaj trafiğinden anlaşılmaz.
   */
  tickMs: number;
}

export const DEFAULT_TIMING: WerewolfTiming = { verdictMs: 8_000, podiumMs: 60_000, tickMs: 1_000 };
const CHAT_KEEP = 120;

export interface WerewolfState {
  settings: WerewolfSettings;
  clock: () => number;
  seats: string[];
  roles: Record<string, Role>;
  counts: Record<Role, number>;
  dead: string[];
  lovers: [string, string] | null;

  phase: Phase;
  day: number;
  session: number;
  endsAt: number;
  nightSteps: NightStep[];
  stepIndex: number;

  // Gece
  wolfVotes: Record<string, string>;
  wolfVictim: string | null;
  seerTonight: { id: string; wolf: boolean } | null;
  seerResults: { night: number; id: string; wolf: boolean }[];
  doctorPick: string | null;
  doctorLast: string | null;
  potions: { heal: boolean; poison: boolean };
  witchDone: boolean;
  witchHeal: boolean;
  witchPoison: string | null;
  wolfChat: ChatMsg[];
  ghostChat: ChatMsg[];
  chatSeq: number;

  // Gündüz
  ready: string[];
  nominations: Record<string, string>;
  candidates: string[];
  votes: Record<string, string | null>;
  voteRound: number;
  lastNight: WerewolfView['lastNight'];
  lastVote: VoteResult | null;

  hunterQueue: string[];
  hunter: string | null;
  after: 'discuss' | 'night';

  log: LogEntry[];
  secret: SecretEntry[];
  winner: Winner | null;
  winReason: WinReason | null;
  finishAt: number;
  finished: boolean;
  cancelTimer: (() => void) | null;
  cancelTick: (() => void) | null;
}

export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Ayarlardaki sayılarla rolleri dağıtır; kalan yerler köylü. */
export function assignRoles(ids: string[], settings: WerewolfSettings, random: () => number = Math.random): Record<string, Role> {
  const problem = rolesProblem(settings.roles, ids.length);
  if (problem) throw new GameError(problem);
  const pool: Role[] = [...Array<Role>(settings.roles.wolf).fill('wolf')];
  for (const r of SPECIAL_ROLES) for (let i = 0; i < settings.roles[r]; i++) pool.push(r);
  while (pool.length < ids.length) pool.push('villager');
  const shuffled = shuffle(pool, random);
  return Object.fromEntries(ids.map((id, i) => [id, shuffled[i]!]));
}

export function createWerewolfGame(deps: {
  timing?: Partial<WerewolfTiming>;
  random?: () => number;
} = {}): ServerGame<WerewolfSettings, WerewolfState, WerewolfAction> {
  const timing: WerewolfTiming = { ...DEFAULT_TIMING, ...deps.timing };
  const random = deps.random ?? Math.random;

  const isAlive = (s: WerewolfState, id: string) => s.seats.includes(id) && !s.dead.includes(id);
  const alive = (s: WerewolfState) => s.seats.filter((id) => !s.dead.includes(id));
  const roleMs = (s: WerewolfState) => s.settings.roleSeconds * 1000;
  const shownRole = (s: WerewolfState, id: string): Role | null => (s.settings.revealRoles ? s.roles[id]! : null);
  const currentStep = (s: WerewolfState): NightStep | null => (s.phase === 'night' ? (s.nightSteps[s.stepIndex] ?? null) : null);
  const mixedLovers = (s: WerewolfState) => !!s.lovers && sideOf(s.roles[s.lovers[0]]!) !== sideOf(s.roles[s.lovers[1]]!);

  function online(ctx: GameContext): Set<string> {
    return new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  }

  function setPhase(ctx: GameContext, s: WerewolfState, phase: Phase, ms: number, then: (() => void) | null): void {
    s.cancelTimer?.();
    s.cancelTimer = null;
    s.phase = phase;
    s.session++;
    s.endsAt = ctx.now() + ms;
    if (then) s.cancelTimer = ctx.schedule(ms, then);
  }

  function stopTick(s: WerewolfState): void {
    s.cancelTick?.();
    s.cancelTick = null;
  }

  function startTick(ctx: GameContext, s: WerewolfState): void {
    stopTick(s);
    const tick = () => {
      if (s.phase !== 'night') return;
      ctx.pushViews();
      s.cancelTick = ctx.schedule(timing.tickMs, tick);
    };
    s.cancelTick = ctx.schedule(timing.tickMs, tick);
  }

  /** Oyuncuyu öldürür; âşığı da kalp acısından ölür. Yeni ölenleri sırayla döner. */
  function kill(s: WerewolfState, id: string): string[] {
    if (!isAlive(s, id)) return [];
    s.dead.push(id);
    const out = [id];
    if (s.roles[id] === 'hunter') s.hunterQueue.push(id);
    if (s.lovers?.includes(id)) {
      const partner = s.lovers[0] === id ? s.lovers[1] : s.lovers[0];
      out.push(...kill(s, partner));
    }
    return out;
  }

  /** Gündüz ölümlerinden sonra kalp acısı kayıtları. */
  function logGrief(s: WerewolfState, killed: string[]): void {
    for (const id of killed.slice(1)) {
      const partner = s.lovers?.find((x) => x !== id) ?? killed[0]!;
      s.log.push({ k: 'grief', id, partner, role: shownRole(s, id) });
    }
  }

  function checkWin(s: WerewolfState): { winner: Winner; reason: WinReason } | null {
    const living = alive(s);
    if (s.lovers && mixedLovers(s) && living.length === 2 && s.lovers.every((id) => living.includes(id))) {
      return { winner: 'lovers', reason: 'loversLast' };
    }
    const wolves = living.filter((id) => s.roles[id] === 'wolf').length;
    if (wolves === 0) return { winner: 'village', reason: 'wolvesDead' };
    if (wolves >= living.length - wolves) return { winner: 'wolves', reason: 'wolvesParity' };
    return null;
  }

  function teamOf(s: WerewolfState, id: string): Winner {
    if (s.lovers?.includes(id) && mixedLovers(s)) return 'lovers';
    const r = s.roles[id]!;
    if (r === 'fool') return 'fool';
    return r === 'wolf' ? 'wolves' : 'village';
  }

  function gameOver(ctx: GameContext, s: WerewolfState, winner: Winner | null, reason: WinReason): void {
    if (s.phase === 'over') return;
    stopTick(s);
    s.winner = winner;
    s.winReason = reason;
    s.hunter = null;
    s.hunterQueue = [];
    s.log.push({ k: 'over', winner, reason });
    setPhase(ctx, s, 'over', timing.podiumMs, () => finish(ctx, s));
    s.finishAt = s.endsAt;
    ctx.pushViews();
  }

  function finish(ctx: GameContext, s: WerewolfState): void {
    if (s.finished) return;
    s.finished = true;
    s.cancelTimer?.();
    s.cancelTimer = null;
    stopTick(s);
    const results: GameResult[] = s.seats.map((id) => {
      const team = teamOf(s, id);
      return {
        playerId: id,
        score: s.winner !== null && team === s.winner ? 1 : 0,
        meta: { role: s.roles[id], team, winner: s.winner, reason: s.winReason, survived: !s.dead.includes(id) },
      };
    });
    ctx.finish(results);
  }

  /* ---------------- Gece ---------------- */

  function startNight(ctx: GameContext, s: WerewolfState): void {
    s.day++;
    s.wolfVotes = {};
    s.wolfVictim = null;
    s.seerTonight = null;
    s.doctorPick = null;
    s.witchDone = false;
    s.witchHeal = false;
    s.witchPoison = null;
    s.ready = [];
    s.nominations = {};
    s.candidates = [];
    s.votes = {};
    // Sıra yalnızca ayarlardaki rollere göre belirlenir (herkese açık); rolün sahibi ölmüş olsa da
    // adım tam süre sürer. Böylece gecenin uzunluğu kimin hangi rolde ya da hayatta olduğunu ele vermez.
    s.nightSteps = NIGHT_ORDER.filter((st) => s.counts[STEP_ROLE[st]] > 0 && (st !== 'cupid' || s.day === 1));
    s.log.push({ k: 'night', night: s.day });
    startStep(ctx, s, 0);
    startTick(ctx, s);
  }

  function startStep(ctx: GameContext, s: WerewolfState, index: number): void {
    s.stepIndex = index;
    setPhase(ctx, s, 'night', roleMs(s), () => endStep(ctx, s));
    ctx.pushViews();
  }

  function endStep(ctx: GameContext, s: WerewolfState): void {
    const step = currentStep(s);
    if (step === 'wolves') decideVictim(s);
    if (s.stepIndex + 1 < s.nightSteps.length) startStep(ctx, s, s.stepIndex + 1);
    else resolveNight(ctx, s);
  }

  function decideVictim(s: WerewolfState): void {
    const tally = new Map<string, number>();
    for (const [wolf, target] of Object.entries(s.wolfVotes)) {
      if (!isAlive(s, wolf) || s.roles[wolf] !== 'wolf' || !isAlive(s, target)) continue;
      tally.set(target, (tally.get(target) ?? 0) + 1);
    }
    const top = Math.max(0, ...tally.values());
    const tied = [...tally.entries()].filter(([, n]) => n === top && n > 0).map(([id]) => id);
    let victim: string | null = null;
    if (tied.length === 1) victim = tied[0]!;
    else if (tied.length > 1 && s.settings.wolfTie === 'random') victim = tied[Math.floor(random() * tied.length)]!;
    s.wolfVictim = victim;
    s.secret.push({ k: 'wolves', night: s.day, target: victim });
  }

  function resolveNight(ctx: GameContext, s: WerewolfState): void {
    stopTick(s);
    const toKill: string[] = [];
    const victim = s.wolfVictim;
    if (victim && isAlive(s, victim)) {
      if (s.doctorPick === victim || s.witchHeal) s.secret.push({ k: 'saved', night: s.day, target: victim });
      else toKill.push(victim);
    }
    if (s.witchPoison && isAlive(s, s.witchPoison) && !toKill.includes(s.witchPoison)) toKill.push(s.witchPoison);
    s.doctorLast = s.doctorPick;
    const killed: string[] = [];
    for (const id of toKill) killed.push(...kill(s, id));
    const deaths = killed.map((id) => ({ id, role: shownRole(s, id) }));
    s.lastNight = { night: s.day, deaths };
    s.lastVote = null;
    s.log.push({ k: 'dawn', night: s.day, deaths });
    proceed(ctx, s, 'discuss');
  }

  /** Ölümlerden sonra: önce avcı(lar) ateş eder, sonra kazanan kontrolü, sonra sıradaki aşama. */
  function proceed(ctx: GameContext, s: WerewolfState, after: 'discuss' | 'night'): void {
    s.after = after;
    const next = s.hunterQueue.shift();
    if (next) {
      s.hunter = next;
      setPhase(ctx, s, 'hunter', roleMs(s), () => {
        s.log.push({ k: 'noShot', hunter: next });
        s.hunter = null;
        proceed(ctx, s, after);
      });
      ctx.pushViews();
      return;
    }
    s.hunter = null;
    const win = checkWin(s);
    if (win) {
      gameOver(ctx, s, win.winner, win.reason);
      return;
    }
    if (after === 'discuss') startDiscuss(ctx, s);
    else startNight(ctx, s);
  }

  /* ---------------- Gündüz ---------------- */

  function startDiscuss(ctx: GameContext, s: WerewolfState): void {
    s.ready = [];
    s.nominations = {};
    s.candidates = [];
    s.votes = {};
    s.voteRound = 0;
    setPhase(ctx, s, 'discuss', s.settings.discussSeconds * 1000, () => endDiscuss(ctx, s));
    ctx.pushViews();
  }

  function candidatesOf(s: WerewolfState): string[] {
    const out: string[] = [];
    for (const t of Object.values(s.nominations)) if (!out.includes(t) && isAlive(s, t)) out.push(t);
    return out;
  }

  function endDiscuss(ctx: GameContext, s: WerewolfState): void {
    const cands = candidatesOf(s);
    if (!cands.length) {
      s.log.push({ k: 'noCandidates' });
      s.lastVote = { round: 1, tally: [], votes: null, hanged: null, tie: false, noCandidates: true };
      startVerdict(ctx, s);
      return;
    }
    startVote(ctx, s, cands, 1);
  }

  function startVote(ctx: GameContext, s: WerewolfState, candidates: string[], round: number): void {
    s.candidates = candidates;
    s.votes = {};
    s.voteRound = round;
    setPhase(ctx, s, 'vote', s.settings.voteSeconds * 1000, () => resolveVote(ctx, s));
    ctx.pushViews();
  }

  function resolveVote(ctx: GameContext, s: WerewolfState): void {
    const voters = alive(s).filter((id) => id in s.votes);
    const counts = new Map<string | null, number>([[null, 0], ...s.candidates.map((c) => [c, 0] as [string, number])]);
    for (const v of voters) {
      const t = s.votes[v] ?? null;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const tally = [...counts.entries()].map(([id, n]) => ({ id, n }));
    const none = counts.get(null) ?? 0;
    const top = Math.max(0, ...s.candidates.map((c) => counts.get(c) ?? 0));
    const tied = s.candidates.filter((c) => (counts.get(c) ?? 0) === top);
    const votes = s.settings.openVotes ? Object.fromEntries(voters.map((v) => [v, s.votes[v] ?? null])) : null;
    const base = { round: s.voteRound, tally, votes, noCandidates: false };

    if (top === 0 || top <= none) {
      s.lastVote = { ...base, hanged: null, tie: top > 0 && top === none };
      s.log.push({ k: 'spared', tie: top > 0 && top === none });
      startVerdict(ctx, s);
      return;
    }
    if (tied.length > 1) {
      if (s.settings.dayTie === 'runoff' && s.voteRound === 1) {
        s.lastVote = { ...base, hanged: null, tie: true };
        s.log.push({ k: 'runoff', candidates: tied });
        startVote(ctx, s, tied, 2);
        return;
      }
      s.lastVote = { ...base, hanged: null, tie: true };
      s.log.push({ k: 'spared', tie: true });
      startVerdict(ctx, s);
      return;
    }
    const hanged = tied[0]!;
    s.lastVote = { ...base, hanged, tie: false };
    const killed = kill(s, hanged);
    s.log.push({ k: 'hanged', id: hanged, role: shownRole(s, hanged), votes: top });
    logGrief(s, killed);
    if (s.roles[hanged] === 'fool') {
      gameOver(ctx, s, 'fool', 'foolHanged');
      return;
    }
    startVerdict(ctx, s);
  }

  function startVerdict(ctx: GameContext, s: WerewolfState): void {
    setPhase(ctx, s, 'verdict', timing.verdictMs, () => proceed(ctx, s, 'night'));
    ctx.pushViews();
  }

  /* ---------------- Yardımcılar ---------------- */

  function requireSeat(s: WerewolfState, playerId: string): void {
    if (!s.seats.includes(playerId)) throw new GameError('Bu oyunda oyuncu değilsin; izleyebilirsin.');
  }

  function requireAliveRole(s: WerewolfState, playerId: string, role: Role, msg: string): void {
    requireSeat(s, playerId);
    if (s.roles[playerId] !== role) throw new GameError(msg);
    if (!isAlive(s, playerId)) throw new GameError('Ölüler gece uyanmaz. Hayaletler kanalından izleyebilirsin.');
  }

  /** Gece eylemi geçerli mi: doğru adım ve oturum. Değilse eski bir tıklamadır. */
  const inStep = (s: WerewolfState, step: NightStep, session: number) => currentStep(s) === step && s.session === session;

  function pushChat(s: WerewolfState, list: ChatMsg[], from: string, text: string): void {
    list.push({ n: ++s.chatSeq, from, text });
    if (list.length > CHAT_KEEP) list.splice(0, list.length - CHAT_KEEP);
  }

  function turnFor(s: WerewolfState, id: string): NightTurn | null {
    const step = currentStep(s);
    if (!step || !isAlive(s, id) || s.roles[id] !== STEP_ROLE[step]) return null;
    const living = alive(s);
    switch (step) {
      case 'cupid':
        return { step, targets: living, pair: s.lovers };
      case 'wolves':
        return {
          step,
          targets: living.filter((x) => s.roles[x] !== 'wolf'),
          votes: Object.fromEntries(Object.entries(s.wolfVotes).filter(([w]) => isAlive(s, w))),
        };
      case 'seer':
        return { step, targets: living.filter((x) => x !== id), result: s.seerTonight };
      case 'doctor':
        return { step, targets: living, picked: s.doctorPick, blocked: s.settings.doctorNoRepeat ? s.doctorLast : null };
      case 'witch':
        return {
          step,
          victim: s.wolfVictim,
          canHeal: s.potions.heal && !!s.wolfVictim,
          canPoison: s.potions.poison,
          targets: living.filter((x) => x !== id),
          done: s.witchDone,
          healed: s.witchHeal,
          poisoned: s.witchPoison,
        };
    }
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (settings.roles.wolf < 1) return 'En az bir kurt olmalı.';
      return null;
    },

    async start(ctx, startSettings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      // Oda sahibi rol dağılımına hiç dokunmadıysa (varsayılan 8 kişilik), odadaki kişi sayısına göre öner.
      const untouched = JSON.stringify(startSettings.roles) === JSON.stringify(defaultSettings.roles);
      const settings = untouched && rolesProblem(startSettings.roles, ids.length)
        ? { ...startSettings, roles: recommendedRoles(Math.max(MIN_PLAYERS, ids.length)) }
        : startSettings;
      const roles = assignRoles(ids, settings, random);
      const counts = Object.fromEntries(ALL_ROLES.map((r) => [r, 0])) as Record<Role, number>;
      for (const r of Object.values(roles)) counts[r]++;
      counts.villager = villagerCount(settings.roles, ids.length);
      const state: WerewolfState = {
        settings,
        clock: () => ctx.now(),
        seats: ids,
        roles,
        counts,
        dead: [],
        lovers: null,
        phase: 'night',
        day: 0,
        session: 0,
        endsAt: 0,
        nightSteps: [],
        stepIndex: 0,
        wolfVotes: {},
        wolfVictim: null,
        seerTonight: null,
        seerResults: [],
        doctorPick: null,
        doctorLast: null,
        potions: { heal: true, poison: true },
        witchDone: false,
        witchHeal: false,
        witchPoison: null,
        wolfChat: [],
        ghostChat: [],
        chatSeq: 0,
        ready: [],
        nominations: {},
        candidates: [],
        votes: {},
        voteRound: 0,
        lastNight: null,
        lastVote: null,
        hunterQueue: [],
        hunter: null,
        after: 'discuss',
        log: [{ k: 'start', players: ids.length }],
        secret: [],
        winner: null,
        winReason: null,
        finishAt: 0,
        finished: false,
        cancelTimer: null,
        cancelTick: null,
      };
      startNight(ctx, state);
      return state;
    },

    onAction(ctx, s, playerId, action) {
      const isHost = ctx.hostId() === playerId;

      if (action.type === 'finish') {
        if (!isHost) throw new GameError('Lobiye dönüşü oda sahibi başlatır.');
        if (s.phase !== 'over') throw new GameError('Oyun henüz bitmedi. Bitirmek için menüden "Oyunu bitir"i kullan.');
        finish(ctx, s);
        return { ok: true };
      }
      if (s.phase === 'over') return { ok: true, stale: true };

      switch (action.type) {
        /* ----- Gece: anında gönderim yok, görünümler gece tik'iyle gider ----- */
        case 'cupid': {
          if (!inStep(s, 'cupid', action.session)) return { ok: true, stale: true };
          requireAliveRole(s, playerId, 'cupid', 'Âşıkları yalnızca aşk okçusu seçer.');
          if (s.lovers) throw new GameError('Âşıkları zaten seçtin.');
          if (action.a === action.b) throw new GameError('İki farklı kişi seç.');
          if (!isAlive(s, action.a) || !isAlive(s, action.b)) throw new GameError('Yalnızca oyundaki kişileri seçebilirsin.');
          s.lovers = [action.a, action.b];
          s.secret.push({ k: 'lovers', night: s.day, a: action.a, b: action.b });
          return { ok: true };
        }
        case 'wolfVote': {
          if (!inStep(s, 'wolves', action.session)) return { ok: true, stale: true };
          requireAliveRole(s, playerId, 'wolf', 'Kurban seçimine yalnızca kurtlar katılır.');
          if (action.target === null) {
            delete s.wolfVotes[playerId];
            return { ok: true };
          }
          if (!isAlive(s, action.target) || s.roles[action.target] === 'wolf') {
            throw new GameError('Hayatta olan ve kurt olmayan birini seç.');
          }
          s.wolfVotes[playerId] = action.target;
          return { ok: true };
        }
        case 'wolfChat': {
          requireAliveRole(s, playerId, 'wolf', 'Bu sohbet yalnızca kurtlara açık.');
          if (s.phase !== 'night') throw new GameError('Kurt sohbeti yalnızca gece açık. Gündüz herkesle konuş.');
          pushChat(s, s.wolfChat, playerId, action.text);
          return { ok: true };
        }
        case 'seer': {
          if (!inStep(s, 'seer', action.session)) return { ok: true, stale: true };
          requireAliveRole(s, playerId, 'seer', 'Bu gece bakışını yalnızca kahin yapar.');
          if (s.seerTonight) throw new GameError('Bu gece bakışını yaptın. Yarın gece yeniden bakabilirsin.');
          if (action.target === playerId || !isAlive(s, action.target)) throw new GameError('Hayattaki başka birini seç.');
          const wolf = s.roles[action.target] === 'wolf';
          s.seerTonight = { id: action.target, wolf };
          s.seerResults.push({ night: s.day, id: action.target, wolf });
          s.secret.push({ k: 'seer', night: s.day, seer: playerId, target: action.target, wolf });
          return { ok: true };
        }
        case 'doctor': {
          if (!inStep(s, 'doctor', action.session)) return { ok: true, stale: true };
          requireAliveRole(s, playerId, 'doctor', 'Korumayı yalnızca doktor seçer.');
          if (s.doctorPick) throw new GameError('Bu gece korumanı seçtin.');
          if (!isAlive(s, action.target)) throw new GameError('Hayattaki birini seç.');
          if (s.settings.doctorNoRepeat && action.target === s.doctorLast) {
            throw new GameError('Aynı kişiyi üst üste iki gece koruyamazsın. Başka birini seç.');
          }
          s.doctorPick = action.target;
          s.secret.push({ k: 'doctor', night: s.day, doctor: playerId, target: action.target });
          return { ok: true };
        }
        case 'witch': {
          if (!inStep(s, 'witch', action.session)) return { ok: true, stale: true };
          requireAliveRole(s, playerId, 'witch', 'İksirleri yalnızca cadı kullanır.');
          if (s.witchDone) throw new GameError('Bu gece kararını verdin.');
          if (action.heal && (!s.potions.heal || !s.wolfVictim)) {
            throw new GameError(s.potions.heal ? 'Bu gece iyileştirecek bir kurban yok.' : 'İyileştirme iksirini zaten kullandın.');
          }
          if (action.poison !== null) {
            if (!s.potions.poison) throw new GameError('Zehir iksirini zaten kullandın.');
            if (action.poison === playerId || !isAlive(s, action.poison)) throw new GameError('Zehir için hayattaki başka birini seç.');
          }
          s.witchDone = true;
          if (action.heal) {
            s.potions.heal = false;
            s.witchHeal = true;
            s.secret.push({ k: 'heal', night: s.day, witch: playerId, target: s.wolfVictim! });
          }
          if (action.poison !== null) {
            s.potions.poison = false;
            s.witchPoison = action.poison;
            s.secret.push({ k: 'poison', night: s.day, witch: playerId, target: action.poison });
          }
          return { ok: true };
        }

        /* ----- Avcı ----- */
        case 'shoot': {
          if (s.phase !== 'hunter' || s.session !== action.session) return { ok: true, stale: true };
          if (playerId !== s.hunter) throw new GameError('Son atışı yalnızca ölen avcı yapar.');
          if (action.target === playerId || !isAlive(s, action.target)) throw new GameError('Hayattaki birini seç.');
          const hunter = s.hunter;
          s.hunter = null;
          const killed = kill(s, action.target);
          s.log.push({ k: 'shot', hunter, target: action.target, role: shownRole(s, action.target) });
          logGrief(s, killed);
          proceed(ctx, s, s.after);
          return { ok: true };
        }

        /* ----- Gündüz ----- */
        case 'ready': {
          if (s.phase !== 'discuss' || s.session !== action.session) return { ok: true, stale: true };
          requireSeat(s, playerId);
          if (!isAlive(s, playerId)) throw new GameError('Ölüler tartışmaya katılmaz.');
          s.ready = s.ready.filter((x) => x !== playerId);
          if (action.ready) s.ready.push(playerId);
          const on = online(ctx);
          const voters = alive(s).filter((id) => on.has(id));
          if (voters.length > 0 && voters.every((id) => s.ready.includes(id))) {
            endDiscuss(ctx, s);
            return { ok: true };
          }
          ctx.pushViews();
          return { ok: true };
        }
        case 'nominate': {
          if (s.phase !== 'discuss' || s.session !== action.session) return { ok: true, stale: true };
          requireSeat(s, playerId);
          if (!isAlive(s, playerId)) throw new GameError('Ölüler aday gösteremez.');
          if (action.target === null) {
            delete s.nominations[playerId];
          } else {
            if (action.target === playerId) throw new GameError('Kendini aday gösteremezsin.');
            if (!isAlive(s, action.target)) throw new GameError('Hayattaki birini aday göster.');
            if (s.nominations[playerId] === action.target) return { ok: true, stale: true };
            s.nominations[playerId] = action.target;
            s.log.push({ k: 'nominate', by: playerId, target: action.target });
          }
          s.candidates = candidatesOf(s);
          ctx.pushViews();
          return { ok: true };
        }
        case 'vote': {
          if (s.phase !== 'vote' || s.session !== action.session) return { ok: true, stale: true };
          requireSeat(s, playerId);
          if (!isAlive(s, playerId)) throw new GameError('Ölüler oy veremez.');
          if (action.target !== null && !s.candidates.includes(action.target)) throw new GameError('Yalnızca adaylardan birine oy verebilirsin.');
          s.votes[playerId] = action.target;
          const on = online(ctx);
          if (alive(s).filter((id) => on.has(id)).every((id) => id in s.votes)) {
            resolveVote(ctx, s);
            return { ok: true };
          }
          ctx.pushViews();
          return { ok: true };
        }
        case 'ghostChat': {
          requireSeat(s, playerId);
          if (isAlive(s, playerId)) throw new GameError('Hayaletler kanalı yalnızca ölülere açık.');
          pushChat(s, s.ghostChat, playerId, action.text);
          if (s.phase !== 'night') ctx.pushViews();
          return { ok: true };
        }
        case 'hostSkip': {
          if (!isHost) throw new GameError('Tartışmayı ya da oylamayı yalnızca oda sahibi erken bitirebilir.');
          if (s.session !== action.session) return { ok: true, stale: true };
          if (s.phase === 'discuss') endDiscuss(ctx, s);
          else if (s.phase === 'vote') resolveVote(ctx, s);
          else throw new GameError('Şu an erken bitirilecek bir tartışma ya da oylama yok.');
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx) {
      ctx.pushViews();
    },

    onPlayerLeave(ctx) {
      // Oyuncu oyundan çıkarılmaz; gece sırası süreyle geçer, gündüz oda sahibi erken bitirebilir.
      ctx.pushViews();
    },

    onPlayerConnection(ctx) {
      ctx.pushViews();
    },

    end(ctx, s) {
      if (s.phase === 'over') finish(ctx, s);
      else gameOver(ctx, s, null, 'ended');
    },

    viewFor(s, playerId): WerewolfView {
      const over = s.phase === 'over';
      const myRole = s.roles[playerId];
      const amDead = !!myRole && s.dead.includes(playerId);

      let me: MeView | null = null;
      if (myRole) {
        const lover = s.lovers?.includes(playerId) ? (s.lovers[0] === playerId ? s.lovers[1] : s.lovers[0]) : null;
        me = {
          role: myRole,
          alive: !amDead,
          allies: myRole === 'wolf' ? s.seats.filter((id) => id !== playerId && s.roles[id] === 'wolf') : [],
          lover: lover ? { id: lover, side: sideOf(s.roles[lover]!) } : null,
          cupidPair: myRole === 'cupid' ? s.lovers : null,
          seerResults: myRole === 'seer' ? s.seerResults : [],
          doctorLast: myRole === 'doctor' ? s.doctorLast : null,
          potions: myRole === 'witch' ? { ...s.potions } : null,
          turn: turnFor(s, playerId),
          wolfChat: myRole === 'wolf' ? s.wolfChat : null,
        };
      }

      const seeAll = s.settings.ghostsSeeRoles;
      const ghost = amDead
        ? {
            chat: s.ghostChat,
            roles: seeAll ? { ...s.roles } : null,
            lovers: seeAll ? s.lovers : null,
            secret: seeAll ? s.secret : null,
          }
        : null;

      const nominatedBy = (id: string) =>
        s.phase === 'discuss' || s.phase === 'vote'
          ? Object.entries(s.nominations)
              .filter(([, t]) => t === id)
              .map(([by]) => by)
          : [];

      return {
        phase: s.phase,
        day: s.day,
        session: s.session,
        nightSteps: s.nightSteps,
        nightStep: currentStep(s),
        endsAt: s.endsAt,
        serverNow: s.clock(),
        seats: s.seats.map((id) => ({
          id,
          alive: !s.dead.includes(id),
          role: over || (s.dead.includes(id) && s.settings.revealRoles) ? s.roles[id]! : null,
          ready: s.phase === 'discuss' && s.ready.includes(id),
          voted: s.phase === 'vote' && id in s.votes,
          nominatedBy: nominatedBy(id),
        })),
        roleCounts: s.counts,
        candidates: s.phase === 'discuss' || s.phase === 'vote' ? s.candidates : [],
        runoff: s.phase === 'vote' && s.voteRound === 2,
        liveVotes: s.phase === 'vote' && s.settings.openVotes ? { ...s.votes } : null,
        myVote: s.phase === 'vote' && playerId in s.votes ? { target: s.votes[playerId] ?? null } : null,
        myNomination: s.phase === 'discuss' ? (s.nominations[playerId] ?? null) : null,
        lastNight: s.lastNight,
        lastVote: s.lastVote,
        hunter: s.phase === 'hunter' ? s.hunter : null,
        log: s.log,
        me,
        ghost,
        winner: s.winner,
        winReason: s.winReason,
        roles: over ? { ...s.roles } : null,
        lovers: over ? s.lovers : null,
        secret: over ? s.secret : null,
        finishAt: s.finishAt,
      };
    },

    dispose(s) {
      s.cancelTimer?.();
      stopTick(s);
    },
  };
}
