import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  GAME_ID,
  actionSchema,
  defaultSettings,
  settingsSchema,
  type Card,
  type CardResult,
  type CharadesAction,
  type CharadesPhase,
  type CharadesSettings,
  type CharadesView,
  type Role,
  type TeamId,
  type TurnSummary,
} from '../shared/index.js';
import type { TitleBank } from './titles.js';

export const PODIUM_MS = 8000;
const MIN_TEAM = 2;

export class GameError extends UserFacingError {}

export interface CharadesTiming {
  podiumMs: number;
}

interface Turn {
  team: TeamId;
  narratorId: string;
  startedAt: number;
  endsAt: number;
  passesLeft: number | null;
  card: Card | null;
  log: { card: Card; result: CardResult }[];
}

export interface CharadesState {
  settings: CharadesSettings;
  teams: Record<TeamId, string[]>;
  scores: Record<TeamId, number>;
  phase: CharadesPhase;
  /** Tamamlanan anlatma sayısı. */
  turnNumber: number;
  totalTurns: number | null;
  /** Sıradaki/şu anki anlatan takım. */
  team: TeamId;
  narratorIdx: Record<TeamId, number>;
  pile: Card[];
  used: Set<string>;
  turn: Turn | null;
  lastTurn: TurnSummary | null;
  flash: CharadesView['flash'];
  flashSeq: number;
  cancelTimer: (() => void) | null;
}

const other = (t: TeamId): TeamId => (t === 'a' ? 'b' : 'a');

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Ayarlardaki takımlar + takımı seçilmemiş oyuncular (küçük takıma). */
export function buildTeams(settings: CharadesSettings, playerIds: string[]): Record<TeamId, string[]> {
  const present = new Set(playerIds);
  const teams: Record<TeamId, string[]> = {
    a: settings.teams.a.filter((id) => present.has(id)),
    b: settings.teams.b.filter((id) => present.has(id) && !settings.teams.a.includes(id)),
  };
  for (const id of shuffle(playerIds.filter((id) => !teams.a.includes(id) && !teams.b.includes(id)))) {
    (teams.a.length <= teams.b.length ? teams.a : teams.b).push(id);
  }
  return teams;
}

