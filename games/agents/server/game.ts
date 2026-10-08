import { UserFacingError, type GameContext, type ServerGame } from '@songie/game-kit/server';
import {
  BOARD_SIZE,
  GAME_ID,
  KEY_COUNTS,
  TEAM_IDS,
  UNLIMITED,
  actionSchema,
  clueProblem,
  defaultSettings,
  settingsSchema,
  type AgentsAction,
  type AgentsPhase,
  type AgentsSettings,
  type AgentsView,
  type CardColor,
  type ClueEntry,
  type EndReason,
  type Role,
  type TeamId,
} from '../shared/index.js';
import { wordsFor, type WordPacks } from './words.js';

export const CLOSING_MS = 8000;
export const MIN_TEAM = 2;
export const MAX_PLAYERS = 16;

export class GameError extends UserFacingError {}

export interface AgentsTiming {
  /** "Oyunu bitir"den sonra anahtarın gösterildiği süre. */
  closingMs: number;
}

interface Card {
  word: string;
  color: CardColor;
  revealed: boolean;
}

export interface AgentsState {
  settings: AgentsSettings;
  teams: Record<TeamId, string[]>;
  leaders: Record<TeamId, string>;
  /** Tablo bitince oda sahibinin sıradaki tablo için seçtiği liderler. */
  nextLeaders: Partial<Record<TeamId, string>>;
  /** Oda sahibi oyun sırasında takımları değiştirdi; sıradaki tabloda uygulanır. */
  pendingTeams: boolean;
  board: number;
  turn: number;
  cards: Card[];
  startTeam: TeamId;
  team: TeamId;
  phase: AgentsPhase;
  clue: { word: string; number: number } | null;
  guessesLeft: number | null;
  /** Oylama modu: oyuncu → kart. */
  votes: Record<string, number>;
  votesNeeded: number;
  log: ClueEntry[];
  endsAt: number;
  durationMs: number;
  cancelTimer: (() => void) | null;
  winner: TeamId | null;
  reason: EndReason | null;
  wins: Record<TeamId, number>;
  closing: boolean;
  finished: boolean;
  lastReveal: AgentsView['lastReveal'];
  revealSeq: number;
  /** Önceki tablolarda çıkan kelimeler (tekrar etmesin). */
  used: Set<string>;
}

export const other = (t: TeamId): TeamId => (t === 'a' ? 'b' : 'a');

