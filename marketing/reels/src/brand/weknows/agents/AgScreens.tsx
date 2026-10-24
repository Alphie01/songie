import React from 'react';
import { FONT_BODY, FONT_DISPLAY } from '../../fonts';
import { KURT_W } from '../kurt/KurtScreens';
import { AG_TEXT as S, AG_UNLIMITED, agNum, clueProblem, trUpper, type AgKey, type AgTeam } from './agentsText';

export { AG_UNLIMITED, type AgKey, type AgTeam } from './agentsText';

/**
 * Ajanlar phone screens for ads, drawn at 390 CSS px like the design artboard. Wrap each in <Screen390> (kurt module).
 * Board screen (pill, counters, clue box, hint, 5×5 board, legend, İPUÇLARI, Sırayı bitir): Ajanlar.dc.html (390×844), values 1:1.
 * The artboard has no box-sizing reset, so its spans/divs are content-box (borders add to size: the 48 px count box is 54 px,
 * the assassin legend swatch 16 px); buttons are border-box (UA default), line-height normal, UA padding 1px 6px where unset.
 * Clue form and table-over head: games/agents/client/PlayView.tsx + agents.css (border-box, body line-height 1.45),
 * tokens from apps/web/src/styles/tokens.css. Every screen shares the artboard's shell, top row, counters, board and legend
 * so ad cuts between them do not jump.
 */

/* ---------- Tokens ---------- */

/** apps/web/src/styles/tokens.css (+ agents.css --ag-neutral). */
const T = {
  bg: '#2A1B6E',
  panel: '#3A2A8C',
  panel2: '#1F145A',
  paper: '#FFFFFF',
  paper2: '#F1ECFF',
  ink: '#0D0828',
  ink2: '#120C2E',
  inkSoft: '#4A4170',
  text: '#FFFFFF',
  text2: '#E4DCFF',
  text3: '#C9BEF5',
  mint: '#3EE0A8',
  yellow: '#FFD23F',
  pink: '#FF7AC6',
  sky: '#5AB8FF',
  lilac: '#B794FF',
  coral: '#FF8A5B',
  red: '#FF6B6B',
  violet: '#6E5FC4',
  neutral: '#E8E0C8',
  formError: '#C62F2F',
} as const;

/** Artboard COL / agents.css --c. */
export const AG_KEY_COLOR: Record<AgKey, string> = { g: T.mint, p: T.lilac, n: T.neutral, x: T.ink2 };
const TEAM_COLOR: Record<AgTeam, string> = { g: T.mint, p: T.lilac };
const TEAMS: AgTeam[] = ['g', 'p'];

/* ---------- Data ---------- */

export type AgCard = { word: string; key: AgKey };
export type AgClue = { by: string; word: string; count: number };
export type AgHistoryEntry = { team: AgTeam; word: string; count: number; found: string[] };

const W = ['BALIK', 'ANAHTAR', 'ARABA', 'BUZ', 'ATLAS', 'AYNA', 'BAHÇE', 'BULUT', 'BARDAK', 'BAYRAK', 'BEYİN', 'BIÇAK', 'BİLET', 'BİSİKLET', 'AĞAÇ', 'ASLAN', 'CADI', 'CAM', 'CÜZDAN', 'ÇANTA', 'ÇATAL', 'ÇEKİÇ', 'ÇİÇEK', 'DAVUL', 'BALON'];
const K: AgKey[] = ['g', 'n', 'n', 'g', 'p', 'n', 'g', 'g', 'n', 'p', 'g', 'x', 'p', 'g', 'g', 'g', 'p', 'n', 'g', 'p', 'n', 'p', 'n', 'p', 'p'];