export function createCharadesGame(deps: {
  bank: TitleBank;
  timing?: Partial<CharadesTiming>;
}): ServerGame<CharadesSettings, CharadesState, CharadesAction> {
  const { bank } = deps;
  const timing: CharadesTiming = { podiumMs: PODIUM_MS, ...deps.timing };

  function teamOf(state: CharadesState, id: string): TeamId | null {
    if (state.teams.a.includes(id)) return 'a';
    if (state.teams.b.includes(id)) return 'b';
    return null;
  }

  function connectedIds(ctx: GameContext): Set<string> {
    return new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  }

  /** Takımın sıradaki anlatıcısı; bağlantısı olmayanlar atlanır. */
  function narratorFor(ctx: GameContext, state: CharadesState, team: TeamId): string {
    const list = state.teams[team];
    const online = connectedIds(ctx);
    for (let k = 0; k < list.length; k++) {
      const idx = (state.narratorIdx[team] + k) % list.length;
      if (online.has(list[idx]!)) {
        state.narratorIdx[team] = idx;
        return list[idx]!;
      }
    }
    return list[state.narratorIdx[team] % list.length]!;
  }

  function draw(state: CharadesState): Card {
    if (!state.pile.length) {
      const all = bank.cards(state.settings.categories, state.settings.difficulty);
      let fresh = all.filter((c) => !state.used.has(c.id));
      if (!fresh.length) {
        state.used.clear();
        fresh = all;
      }
      state.pile = shuffle(fresh);
    }
    const card = state.pile.shift()!;
    state.used.add(card.id);
    return card;
  }

  function beginTurn(ctx: GameContext, state: CharadesState): void {
    const narratorId = narratorFor(ctx, state, state.team);
    const now = ctx.now();
    state.turn = {
      team: state.team,
      narratorId,
      startedAt: now,
      endsAt: now + state.settings.seconds * 1000,
      passesLeft: state.settings.passes < 0 ? null : state.settings.passes,
      card: draw(state),
      log: [],
    };
    state.flash = null;
    state.phase = 'turn';
    state.cancelTimer?.();
    state.cancelTimer = ctx.schedule(state.settings.seconds * 1000, () => endTurn(ctx, state));
    ctx.pushViews();
  }

  /** Tur özeti: işaretlenen kartlar herkese açılır. */
  function summarize(state: CharadesState, turn: Turn): TurnSummary {
    const penalty = state.settings.foulPenalty ? -1 : 0;
    return {
      team: turn.team,
      narratorId: turn.narratorId,
      points: turn.log.reduce((n, l) => n + (l.result === 'correct' ? 1 : l.result === 'foul' ? penalty : 0), 0),
      cards: turn.log.map((l) => ({ title: l.card.title, kind: l.card.kind, result: l.result })),
    };
  }

  function endTurn(ctx: GameContext, state: CharadesState): void {
    const turn = state.turn;
    if (!turn || state.phase !== 'turn') return;
    state.cancelTimer?.();
    state.cancelTimer = null;
    // Yarım kalan kart desteye geri döner; özet ekranında gösterilmez.
    if (turn.card) {
      state.used.delete(turn.card.id);
      state.pile.push(turn.card);
    }
    state.lastTurn = summarize(state, turn);
    state.turn = null;
    state.flash = null;
    state.turnNumber++;
    state.narratorIdx[turn.team]++;
    state.team = other(turn.team);
    if (state.totalTurns !== null && state.turnNumber >= state.totalTurns) return podium(ctx, state);
    state.phase = 'ready';
    ctx.pushViews();
  }

  function podium(ctx: GameContext, state: CharadesState): void {
    if (state.phase === 'podium') return;
    // Tur ortasında bitirilirse o ana kadarki kartlar özete girer.
    if (state.phase === 'turn' && state.turn?.log.length) state.lastTurn = summarize(state, state.turn);
    state.cancelTimer?.();
    state.phase = 'podium';
    state.turn = null;
    state.flash = null;
    ctx.pushViews();
    state.cancelTimer = ctx.schedule(timing.podiumMs, () => {
      ctx.finish(
        (['a', 'b'] as const).flatMap((team) =>
          state.teams[team].map((id) => ({ playerId: id, score: state.scores[team], meta: { team } })),
        ),
      );
    });
  }

  function nextCard(state: CharadesState, result: CardResult): void {
    const turn = state.turn!;
    turn.log.push({ card: turn.card!, result });
    state.flash = { id: ++state.flashSeq, kind: result, title: turn.card!.title };
    turn.card = draw(state);
  }

  function roleOf(state: CharadesState, id: string): Role {
    if (state.turn?.narratorId === id) return 'narrator';
    const mine = teamOf(state, id);
    if (!mine) return 'spectator';
    const active = state.turn?.team ?? state.team;
    return mine === active ? 'guesser' : 'watcher';
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_TEAM * 2,
    maxPlayers: 16,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (!bank.cards(settings.categories, settings.difficulty).length) {
        return 'Seçili türlerde bu zorlukta başlık yok. Başka tür ya da zorluk seç.';
      }
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      const teams = buildTeams(settings, ids);
      if (teams.a.length < MIN_TEAM || teams.b.length < MIN_TEAM) {
        throw new GameError(`Her takımda en az ${MIN_TEAM} kişi olmalı. Lobiden takımları düzenle.`);
      }
      const state: CharadesState = {
        settings,
        teams,
        scores: { a: 0, b: 0 },
        phase: 'ready',
        turnNumber: 0,
        totalTurns: settings.turns === 0 ? null : settings.turns * 2,
        team: 'a',
        narratorIdx: { a: 0, b: 0 },
        pile: [],
        used: new Set(),
        turn: null,
        lastTurn: null,
        flash: null,
        flashSeq: 0,
        cancelTimer: null,
      };
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      const turn = state.turn;

      switch (action.type) {
        case 'start': {
          if (state.phase !== 'ready') throw new GameError('Tur zaten başladı.');
          const narratorId = narratorFor(ctx, state, state.team);
          if (playerId !== narratorId && !isHost) throw new GameError('Turu anlatıcı başlatır.');
          beginTurn(ctx, state);
          return { ok: true };
        }
        case 'skipNarrator': {
          if (!isHost) throw new GameError('Anlatıcıyı yalnızca oda sahibi atlayabilir.');
          if (state.phase !== 'ready') throw new GameError('Anlatıcı tur başlamadan değiştirilebilir.');
          state.narratorIdx[state.team]++;
          narratorFor(ctx, state, state.team);
          ctx.pushViews();
          return { ok: true };
        }
        case 'correct':
        case 'pass': {
          if (state.phase !== 'turn' || !turn) throw new GameError('Şu anda tur yok.');
          if (playerId !== turn.narratorId) throw new GameError('Kartı anlatıcı işaretler.');
          if (turn.card?.id !== action.cardId) return { ok: true, stale: true };
          if (action.type === 'pass') {
            if (turn.passesLeft !== null && turn.passesLeft <= 0) throw new GameError('Pas hakkın bitti. Anlatmaya devam et.');
            if (turn.passesLeft !== null) turn.passesLeft--;
          } else {
            state.scores[turn.team]++;
          }
          nextCard(state, action.type);
          ctx.pushViews();
          return { ok: true };
        }
        case 'foul': {
          if (state.phase !== 'turn' || !turn) throw new GameError('Şu anda tur yok.');
          const mine = teamOf(state, playerId);
          if (!mine || mine === turn.team) throw new GameError('“Konuştu!” düğmesi rakip takım içindir.');
          // Aynı karta iki kişi birden basarsa yalnızca ilki sayılır.
          if (turn.card?.id !== action.cardId) return { ok: true, stale: true };
          if (state.settings.foulPenalty) state.scores[turn.team]--;
          nextCard(state, 'foul');
          ctx.pushViews();
          return { ok: true };
        }
        case 'undo': {
          if (state.phase !== 'turn' || !turn) throw new GameError('Şu anda tur yok.');
          if (playerId !== turn.narratorId) throw new GameError('Yalnızca anlatıcı geri alabilir.');
          const last = turn.log.pop();
          if (!last) throw new GameError('Geri alınacak bir şey yok.');
          if (last.result === 'correct') state.scores[turn.team]--;
          if (last.result === 'foul' && state.settings.foulPenalty) state.scores[turn.team]++;
          if (last.result === 'pass' && turn.passesLeft !== null) turn.passesLeft++;
          if (turn.card) {
            state.used.delete(turn.card.id);
            state.pile.unshift(turn.card);
          }
          turn.card = last.card;
          state.flash = null;
          ctx.pushViews();
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!teamOf(state, playerId)) (state.teams.a.length <= state.teams.b.length ? state.teams.a : state.teams.b).push(playerId);
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      // Anlatıcı odadan çıkarsa tur, o ana kadarki puanlarla biter; sıradaki takıma geçilir.
      if (state.phase === 'turn' && state.turn?.narratorId === playerId) return endTurn(ctx, state);
      ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      const poolChanged =
        settings.categories.join() !== state.settings.categories.join() || settings.difficulty !== state.settings.difficulty;
      state.settings = settings;
      if (poolChanged) state.pile = [];
      state.totalTurns = settings.turns === 0 ? null : Math.max(settings.turns * 2, state.turnNumber + 1);
      // Takım değişiklikleri tur arasında ve iki takımda en az 2 kişi kalacaksa uygulanır.
      const teams = buildTeams(settings, ctx.players().map((p) => p.id));
      if (teams.a.length >= MIN_TEAM && teams.b.length >= MIN_TEAM && state.phase !== 'turn') state.teams = teams;
      ctx.pushViews();
    },

    end(ctx, state) {
      podium(ctx, state);
    },

    viewFor(state, playerId): CharadesView {
      const turn = state.turn;
      const role = roleOf(state, playerId);
      const list = state.teams[state.team];
      const narratorId = turn?.narratorId ?? list[state.narratorIdx[state.team] % list.length]!;
      const seesCard = state.phase === 'turn' && (role === 'narrator' || role === 'watcher');
      const stats: Record<CardResult, number> = { correct: 0, pass: 0, foul: 0 };
      for (const l of turn?.log ?? []) stats[l.result]++;
      const flash = state.phase === 'turn' && state.flash ? { ...state.flash, title: seesCard ? state.flash.title : null } : null;
      return {
        phase: state.phase,
        teams: state.teams,
        scores: state.scores,
        myTeam: teamOf(state, playerId),
        role,
        turnNumber: state.turnNumber,
        totalTurns: state.totalTurns,
        team: turn?.team ?? state.team,
        narratorId,
        serverNow: Date.now(),
        endsAt: turn?.endsAt ?? 0,
        durationMs: state.settings.seconds * 1000,
        passesLeft: turn ? turn.passesLeft : state.settings.passes < 0 ? null : state.settings.passes,
        turnStats: stats,
        card: seesCard ? (turn?.card ?? null) : null,
        canUndo: role === 'narrator' && !!turn?.log.length,
        flash,
        lastTurn: state.lastTurn,
        foulPenalty: state.settings.foulPenalty,
      };
    },

    dispose(state) {
      state.cancelTimer?.();
    },
  };
}
