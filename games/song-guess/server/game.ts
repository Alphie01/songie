import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  STAGE_CLIPS,
  STAGE_COUNT,
  actionSchema,
  defaultSettings,
  scoreFor,
  settingsSchema,
  type FeedItem,
  type FeedKind,
  type GuessRecord,
  type PlayerRoundState,
  type RevealInfo,
  type SongAction,
  type SongPhase,
  type SongSettings,
  type SongView,
  type Verdict,
} from '../shared/index.js';
import type { Catalog, TrackRow } from './catalog/catalog.js';
import { NoPreviewError, type MediaRound, type MediaService } from './media.js';

export const COUNTDOWN_MS = 3000;
/** Süreli oyunda sonuç ekranı bu kadar açık kalır (herkes hazırsa daha erken geçer). */
export const REVEAL_MS = 12000;
export const PODIUM_MS = 7000;
/** Süresiz oyunda hız bonusu bu pencereye göre hesaplanır. */
export const UNTIMED_SPEED_WINDOW_MS = 15000;
const BATCH = 30;
const RECENT_KEEP = 400;
const FEED_KEEP = 14;

export class GameError extends UserFacingError {}

interface PlayerState {
  id: string;
  score: number;
  roundPoints: number;
  solved: 'none' | 'artist' | 'correct';
  solvedStage: number | null;
  artistPoints: number;
  stageLock: 'none' | 'locked' | 'skipped';
  guesses: GuessRecord[];
  streak: number;
  bestStreak: number;
  ready: boolean;
}

interface Prepared {
  track: TrackRow;
  media: MediaRound;
}

export interface SongState {
  settings: SongSettings;
  poolNames: string[];
  queue: TrackRow[];
  used: Set<number>;
  round: number;
  /** null = sınırsız. */
  total: number | null;
  phase: SongPhase;
  stage: number;
  phaseStartedAt: number;
  phaseMs: number;
  current: Prepared | null;
  next: Promise<Prepared | null> | null;
  players: Map<string, PlayerState>;
  firstSolved: boolean;
  reveal: RevealInfo | null;
  ending: boolean;
  feed: FeedItem[];
  feedSeq: number;
  cancelPhase: (() => void) | null;
  disposed: boolean;
}

export interface SongTiming {
  countdownMs: number;
  revealMs: number;
  podiumMs: number;
}

/** Aynı odada art arda oynanan oyunlarda şarkı tekrarını azaltmak için. */
const recentByRoom = new Map<string, number[]>();