/** The artboard's board (W + T): yeşil 9, mor 8, tarafsız 7, suikastçı BIÇAK. */
export const AG_BOARD: AgCard[] = W.map((word, i) => ({ word, key: K[i]! }));
/** The artboard's opened cards (`pre`): BAYRAK, AĞAÇ, ASLAN, DAVUL, BALON → Yeşil 7, Mor 5. */
export const AG_OPEN: number[] = [9, 14, 15, 23, 24];
/** The artboard's clue: Lider Deniz, SU 2. */
export const AG_CLUE: AgClue = { by: 'Deniz', word: 'SU', count: 2 };
/** The artboard's İPUÇLARI, newest first. */
export const AG_HISTORY: AgHistoryEntry[] = [
  { team: 'p', word: 'MÜZİK', count: 3, found: ['Davul', 'Balon', 'Bayrak'] },
  { team: 'g', word: 'ORMAN', count: 2, found: ['Ağaç', 'Aslan'] },
];

/** Agents of `team` not yet opened. */
export const agLeft = (board: AgCard[], open: number[], team: AgTeam) => board.filter((c, i) => c.key === team && !open.includes(i)).length;
const agTotal = (board: AgCard[], team: AgTeam) => board.filter((c) => c.key === team).length;

/* ---------- Shell ---------- */

/** Remotion pages are border-box; the artboard is not, so the subtree goes back to content-box; `.ag-web` parts are the web's border-box. */
const BOX = '.ag-art, .ag-art * { box-sizing: content-box; } .ag-art .ag-web, .ag-art .ag-web * { box-sizing: border-box; }';

/** Artboard root: #2A1B6E, Nunito, padding 18 16 22, column gap 12, line-height normal, overflow hidden. */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="ag-art"
    style={{
      position: 'relative',
      width: KURT_W,
      height: '100%',
      boxSizing: 'border-box',
      background: T.bg,
      color: T.text,
      fontFamily: FONT_BODY,
      padding: '18px 16px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflow: 'hidden',
    }}
  >
    <style>{BOX}</style>
    {children}
  </div>
);

const Fill = () => <div style={{ flex: 1 }} />;

/** UA <button> defaults the artboard relies on (border-box, centered, line-height normal). */
const btn: React.CSSProperties = { boxSizing: 'border-box', textAlign: 'center', lineHeight: 'normal', fontFamily: FONT_BODY, margin: 0 };

/* ---------- Shared pieces ---------- */

/** Pill + room code. `wins` (web `.ag-wins`) only when a table has been won in the room. */
const TopRow: React.FC<{ pill: string; wins?: Record<AgTeam, number> }> = ({ pill, wins }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: wins ? 10 : undefined }}>
    <span
      style={{
        padding: '7px 14px',
        borderRadius: 999,
        background: T.yellow,
        color: T.ink2,
        border: `3px solid ${T.ink}`,
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: 16,
        whiteSpace: 'nowrap',
      }}
    >
      {pill}
    </span>
    {wins && (wins.g > 0 || wins.p > 0) && (
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 800, color: T.text3 }}>
        <b style={{ color: T.mint }}>{wins.g}</b>–<b style={{ color: T.lilac }}>{wins.p}</b>
      </span>
    )}
    <span style={{ marginLeft: wins ? 'auto' : undefined, fontWeight: 800, fontSize: 13, letterSpacing: 2, color: T.text3 }}>{S.code}</span>
  </div>
);

/** Two counters; the turn team is filled + tilted (web `data-active`), "(sen)" on the viewer's team. */
const Counters: React.FC<{ board: AgCard[]; open: number[]; turn: AgTeam; me: AgTeam }> = ({ board, open, turn, me }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
    {TEAMS.map((t) => {
      const active = t === turn;
      return (
        <div
          key={t}
          style={{
            background: active ? TEAM_COLOR[t] : T.panel,
            color: active ? T.ink2 : T.text,
            border: `3px solid ${T.ink}`,
            borderRadius: 16,
            padding: '8px 12px',
            boxShadow: active ? `0 4px 0 ${T.ink}` : undefined,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transform: active ? 'rotate(-1deg)' : undefined,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 13 }}>
            {S.teamShort[t]}
            {me === t && ` (${S.play.you})`}
          </span>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{S.play.agents(agLeft(board, open, t))}</span>
        </div>
      );
    })}
  </div>
);

const clueLabel = (by: string) => (by.toLocaleLowerCase('tr') === S.play.you ? S.play.myClue : S.play.clueOf(by));