export function createAgentsGame(deps: {
  packs: WordPacks;
  timing?: Partial<AgentsTiming>;
  random?: () => number;
}): ServerGame<AgentsSettings, AgentsState, AgentsAction> {
  const timing: AgentsTiming = { closingMs: CLOSING_MS, ...deps.timing };
  const rand = deps.random ?? Math.random;

  function shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  }

  /** Ayarlardaki takımlar + takımı seçilmemiş oyuncular (küçük takıma). */
  function buildTeams(settings: AgentsSettings, playerIds: string[]): Record<TeamId, string[]> {
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

  function online(ctx: GameContext): Set<string> {
    return new Set(ctx.players().filter((p) => p.connected).map((p) => p.id));
  }

  function teamOf(state: AgentsState, id: string): TeamId | null {
    if (state.teams.a.includes(id)) return 'a';
    if (state.teams.b.includes(id)) return 'b';
    return null;
  }

  function roleOf(state: AgentsState, id: string): Role {
    const t = teamOf(state, id);
    if (!t) return 'spectator';
    return state.leaders[t] === id ? 'leader' : 'guesser';
  }

  function randomLeader(ctx: GameContext, members: string[]): string {
    const on = online(ctx);
    const pool = members.filter((id) => on.has(id));
    const list = pool.length ? pool : members;
    return list[Math.floor(rand() * list.length)]!;
  }

  /** Takımda `current`ten sonraki (bağlı) oyuncu. */
  function nextLeader(ctx: GameContext, members: string[], current: string): string {
    const on = online(ctx);
    const start = members.indexOf(current);
    for (let k = 1; k <= members.length; k++) {
      const id = members[(start + k + members.length) % members.length]!;
      if (on.has(id)) return id;
    }
    return members[(start + 1 + members.length) % members.length]!;
  }

  function dealBoard(state: AgentsState): void {
    const all = wordsFor(deps.packs, state.settings.packs);
    let fresh = all.filter((w) => !state.used.has(w));
    if (fresh.length < BOARD_SIZE) {
      state.used.clear();
      fresh = all;
    }
    const words = shuffle(fresh).slice(0, BOARD_SIZE);
    for (const w of words) state.used.add(w);
    const s = state.startTeam;
    const colors: CardColor[] = [
      ...Array<CardColor>(KEY_COUNTS.start).fill(s),
      ...Array<CardColor>(KEY_COUNTS.other).fill(other(s)),
      ...Array<CardColor>(KEY_COUNTS.neutral).fill('neutral'),
      ...Array<CardColor>(KEY_COUNTS.assassin).fill('assassin'),
    ];
    const key = shuffle(colors);
    state.cards = words.map((word, i) => ({ word, color: key[i]!, revealed: false }));
  }

  function remaining(state: AgentsState, team: TeamId): number {
    return state.cards.filter((c) => c.color === team && !c.revealed).length;
  }

  function clearTimer(state: AgentsState): void {
    state.cancelTimer?.();
    state.cancelTimer = null;
  }

  function arm(ctx: GameContext, state: AgentsState): void {
    clearTimer(state);
    if (state.settings.timer === 'off') {
      state.endsAt = 0;
      state.durationMs = 0;
      return;
    }
    const ms = state.settings.seconds * 1000;
    const turn = state.turn;
    state.durationMs = ms;
    state.endsAt = ctx.now() + ms;
    state.cancelTimer = ctx.schedule(ms, () => {
      if (state.turn !== turn || state.phase === 'over') return;
      if (state.phase === 'clue') {
        state.log.push({ team: state.team, leaderId: state.leaders[state.team], word: null, number: 0, picks: [] });
      }
      passTurn(ctx, state);
    });
  }

  function beginClue(ctx: GameContext, state: AgentsState, team: TeamId): void {
    state.turn++;
    state.team = team;
    state.phase = 'clue';
    state.clue = null;
    state.guessesLeft = null;
    state.votes = {};
    votesNeeded(ctx, state);
    arm(ctx, state);
    ctx.pushViews();
  }

  function passTurn(ctx: GameContext, state: AgentsState): void {
    beginClue(ctx, state, other(state.team));
  }

  function newBoard(ctx: GameContext, state: AgentsState, first: boolean): void {
    if (!first) {
      if (state.pendingTeams) {
        const teams = buildTeams(state.settings, ctx.players().map((p) => p.id));
        if (teams.a.length >= MIN_TEAM && teams.b.length >= MIN_TEAM) state.teams = teams;
        state.pendingTeams = false;
      }
      for (const t of TEAM_IDS) {
        const members = state.teams[t];
        const picked = state.nextLeaders[t];
        state.leaders[t] = picked && members.includes(picked) ? picked : nextLeader(ctx, members, state.leaders[t]);
      }
      state.nextLeaders = {};
      state.startTeam = other(state.startTeam);
    }
    state.board++;
    state.winner = null;
    state.reason = null;
    state.log = [];
    state.lastReveal = null;
    dealBoard(state);
    beginClue(ctx, state, state.startTeam);
  }

  function finishBoard(ctx: GameContext, state: AgentsState, winner: TeamId | null, reason: EndReason): void {
    clearTimer(state);
    state.phase = 'over';
    state.winner = winner;
    state.reason = reason;
    state.votes = {};
    state.endsAt = 0;
    if (winner) state.wins[winner]++;
    ctx.pushViews();
  }

  function finishGame(ctx: GameContext, state: AgentsState): void {
    if (state.finished) return;
    state.finished = true;
    clearTimer(state);
    ctx.finish(
      TEAM_IDS.flatMap((t) =>
        state.teams[t].map((id) => ({
          playerId: id,
          score: state.wins[t],
          meta: { team: t, boards: state.board, wins: { ...state.wins }, leader: state.leaders[t] === id },
        })),
      ),
    );
  }

  function eligibleVoters(ctx: GameContext, state: AgentsState): string[] {
    const on = online(ctx);
    return state.teams[state.team].filter((id) => id !== state.leaders[state.team] && on.has(id));
  }

  /** Bağlı tahmincilerin çoğunluğu. Görünüm için `state.votesNeeded`e de yazılır. */
  function votesNeeded(ctx: GameContext, state: AgentsState): number {
    state.votesNeeded = Math.max(1, Math.floor(eligibleVoters(ctx, state).length / 2) + 1);
    return state.votesNeeded;
  }

  /** Bir kart açılır; kurallara göre sıra devam eder, geçer ya da tablo biter. */
  function reveal(ctx: GameContext, state: AgentsState, index: number): void {
    const card = state.cards[index]!;
    const team = state.team;
    card.revealed = true;
    state.votes = {};
    state.lastReveal = { id: ++state.revealSeq, index, color: card.color };
    state.log.at(-1)?.picks.push({ word: card.word, color: card.color });

    if (card.color === 'assassin') return finishBoard(ctx, state, other(team), 'assassin');
    for (const t of [team, other(team)] as TeamId[]) {
      if (remaining(state, t) === 0) return finishBoard(ctx, state, t, 'agents');
    }
    if (card.color !== team) return passTurn(ctx, state);
    if (state.guessesLeft !== null) {
      state.guessesLeft--;
      if (state.guessesLeft <= 0) return passTurn(ctx, state);
    }
    ctx.pushViews();
  }

  function checkVotes(ctx: GameContext, state: AgentsState): boolean {
    const need = votesNeeded(ctx, state);
    if (state.phase !== 'guess' || state.settings.revealMode !== 'vote') return false;
    const counts = new Map<number, number>();
    for (const i of Object.values(state.votes)) counts.set(i, (counts.get(i) ?? 0) + 1);
    for (const [i, n] of counts) {
      if (n >= need && !state.cards[i]!.revealed) {
        reveal(ctx, state, i);
        return true;
      }
    }
    return false;
  }

  function dropPlayer(state: AgentsState, id: string): void {
    delete state.votes[id];
  }

  return {
    id: GAME_ID,
    minPlayers: MIN_TEAM * 2,
    maxPlayers: MAX_PLAYERS,
    settingsSchema,
    defaultSettings,
    actionSchema,

    validateSettings(settings) {
      if (wordsFor(deps.packs, settings.packs).length < BOARD_SIZE) return 'Seçili paketlerde yeterli kelime yok. Başka bir paket ekle.';
      return null;
    },

    async start(ctx, settings) {
      const ids = ctx.players().filter((p) => p.connected).map((p) => p.id);
      const teams = buildTeams(settings, ids);
      if (teams.a.length < MIN_TEAM || teams.b.length < MIN_TEAM) {
        throw new GameError(`Her takımda en az ${MIN_TEAM} kişi olmalı. Lobiden takımları düzenle.`);
      }
      const leaders = {} as Record<TeamId, string>;
      for (const t of TEAM_IDS) {
        const chosen = settings.leaderPick === 'host' ? settings.leaders[t] : null;
        leaders[t] = chosen && teams[t].includes(chosen) ? chosen : randomLeader(ctx, teams[t]);
      }
      const state: AgentsState = {
        settings,
        teams,
        leaders,
        nextLeaders: {},
        pendingTeams: false,
        board: 0,
        turn: 0,
        cards: [],
        startTeam: rand() < 0.5 ? 'a' : 'b',
        team: 'a',
        phase: 'clue',
        clue: null,
        guessesLeft: null,
        votes: {},
        votesNeeded: 1,
        log: [],
        endsAt: 0,
        durationMs: 0,
        cancelTimer: null,
        winner: null,
        reason: null,
        wins: { a: 0, b: 0 },
        closing: false,
        finished: false,
        lastReveal: null,
        revealSeq: 0,
        used: new Set(),
      };
      newBoard(ctx, state, true);
      return state;
    },

    onAction(ctx, state, playerId, action) {
      const isHost = ctx.hostId() === playerId;
      if (state.closing) throw new GameError('Oyun bitti; lobiye dönülüyor.');

      switch (action.type) {
        case 'clue': {
          if (state.phase !== 'clue') throw new GameError('Şu anda ipucu sırası değil.');
          if (state.leaders[state.team] !== playerId) throw new GameError('İpucunu sırası gelen takımın lideri verir.');
          const hidden = state.cards.filter((c) => !c.revealed).map((c) => c.word);
          const problem = clueProblem(action.word, hidden);
          if (problem) throw new GameError(problem);
          const word = action.word.trim().toLocaleLowerCase('tr');
          state.clue = { word, number: action.number };
          // Sayı + 1 hak; 0 ya da sınırsız ipucunda hak sınırı yok (klasik kural).
          state.guessesLeft = action.number === UNLIMITED || action.number === 0 ? null : action.number + 1;
          state.log.push({ team: state.team, leaderId: playerId, word, number: action.number, picks: [] });
          state.phase = 'guess';
          state.votes = {};
          if (state.settings.timer === 'split') arm(ctx, state);
          ctx.pushViews();
          return { ok: true };
        }

        case 'touch': {
          if (action.turn !== state.turn || state.phase !== 'guess') return { ok: true, stale: true };
          const team = teamOf(state, playerId);
          if (team !== state.team) throw new GameError('Sıra rakip takımda; bekle.');
          if (state.leaders[team] === playerId) throw new GameError('Lider kartlara dokunamaz; takımın seçsin.');
          const card = state.cards[action.index]!;
          if (card.revealed) return { ok: true, stale: true };
          if (state.settings.revealMode === 'first') {
            reveal(ctx, state, action.index);
            return { ok: true, revealed: true };
          }
          if (state.votes[playerId] === action.index) delete state.votes[playerId];
          else state.votes[playerId] = action.index;
          if (checkVotes(ctx, state)) return { ok: true, revealed: true };
          ctx.pushViews();
          return { ok: true };
        }

        case 'endTurn': {
          if (action.turn !== state.turn || state.phase !== 'guess') return { ok: true, stale: true };
          const team = teamOf(state, playerId);
          if (team !== state.team || state.leaders[team] === playerId) {
            throw new GameError('Sırayı yalnızca tahmin eden takım bitirebilir.');
          }
          passTurn(ctx, state);
          return { ok: true };
        }

        case 'setLeader': {
          if (!isHost) throw new GameError('Lideri yalnızca oda sahibi değiştirebilir.');
          if (!state.teams[action.team].includes(action.playerId)) throw new GameError('Bu oyuncu o takımda değil.');
          if (state.phase === 'over') {
            state.nextLeaders[action.team] = action.playerId;
          } else {
            state.leaders[action.team] = action.playerId;
            dropPlayer(state, action.playerId);
            checkVotes(ctx, state);
          }
          ctx.pushViews();
          return { ok: true };
        }

        case 'newBoard': {
          if (!isHost) throw new GameError('Yeni tabloyu oda sahibi açar.');
          if (state.phase !== 'over') return { ok: true, stale: true };
          newBoard(ctx, state, false);
          return { ok: true };
        }

        case 'toLobby': {
          if (!isHost) throw new GameError('Lobiye dönmeye oda sahibi karar verir.');
          if (state.phase !== 'over') throw new GameError('Önce bu tablo bitmeli. Hemen bitirmek için “Oyunu bitir”i kullan.');
          finishGame(ctx, state);
          return { ok: true };
        }
      }
    },

    onPlayerJoin(ctx, state, playerId) {
      if (!teamOf(state, playerId)) (state.teams.a.length <= state.teams.b.length ? state.teams.a : state.teams.b).push(playerId);
      votesNeeded(ctx, state);
      ctx.pushViews();
    },

    onPlayerLeave(ctx, state, playerId) {
      const team = teamOf(state, playerId);
      dropPlayer(state, playerId);
      if (team) {
        state.teams[team] = state.teams[team].filter((id) => id !== playerId);
        if (state.nextLeaders[team] === playerId) delete state.nextLeaders[team];
        if (state.leaders[team] === playerId && state.teams[team].length) {
          state.leaders[team] = randomLeader(ctx, state.teams[team]);
          dropPlayer(state, state.leaders[team]);
        }
      }
      if (!checkVotes(ctx, state)) ctx.pushViews();
    },

    onPlayerConnection(ctx, state) {
      // Oylama çoğunluğu bağlı tahmincilere göre; kopan biri yüzünden kart askıda kalmasın.
      if (state.phase === 'over') return;
      if (!checkVotes(ctx, state)) ctx.pushViews();
    },

    onSettings(ctx, state, settings) {
      if (JSON.stringify(settings.teams) !== JSON.stringify(state.settings.teams)) state.pendingTeams = true;
      const modeChanged = settings.revealMode !== state.settings.revealMode;
      state.settings = settings;
      // Oylama/ilk dokunuş hemen; süre sıradaki sıradan, paketler sıradaki tablodan itibaren.
      if (modeChanged) state.votes = {};
      ctx.pushViews();
    },

    end(ctx, state) {
      if (state.closing || state.finished) return;
      if (state.phase !== 'over') finishBoard(ctx, state, null, 'ended');
      state.closing = true;
      ctx.pushViews();
      ctx.schedule(timing.closingMs, () => finishGame(ctx, state));
    },

    viewFor(state, playerId): AgentsView {
      const myTeam = teamOf(state, playerId);
      const role = roleOf(state, playerId);
      const keyVisible = state.phase === 'over' || role === 'leader';
      const showVotes = state.phase === 'guess' && state.settings.revealMode === 'vote';
      const votesBy: string[][] = state.cards.map(() => []);
      if (showVotes) for (const [id, i] of Object.entries(state.votes)) votesBy[i]?.push(id);
      return {
        phase: state.phase,
        board: state.board,
        turn: state.turn,
        cards: state.cards.map((c, i) => ({
          word: c.word,
          color: c.revealed || keyVisible ? c.color : null,
          revealed: c.revealed,
          votes: votesBy[i]!,
        })),
        keyVisible,
        teams: state.teams,
        leaders: state.leaders,
        nextLeaders: state.nextLeaders,
        myTeam,
        role,
        team: state.team,
        startTeam: state.startTeam,
        remaining: { a: remaining(state, 'a'), b: remaining(state, 'b') },
        total: {
          a: state.cards.filter((c) => c.color === 'a').length,
          b: state.cards.filter((c) => c.color === 'b').length,
        },
        clue: state.phase === 'guess' ? state.clue : null,
        guessesLeft: state.guessesLeft,
        log: state.log,
        revealMode: state.settings.revealMode,
        votesNeeded: state.votesNeeded,
        serverNow: Date.now(),
        endsAt: state.endsAt,
        durationMs: state.durationMs,
        winner: state.winner,
        reason: state.reason,
        wins: state.wins,
        closing: state.closing,
        lastReveal: state.lastReveal,
      };
    },

    dispose(state) {
      clearTimer(state);
    },
  };
}