export function createSongGame(deps: {
  catalog: Catalog;
  media: MediaService;
  timing?: Partial<SongTiming>;
}): ServerGame<SongSettings, SongState, SongAction> {
  const { catalog, media } = deps;
  const timing: SongTiming = { countdownMs: COUNTDOWN_MS, revealMs: REVEAL_MS, podiumMs: PODIUM_MS, ...deps.timing };

  function newPlayer(id: string): PlayerState {
    return {
      id,
      score: 0,
      roundPoints: 0,
      solved: 'none',
      solvedStage: null,
      artistPoints: 0,
      stageLock: 'none',
      guesses: [],
      streak: 0,
      bestStreak: 0,
      ready: false,
    };
  }

  function active(ctx: GameContext, state: SongState): PlayerState[] {
    return ctx
      .players()
      .filter((p) => p.connected && state.players.has(p.id))
      .map((p) => state.players.get(p.id)!);
  }

  function log(ctx: GameContext, state: SongState, playerId: string, kind: FeedKind, extra: Partial<FeedItem> = {}): void {
    state.feed.push({ id: ++state.feedSeq, at: ctx.now(), playerId, kind, stage: state.stage, ...extra });
    if (state.feed.length > FEED_KEEP) state.feed.splice(0, state.feed.length - FEED_KEEP);
  }

  function refill(ctx: GameContext, state: SongState): void {
    if (state.queue.length > 3) return;
    const recent = new Set([...(recentByRoom.get(ctx.roomCode) ?? []), ...state.used]);
    const more = catalog.pickTracks(state.settings.pools, BATCH, state.settings.difficulty, recent);
    state.queue.push(...more.filter((t) => !state.used.has(t.id)));
  }

  async function prepareNext(ctx: GameContext, state: SongState): Promise<Prepared | null> {
    for (let attempts = 0; attempts < 12; attempts++) {
      refill(ctx, state);
      const track = state.queue.shift();
      if (!track || state.disposed) return null;
      if (state.used.has(track.id)) continue;
      state.used.add(track.id);
      try {
        const m = await media.prepare(track.id, state.settings.startAt);
        if (state.disposed) {
          media.release(m.token);
          return null;
        }
        return { track, media: m };
      } catch (err) {
        if (!(err instanceof NoPreviewError)) ctx.log('prepare failed', { track: track.id, err: String(err) });
      }
    }
    return null;
  }

  /** `ms` null ise süresiz: aşama yalnızca oyuncuların hamleleriyle ilerler. */
  function setPhase(ctx: GameContext, state: SongState, phase: SongPhase, ms: number | null, then?: () => void): void {
    state.cancelPhase?.();
    state.cancelPhase = null;
    state.phase = phase;
    state.phaseStartedAt = ctx.now();
    state.phaseMs = ms ?? 0;
    if (ms !== null && then) state.cancelPhase = ctx.schedule(ms, then);
    ctx.pushViews();
  }

  function beginRound(ctx: GameContext, state: SongState, prepared: Prepared): void {
    if (state.current) media.release(state.current.media.token);
    state.current = prepared;
    state.round++;
    state.firstSolved = false;
    state.reveal = null;
    state.feed = [];
    for (const p of state.players.values()) {
      Object.assign(p, { roundPoints: 0, solved: 'none', solvedStage: null, artistPoints: 0, stageLock: 'none', guesses: [], ready: false });
    }
    const recent = recentByRoom.get(ctx.roomCode) ?? [];
    recent.push(prepared.track.id);
    recentByRoom.set(ctx.roomCode, recent.slice(-RECENT_KEEP));
    // Sonraki şarkıyı bu tur sürerken hazırla.
    const more = state.total === null || state.round < state.total;
    state.next = more ? prepareNext(ctx, state) : null;
    // Başlangıç aşamasından önceki klipler de açılır (tekrar dinlenebilir).
    for (let i = 0; i < state.settings.startStage; i++) media.unlock(prepared.media.token, i);
    setPhase(ctx, state, 'countdown', timing.countdownMs, () => beginStage(ctx, state, state.settings.startStage));
  }

  function beginStage(ctx: GameContext, state: SongState, stage: number): void {
    state.stage = stage;
    media.unlock(state.current!.media.token, stage);
    for (const p of state.players.values()) if (p.solved !== 'correct') p.stageLock = 'none';
    const timed = state.settings.timer > 0;
    setPhase(ctx, state, 'stage', timed ? state.settings.timer * 1000 : null, () => endStage(ctx, state));
  }

  function endStage(ctx: GameContext, state: SongState): void {
    if (state.phase !== 'stage') return;
    if (state.stage < STAGE_COUNT - 1) beginStage(ctx, state, state.stage + 1);
    else doReveal(ctx, state);
  }

  function doReveal(ctx: GameContext, state: SongState): void {
    const { track, media: m } = state.current!;
    media.reveal(m.token);
    for (const p of state.players.values()) {
      p.ready = false;
      if (p.solved === 'correct') {
        p.streak++;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
      } else {
        p.streak = 0;
      }
    }
    state.reveal = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.cover,
      year: null,
      link: `https://www.deezer.com/track/${track.id}`,
      previewUrl: media.urlFor(m.token, 'full'),
      results: [...state.players.values()]
        .filter((p) => p.solved !== 'none')
        .map((p) => ({ playerId: p.id, stage: p.solvedStage ?? 0, points: p.roundPoints, kind: p.solved as 'artist' | 'correct' }))
        .sort((a, b) => b.points - a.points),
    };
    const timed = state.settings.timer > 0;
    setPhase(ctx, state, 'reveal', timed ? timing.revealMs : null, () => void afterReveal(ctx, state));
  }

  async function afterReveal(ctx: GameContext, state: SongState): Promise<void> {
    if (state.phase !== 'reveal') return;
    const done = state.ending || (state.total !== null && state.round >= state.total);
    if (!done) {
      setPhase(ctx, state, 'loading', null);
      const next = await state.next;
      if (state.disposed) return;
      if (next && !state.ending) return beginRound(ctx, state, next);
      if (!next) ctx.log('ran out of tracks', { round: state.round });
    }
    podium(ctx, state);
  }

  function podium(ctx: GameContext, state: SongState): void {
    if (state.phase === 'podium') return;
    setPhase(ctx, state, 'podium', timing.podiumMs, () => {
      ctx.finish(
        [...state.players.values()].map((p) => ({ playerId: p.id, score: p.score, meta: { streak: p.bestStreak } })),
      );
    });
  }

  function displayState(p: PlayerState): PlayerRoundState {
    if (p.solved === 'correct') return 'correct';
    if (p.stageLock === 'locked') return 'locked';
    if (p.stageLock === 'skipped') return 'skipped';
    if (p.solved === 'artist') return 'artist';
    return 'listening';
  }

  function canGuess(state: SongState, p: PlayerState | undefined): boolean {
    return !!p && state.phase === 'stage' && p.solved !== 'correct' && p.stageLock === 'none';
  }

  /** Herkes bildiyse turu bitir; bilmeyen herkes yanlış tahmin ettiyse ya da pas dediyse sonraki aşamayı aç. */
  function checkEarly(ctx: GameContext, state: SongState): void {
    const people = active(ctx, state);
    if (!people.length) return;
    if (state.phase === 'reveal') {
      if (people.every((p) => p.ready)) void afterReveal(ctx, state);
      return;
    }
    if (state.phase !== 'stage') return;
    if (people.every((p) => p.solved === 'correct')) return doReveal(ctx, state);
    if (people.every((p) => p.solved === 'correct' || p.stageLock !== 'none')) endStage(ctx, state);
  }

  function judge(answer: TrackRow, guess: TrackRow): Verdict {
    if (guess.id === answer.id) return 'correct';
    const sameArtist = guess.norm_artist === answer.norm_artist;
    if (sameArtist && guess.norm_title === answer.norm_title) return 'correct';
    return sameArtist ? 'artist' : 'wrong';
  }

  return {
    id: GAME_ID,
    minPlayers: 1,
    maxPlayers: 12,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      const missing = catalog.missingPools(settings.pools);
      if (missing.length === settings.pools.length) return 'Seçili listeler bulunamadı. Lobiden yeniden liste seç.';
      return null;
    },

    async start(ctx, settings) {
      const players = ctx.players().filter((p) => p.connected);
      const pools = settings.pools.filter((id) => !catalog.missingPools([id]).length);
      const recent = new Set(recentByRoom.get(ctx.roomCode) ?? []);
      const total = settings.rounds === 0 ? null : settings.rounds;
      const queue = catalog.pickTracks(pools, (total ?? BATCH) + 8, settings.difficulty, recent);
      if (queue.length < Math.min(3, total ?? 3)) {
        throw new GameError('Seçtiğin listelerde yeterli şarkı yok. Başka bir liste ekle.');
      }
      const state: SongState = {
        settings: { ...settings, pools },
        poolNames: catalog.poolNames(pools),
        queue,
        used: new Set(),
        round: 0,
        total: total === null ? null : Math.min(total, queue.length),
        phase: 'loading',
        stage: 0,
        phaseStartedAt: ctx.now(),
        phaseMs: 0,
        current: null,
        next: null,
        players: new Map(players.map((p) => [p.id, newPlayer(p.id)])),
        firstSolved: false,
        reveal: null,
        ending: false,
        feed: [],
        feedSeq: 0,
        cancelPhase: null,
        disposed: false,
      };
      const first = await prepareNext(ctx, state);
      if (!first) throw new GameError('Şarkılar şu anda yüklenemiyor. Biraz sonra tekrar dene.');
      beginRound(ctx, state, first);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const me = state.players.get(playerId);
      if (!me) throw new GameError('Bu oyunda değilsin.');
      const isHost = ctx.hostId() === playerId;

      if (action.type === 'next') {
        if (state.phase !== 'reveal') throw new GameError('Şu anda geçilecek bir şarkı yok.');
        if (action.force) {
          if (!isHost) throw new GameError('Beklemeden yalnızca oda sahibi geçirebilir.');
          void afterReveal(ctx, state);
          return { ok: true };
        }
        me.ready = true;
        ctx.pushViews();
        checkEarly(ctx, state);
        return { ok: true };
      }

      if (action.type === 'advance') {
        if (!isHost) throw new GameError('Sonraki parçayı yalnızca oda sahibi açabilir.');
        endStage(ctx, state);
        return { ok: true };
      }

      if (!canGuess(state, me)) throw new GameError('Şu anda tahmin edemezsin.');
      if (action.type === 'skip') {
        me.stageLock = 'skipped';
        log(ctx, state, playerId, 'skip');
        ctx.pushViews();
        checkEarly(ctx, state);
        return { verdict: 'skipped' };
      }
      const guess = catalog.track(action.trackId);
      if (!guess) throw new GameError('Öneri listesinden bir şarkı seç.');
      const answer = state.current!.track;
      let verdict = judge(answer, guess);
      if (verdict === 'artist' && (!state.settings.artistCredit || me.solved === 'artist')) verdict = 'wrong';
      me.guesses.push({ stage: state.stage, title: guess.title, artist: guess.artist, verdict });

      const elapsedMs = ctx.now() - state.phaseStartedAt;
      const stageMs = state.settings.timer > 0 ? state.settings.timer * 1000 : UNTIMED_SPEED_WINDOW_MS;
      if (verdict === 'correct') {
        const pts = scoreFor({ stage: state.stage, elapsedMs, stageMs, kind: 'correct', first: !state.firstSolved });
        state.firstSolved = true;
        me.score += pts - me.artistPoints;
        me.roundPoints = pts;
        me.solved = 'correct';
        me.solvedStage = state.stage;
        log(ctx, state, playerId, 'correct', { points: pts });
      } else if (verdict === 'artist') {
        const pts = scoreFor({ stage: state.stage, elapsedMs, stageMs, kind: 'artist', first: false });
        me.score += pts;
        me.artistPoints = pts;
        me.roundPoints = pts;
        me.solved = 'artist';
        me.solvedStage = state.stage;
        me.stageLock = 'locked';
        log(ctx, state, playerId, 'artist', { points: pts });
      } else {
        me.stageLock = 'locked';
        log(ctx, state, playerId, 'wrong');
      }
      ctx.pushViews();
      checkEarly(ctx, state);
      return { verdict };
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!state.players.has(playerId)) state.players.set(playerId, newPlayer(playerId));
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state) {
      checkEarly(ctx, state);
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      const prev = state.settings;
      const pools = settings.pools.filter((id) => !catalog.missingPools([id]).length);
      state.settings = { ...settings, pools };
      state.poolNames = catalog.poolNames(pools);
      // Liste ya da zorluk değiştiyse sıradaki şarkılar yeni seçimden gelir.
      // (Arka planda hazırlanmış bir sonraki şarkı korunur; ondan sonrası yenilenir.)
      if (prev.pools.join() !== pools.join() || prev.difficulty !== settings.difficulty) state.queue = [];
      if (settings.rounds === 0) state.total = null;
      else state.total = Math.max(settings.rounds, state.round);
      if (state.total !== null && state.round < state.total && !state.next && state.phase !== 'podium') {
        state.next = prepareNext(ctx, state);
      }
      log(ctx, state, ctx.hostId(), 'settings', { text: `${state.poolNames.join(', ')}` });
      ctx.pushViews();
    },

    end(ctx, state) {
      state.ending = true;
      podium(ctx, state);
    },

    viewFor(state, playerId): SongView {
      const me = state.players.get(playerId);
      const token = state.current?.media.token;
      const shown = state.phase === 'reveal' || state.phase === 'podium';
      const unlocked = shown ? STAGE_COUNT - 1 : state.phase === 'stage' ? state.stage : state.settings.startStage - 1;
      return {
        phase: state.phase,
        round: state.round,
        totalRounds: state.total,
        stage: state.stage,
        stageClips: STAGE_CLIPS,
        serverNow: Date.now(),
        phaseEndsAt: state.phaseStartedAt + state.phaseMs,
        phaseMs: state.phaseMs,
        clips: STAGE_CLIPS.map((_, i) => (token && i <= unlocked ? media.urlFor(token, i) : null)),
        poolNames: state.poolNames,
        players: [...state.players.values()].map((p) => ({
          id: p.id,
          score: p.score,
          roundPoints: shown || p.id === playerId ? p.roundPoints : 0,
          state: displayState(p),
          solvedStage: p.solvedStage,
          streak: p.streak,
          bestStreak: p.bestStreak,
          ready: p.ready,
        })),
        me: {
          state: me ? displayState(me) : 'listening',
          canGuess: canGuess(state, me),
          guesses: me?.guesses ?? [],
        },
        reveal: shown ? state.reveal : null,
        timed: state.settings.timer > 0,
        startStage: state.settings.startStage,
        easySearch: state.settings.easySearch,
        pools: state.settings.pools,
        artistCredit: state.settings.artistCredit,
        difficulty: state.settings.difficulty,
        feed: state.feed,
      };
    },

    dispose(state) {
      state.disposed = true;
      state.cancelPhase?.();
      if (state.current) media.release(state.current.media.token);
      void state.next?.then((n) => n && media.release(n.media.token));
    },
  };
}