/** White clue box: label, word, "N hak kaldı" and the count in the turn team's colour. */
const ClueBox: React.FC<{ clue: AgClue; tries: number | null; turn: AgTeam }> = ({ clue, tries, turn }) => (
  <div
    style={{
      background: T.paper,
      color: T.ink2,
      border: `3px solid ${T.ink}`,
      borderRadius: 18,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    }}
  >
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5 }}>{trUpper(clueLabel(clue.by))}</span>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, lineHeight: 1 }}>{trUpper(clue.word)}</span>
    </span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontWeight: 800, fontSize: 13 }}>{S.play.guessesLeft(tries)}</span>
      <span
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: TEAM_COLOR[turn],
          border: `3px solid ${T.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 28,
        }}
      >
        {agNum(clue.count)}
      </span>
    </span>
  </div>
);

/** Clue phase seen by everyone but the turn's leader (web Status, no clue yet): "…" + "Sıra yeşil takımda". */
const ClueWaiting: React.FC<{ by: string; turn: AgTeam }> = ({ by, turn }) => (
  <div
    style={{
      background: T.paper,
      color: T.ink2,
      border: `3px solid ${T.ink}`,
      borderRadius: 18,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    }}
  >
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5 }}>{trUpper(clueLabel(by))}</span>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, lineHeight: 1, color: T.violet }}>{S.play.thinking}</span>
    </span>
    <span style={{ flex: 'none', padding: '4px 10px', border: `2px solid ${T.ink}`, borderRadius: 10, background: TEAM_COLOR[turn], fontSize: 13, fontWeight: 800 }}>
      {S.play.turnShort(S.team[turn])}
    </span>
  </div>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontWeight: 700, fontSize: 13, color: T.text2, textAlign: 'center' }}>{children}</span>
);

/* ---------- Board ---------- */

const AgentMark = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 9h16l-2-4H6z" />
    <circle cx={12} cy={13} r={3} />
    <path d="M6 21c0-3.5 2.7-5 6-5s6 1.5 6 5z" />
  </svg>
);

const AssassinMark = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
    <circle cx={12} cy={12} r={7} />
    <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
  </svg>
);

/**
 * 5×5 board. `keyed`: unopened cards show their key as the 8 px inset bottom bar (leader, and everyone once the table is over).
 * `pressing`: web `.ag-board[data-can] .ag-card:hover:active` (paper-2, 1 px shadow, 3 px down).
 */
const Board: React.FC<{ board: AgCard[]; open: number[]; keyed: boolean; pressing?: number | null }> = ({ board, open, keyed, pressing }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
    {board.slice(0, 25).map((c, i) => {
      const o = open.includes(i);
      const press = !o && pressing === i;
      const shadow = keyed && !o ? `inset 0 -8px 0 ${AG_KEY_COLOR[c.key]}, 0 ${press ? 1 : 4}px 0 ${T.ink}` : `0 ${o || press ? 1 : 4}px 0 ${T.ink}`;
      return (
        <div
          key={i}
          style={{
            ...btn,
            minHeight: 62,
            padding: '4px 1px',
            borderRadius: 12,
            background: o ? AG_KEY_COLOR[c.key] : press ? T.paper2 : T.paper,
            color: o && c.key === 'x' ? T.red : T.ink2,
            border: `2px solid ${T.ink}`,
            boxShadow: shadow,
            fontWeight: 800,
            fontSize: 10,
            letterSpacing: 0.2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            overflow: 'hidden',
            transform: o || press ? 'translateY(3px)' : undefined,
          }}
        >
          {o && (c.key === 'g' || c.key === 'p') && <AgentMark />}
          {o && c.key === 'x' && <AssassinMark />}
          <span>{trUpper(c.word)}</span>
        </div>
      );
    })}
  </div>
);

const Legend = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontWeight: 700, color: T.text3, justifyContent: 'center', flexWrap: 'wrap' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: T.neutral }} />
      {S.play.legendNeutral}
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: T.ink2, border: `2px solid ${T.red}` }} />
      {S.play.legendAssassin}
    </span>
  </div>
);

/** İPUÇLARI box, entries drawn in the given order (newest first, like the web's reversed log). */
const History: React.FC<{ history: AgHistoryEntry[]; board: AgCard[] }> = ({ history, board }) => {
  const keyOf = (w: string) => board.find((c) => trUpper(c.word) === trUpper(w))?.key;
  const line: React.CSSProperties = { fontWeight: 700, fontSize: 13 };
  return (
    <div style={{ background: T.panel2, border: `2px solid ${T.ink}`, borderRadius: 16, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, color: T.text3 }}>{trUpper(S.play.history)}</span>
      {history.length === 0 ? (
        <span style={{ ...line, color: T.text3 }}>{S.play.historyEmpty}</span>
      ) : (
        history.map((e, i) => (
          <span key={i} style={line}>
            <strong style={{ fontWeight: 800, color: TEAM_COLOR[e.team] }}>
              {S.teamShort[e.team]} · {trUpper(e.word)} {agNum(e.count)}
            </strong>
            {' — '}
            {e.found.length === 0
              ? S.play.noPicks
              : e.found.map((w, k) => (
                  <span key={k} style={keyOf(w) === 'x' ? { color: T.red } : undefined}>
                    {k > 0 && ', '}
                    {w}
                  </span>
                ))}
          </span>
        ))
      )}
    </div>
  );
};

const EndTurn = () => (
  <div
    style={{
      ...btn,
      minHeight: 56,
      padding: '1px 6px',
      borderRadius: 20,
      background: T.yellow,
      color: T.ink2,
      border: `3px solid ${T.ink}`,
      boxShadow: `0 5px 0 ${T.ink}`,
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {S.play.endTurn}
  </div>
);

/* ---------- AgBoard ---------- */

export type AgBoardProps = {
  board?: AgCard[];
  /** Opened card indexes. */
  open: number[];
  /** Lider view: unopened cards carry the key bar, hint "Takımın tahmin ediyor…". */
  leader?: boolean;
  /** Index being tapped (team member only): pressed look. */
  pressing?: number | null;
  /** null = clue phase (word "…", "Sıra … takımda", "… ipucu düşünüyor."). by "sen" → "Senin ipucun". */
  clue?: AgClue | null;
  /** "N hak kaldı" (artboard 3); null = "Sınırsız hak". */
  tries?: number | null;
  /** Viewer's team ("(sen)"). */
  me?: AgTeam;
  /** Newest first. */
  history?: AgHistoryEntry[];
  /** Team whose turn it is (filled counter, count colour). */
  turn?: AgTeam;
  pill?: string;
  /** Leader name for the clue-phase label when `clue` is null. */
  leaderName?: string;
  /** "Sırayı bitir" (artboard: shown for both roles; the web shows it only to the guessing team). */
  endTurn?: boolean;
};

export const AgBoard: React.FC<AgBoardProps> = ({
  board = AG_BOARD,
  open,
  leader = false,
  pressing = null,
  clue = AG_CLUE,
  tries = 3,
  me = 'g',
  history = AG_HISTORY,
  turn = 'g',
  pill = S.play.pill(2),
  leaderName = AG_CLUE.by,
  endTurn = true,
}) => {
  const hint = !clue
    ? me === turn
      ? S.play.waitClueMine
      : S.play.waitClue(leaderName)
    : me !== turn
      ? S.play.opponentGuessing(S.team[turn])
      : leader
        ? S.play.leaderGuessing
        : S.play.tapHint;
  return (
    <Shell>
      <TopRow pill={pill} />
      <Counters board={board} open={open} turn={turn} me={me} />
      {clue ? <ClueBox clue={clue} tries={tries} turn={turn} /> : <ClueWaiting by={leaderName} turn={turn} />}
      <Hint>{hint}</Hint>
      <Board board={board} open={open} keyed={leader} pressing={leader || me !== turn || !clue ? null : pressing} />
      <Legend />
      <Fill />
      <History history={history} board={board} />
      {clue && endTurn && <EndTurn />}
    </Shell>
  );
};

/* ---------- AgGiveClue (web ClueForm) ---------- */

export type AgGiveClueProps = {
  board?: AgCard[];
  open: number[];
  /** Typed so far (drawn uppercase like the input's text-transform). */
  word: string;
  /** Pressed count; -1 = Sınırsız; null = none pressed. */
  count: number | null;
  /** Rule error under the picker. undefined = computed with the game's clueProblem; null = none (shows the rule hint). */
  error?: string | null;
  /** Leader's team (count colour, "(sen)", turn). */
  me?: AgTeam;
  history?: AgHistoryEntry[];
  pill?: string;
  /** Focused input: violet focus ring + caret. */
  caret?: boolean;
};

const COUNTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, AG_UNLIMITED];

export const AgGiveClue: React.FC<AgGiveClueProps> = ({ board = AG_BOARD, open, word, count, error, me = 'g', history = AG_HISTORY, pill = S.play.pill(2), caret = true }) => {
  const hidden = board.filter((_, i) => !open.includes(i)).map((c) => c.word.toLocaleLowerCase('tr'));
  const typed = word.replace(/\s/g, '');
  const problem = error !== undefined ? error : typed.trim() ? clueProblem(typed.toLocaleLowerCase('tr'), hidden) : null;
  const disabled = !typed.trim() || !!problem;
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1.5 };
  return (
    <Shell>
      <TopRow pill={pill} />
      <Counters board={board} open={open} turn={me} me={me} />
      <div
        className="ag-web"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 8,
          padding: '12px 14px 14px',
          border: `3px solid ${T.ink}`,
          borderRadius: 18,
          background: T.paper,
          color: T.ink2,
          lineHeight: 1.45,
          fontWeight: 600,
        }}
      >
        <span style={label}>{trUpper(S.play.yourClue)}</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            minHeight: 52,
            padding: '0 12px',
            border: `3px solid ${problem ? T.red : T.ink}`,
            borderRadius: 14,
            background: T.paper2,
            color: T.ink2,
            fontFamily: FONT_DISPLAY,
            fontSize: 26,
            fontWeight: 800,
            whiteSpace: 'pre',
            overflow: 'hidden',
            outline: caret ? `3px solid ${T.violet}` : undefined,
            outlineOffset: 2,
          }}
        >
          {typed ? <span>{trUpper(typed)}</span> : null}
          {caret && <span style={{ width: 2, height: 30, marginLeft: typed ? 1 : 0, background: T.ink2, flex: 'none' }} />}
          {!typed && <span style={{ color: T.violet, fontSize: 20, marginLeft: caret ? -2 : 0 }}>{S.play.cluePlaceholder}</span>}
        </div>
        <span style={label}>{trUpper(S.play.count)}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
          {COUNTS.map((n) => {
            const on = count === n;
            return (
              <div
                key={n}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                  minHeight: 44,
                  padding: '0 6px',
                  border: `2px solid ${T.ink}`,
                  borderRadius: 12,
                  background: on ? TEAM_COLOR[me] : T.paper2,
                  color: T.ink2,
                  boxShadow: on ? `0 3px 0 ${T.ink}` : undefined,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {agNum(n)}
              </div>
            );
          })}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: problem ? T.formError : T.inkSoft }}>{problem ?? S.play.clueHint}</span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 56,
            border: `3px solid ${T.ink}`,
            borderRadius: 20,
            background: T.mint,
            color: T.ink2,
            boxShadow: `0 5px 0 ${T.ink}`,
            fontFamily: FONT_DISPLAY,
            fontSize: 20,
            fontWeight: 800,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {S.play.giveClue}
        </div>
      </div>
      <Board board={board} open={open} keyed />
      <Legend />
      <History history={history} board={board} />
    </Shell>
  );
};

/* ---------- AgResult (web OverHead) ---------- */

export type AgResultProps = {
  winner: AgTeam;
  reason: 'agents' | 'assassin';
  board?: AgCard[];
  open: number[];
  pill?: string;
  /** Room wins after this table (web `.ag-wins`); default: the winner's 1. */
  wins?: Record<AgTeam, number>;
  /** Host sees "Yeni tablo" / "Lobiye dön"; others the wait line (default). */
  host?: boolean;
  history?: AgHistoryEntry[];
};

const Crown = () => (
  <svg width={40} height={28} viewBox="0 0 40 28" aria-hidden="true">
    <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill={T.yellow} stroke={T.ink} strokeWidth={3} strokeLinejoin="round" />
  </svg>
);

const Replay = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);

export const AgResult: React.FC<AgResultProps> = ({ winner, reason, board = AG_BOARD, open, pill = S.play.pill(2), wins, host = false, history = AG_HISTORY }) => {
  const w = wins ?? { g: winner === 'g' ? 1 : 0, p: winner === 'p' ? 1 : 0 };
  const confetti: React.CSSProperties[] = [
    { top: 0, left: 12, width: 16, height: 7, background: T.yellow, transform: 'rotate(30deg)' },
    { top: 40, right: 22, width: 16, height: 7, background: T.pink, transform: 'rotate(-40deg)' },
    { top: 100, left: 46, width: 11, height: 11, background: T.mint, transform: 'rotate(20deg)' },
    { top: -10, right: 102, width: 11, height: 11, borderRadius: '50%', background: T.sky },
    { top: 140, right: 42, width: 16, height: 7, background: T.coral, transform: 'rotate(70deg)' },
  ];
  const score = (team: AgTeam) => {
    const won = team === winner;
    const found = agTotal(board, team) - agLeft(board, open, team);
    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          padding: 14,
          border: `4px solid ${T.ink}`,
          borderRadius: 26,
          background: TEAM_COLOR[team],
          color: T.ink2,
          textAlign: 'center',
          boxShadow: won ? `6px 6px 0 ${T.ink}` : undefined,
          transform: won ? 'rotate(-3deg)' : 'rotate(2deg)',
          alignSelf: won ? undefined : 'flex-end',
        }}
      >
        {won && <Crown />}
        <span style={{ marginTop: won ? 0 : 10, fontFamily: FONT_DISPLAY, fontSize: won ? 64 : 52, fontWeight: 800, lineHeight: 1 }}>{found}</span>
        <span style={{ fontSize: 14, fontWeight: 800 }}>{S.team[team]}</span>
      </div>
    );
  };
  const big: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', border: `3px solid ${T.ink}`, fontFamily: FONT_DISPLAY, fontWeight: 800 };
  return (
    <Shell>
      <TopRow pill={pill} wins={w} />
      <section className="ag-web" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 8, lineHeight: 1.45, fontWeight: 600 }}>
        <span aria-hidden="true">
          {confetti.map((st, i) => (
            <i key={i} style={{ position: 'absolute', borderRadius: 2, ...st }} />
          ))}
        </span>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 18, textAlign: 'center' }}>
          <span
            style={{
              padding: '5px 14px',
              border: `3px solid ${T.ink}`,
              borderRadius: 999,
              background: T.yellow,
              color: T.ink2,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 2,
              transform: 'rotate(-3deg)',
            }}
          >
            {trUpper(S.over.kicker)}
          </span>
          <span style={{ marginTop: 8, fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: 800, lineHeight: 0.95, overflowWrap: 'anywhere' }}>{S.over.won(S.team[winner])}</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text2 }}>{S.over.reason[reason]}</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 12 }}>
          {score('g')}
          <span style={{ alignSelf: 'center', fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, color: T.text3 }}>–</span>
          {score('p')}
        </div>
      </section>
      <Board board={board} open={open} keyed />
      <Legend />
      <div className="ag-web" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 6, lineHeight: 1.45 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.text2, textAlign: 'center' }}>{host ? S.over.newBoardHint : S.over.waitHost}</span>
        {host && (
          <>
            <div style={{ ...big, minHeight: 62, borderRadius: 20, background: T.mint, color: T.ink2, boxShadow: `0 6px 0 ${T.ink}`, fontSize: 24 }}>
              <Replay />
              {S.over.newBoard}
            </div>
            <div style={{ ...big, minHeight: 52, borderRadius: 18, background: T.panel, color: T.text, fontSize: 19 }}>{S.over.toLobby}</div>
          </>
        )}
      </div>
      <History history={history} board={board} />
    </Shell>
  );
};
