import React from 'react';
import { FONT_BODY, FONT_DISPLAY } from '../../fonts';
import { KURT_W } from '../kurt/KurtScreens';
import {
  ACTION_COST,
  ACTION_FX,
  ACTION_NAME,
  BLOCK_ROLES,
  IN_ACTION_ORDER,
  IN_TEXT as S,
  LOSE_REASON,
  MUST_COUP_AT,
  ROLE_ABILITY,
  ROLE_NAME,
  TARGETED,
  actionOf,
  inRole,
  trUpper,
  type CoupRole,
  type InAction,
  type InLoseReason,
  type InRole,
} from './intrigueText';

export { IN_ROLE_FROM_COUP, inRole, type CoupRole, type InAction, type InRole } from './intrigueText';

/**
 * Entrika phone screens for ads, drawn at 390 CSS px like the design artboard. Wrap each in <Screen390> (kurt module).
 * Action picker, challenge window, opponents strip, "Elin" and the reveal overlay: Entrika.dc.html (390×844), values copied 1:1.
 * The artboard has no box-sizing reset, so its spans/divs are content-box (borders and padding add to width/height);
 * buttons are border-box (UA default) with the UA padding 1px 6px wherever the artboard sets none.
 * Lose-card picker and game over: games/intrigue/client/PlayView.tsx + intrigue.css (border-box, body line-height 1.45),
 * tokens from apps/web/src/styles/tokens.css, buttons from apps/web/src/styles/ui.css, glyphs from RoleArt.tsx.
 */

/* ---------- Tokens ---------- */

/** apps/web/src/styles/tokens.css (+ intrigue.css --ig-alarm / --ig-track). */
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
  alarm: '#E2335C',
  track: '#EEE8FF',
} as const;

/** intrigue.css `[data-role]` → --role. */
export const IN_ROLE_COLOR: Record<InRole, string> = {
  treasurer: T.yellow,
  assassin: T.red,
  guard: T.sky,
  pirate: T.coral,
  spy: T.mint,
};

/** `.ig-action[data-action]` backgrounds (artboard `A[].bg`). */
const ACTION_BG: Record<InAction, string> = {
  income: T.paper,
  aid: T.paper,
  tax: T.yellow,
  assassinate: T.red,
  steal: T.coral,
  exchange: T.mint,
  coup: T.lilac,
};

/* ---------- Props ---------- */

export type InPlayer = {
  name: string;
  gold: number;
  /** Cards in seat order: null = face down; a role = already revealed (drawn as the dimmed mini card). */
  cards: (InRole | null)[];
  /** Revealed (lost) roles, drawn after `cards`. */
  lost?: InRole[];
  /** Their turn: yellow, tilted card. */
  turn?: boolean;
  /** false = disconnected (web `data-off`: name at 60 %). */
  online?: boolean;
  /** Window dot (web `.ig-say`): mint = passed, ring = still deciding. */
  say?: 'passed' | 'deciding';
};

export type InTableProps = {
  /** Opponents, left to right (the viewer is not in this list). */
  players: InPlayer[];
  /** "Destede N kart" (artboard 7). */
  deck?: number;
  /** Turn pill text; each screen picks the web default ("Sıra sende" / "Sıra: X"). */
  pill?: string;
};

export type InHandProps = {
  hand: { role: InRole | CoupRole; lost?: boolean }[];
  gold: number;
};

/** The artboard's table: Mert (turn, 6), Deniz (passed, Korsan lost, 2), Zeynep (3). */
export const IN_PLAYERS: InPlayer[] = [
  { name: 'Mert', gold: 6, cards: [null, null], turn: true },
  { name: 'Deniz', gold: 2, cards: [null], lost: ['pirate'], say: 'passed' },
  { name: 'Zeynep', gold: 3, cards: [null, null] },
];
/** The artboard's hand: Muhafız + Hazinedar, 4 altın. */
export const IN_HAND: InHandProps = { hand: [{ role: 'guard' }, { role: 'treasurer' }], gold: 4 };

const isOut = (p: InPlayer) => !p.cards.some((c) => c === null);
const turnName = (players: InPlayer[]) => players.find((p) => p.turn)?.name;

/* ---------- Glyphs (RoleArt.tsx) ---------- */

const GLYPH: Record<InRole, React.ReactNode> = {
  treasurer: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  assassin: (
    <>
      <path d="M14 4l6 6-9 9H5v-6z" />
      <path d="M4 20l3-3" />
    </>
  ),
  guard: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  pirate: (
    <>
      <path d="M10 3h6" />
      <path d="M13 3v10a5 5 0 1 1-9-3" />
      <path d="M4 10l-1 3h3" />
    </>
  ),
  spy: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

export const InGlyph: React.FC<{ role: InRole; size?: number; stroke?: string; strokeWidth?: number }> = ({
  role,
  size = 32,
  stroke = 'currentColor',
  strokeWidth = 2.4,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flex: 'none' }}
  >
    {GLYPH[role]}
  </svg>
);

/* ---------- Canvas ---------- */

/** Artboard root: #2A1B6E, Nunito, padding 18 18 22, column gap 12, overflow hidden. No line-height (normal). */
/** Remotion pages are border-box everywhere; the artboard is not, so artboard screens switch their subtree back (inline box-sizing still wins). */
const CONTENT_BOX = '.in-artboard, .in-artboard * { box-sizing: content-box; }';

const Shell: React.FC<{ lineHeight?: number | 'normal'; web?: boolean; children: React.ReactNode }> = ({ lineHeight = 'normal', web, children }) => (
  <div
    className={web ? undefined : 'in-artboard'}
    style={{
      position: 'relative',
      width: KURT_W,
      height: '100%',
      boxSizing: 'border-box',
      background: T.bg,
      color: T.text,
      fontFamily: FONT_BODY,
      fontWeight: 600,
      lineHeight,
      padding: '18px 18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflow: 'hidden',
    }}
  >
    {!web && <style>{CONTENT_BOX}</style>}
    {children}
  </div>
);

const Fill = () => <div style={{ flex: 1 }} />;

/** Artboard white sheet (= `.ig-sheet`). */
const sheet: React.CSSProperties = {
  background: T.paper,
  color: T.ink2,
  border: `3px solid ${T.ink}`,
  borderRadius: 24,
  boxShadow: `6px 6px 0 ${T.ink}`,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

/** Chromium UA button defaults the artboard keeps (border-box, padding 1px 6px, line-height normal, centred). */
const btn: React.CSSProperties = {
  boxSizing: 'border-box',
  padding: '1px 6px',
  margin: 0,
  lineHeight: 'normal',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const Bar: React.FC<{ fill: number; color?: string; height?: number }> = ({ fill, color = T.yellow, height = 8 }) => (
  <div style={{ height, borderRadius: 999, background: T.track, overflow: 'hidden', flex: 'none' }}>
    <div style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%`, height: '100%', background: color }} />
  </div>
);

/* ---------- Table header ---------- */

/** Mini cards: face down (artboard 16×22 content-box; 1px violet edge unless on the turn card) or revealed (role colour, 60 %). */
const Mini: React.FC<{ role: InRole | null; onTurn?: boolean }> = ({ role, onTurn }) =>
  role ? (
    <span style={{ width: 16, height: 22, borderRadius: 4, background: IN_ROLE_COLOR[role], opacity: 0.6 }} />
  ) : (
    <span style={{ width: 16, height: 22, borderRadius: 4, background: T.ink2, border: onTurn ? undefined : `1px solid ${T.violet}` }} />
  );

const Rival: React.FC<{ p: InPlayer; targeted?: boolean }> = ({ p, targeted }) => {
  const out = isOut(p);
  const cur = !!p.turn && !out;
  const cards = [...p.cards, ...(p.lost ?? [])];
  return (
    <div
      style={{
        position: 'relative',
        minWidth: 0,
        background: cur ? T.yellow : T.panel,
        color: cur ? T.ink2 : undefined,
        border: `3px solid ${targeted ? T.red : T.ink}`,
        borderRadius: 14,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        transform: cur ? 'rotate(-2deg)' : undefined,
        opacity: out ? 0.5 : undefined,
      }}
    >
      {p.say === 'passed' && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: T.mint }} />}
      {p.say === 'deciding' && (
        <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, boxSizing: 'border-box', borderRadius: '50%', border: `2px solid ${T.text3}` }} />
      )}
      <span
        style={{
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: 800,
          fontSize: 14,
          opacity: p.online === false ? 0.6 : undefined,
        }}
      >
        {p.name}
      </span>
      <span style={{ display: 'flex', gap: 3 }}>
        {cards.map((c, i) => (
          <Mini key={i} role={c} onTurn={cur} />
        ))}
      </span>
      <span style={{ fontWeight: 800, fontSize: 12, color: cur ? undefined : T.yellow }}>{out ? S.play.out : S.play.coins(p.gold)}</span>
    </div>
  );
};

/** Turn pill + "Destede N kart" + the opponents strip. */
export const InTable: React.FC<InTableProps & { pill: string; target?: string | null }> = ({ players, deck = S.deckDefault, pill, target }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          padding: '7px 14px',
          borderRadius: 999,
          background: T.lilac,
          color: T.ink2,
          border: `3px solid ${T.ink}`,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        {pill}
      </span>
      <span style={{ flex: 'none', fontWeight: 800, fontSize: 13, color: T.text3 }}>{S.play.deck(deck)}</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
      {players.map((p) => (
        <Rival key={p.name} p={p} targeted={!!target && target === p.name} />
      ))}
    </div>
  </>
);

/* ---------- Hand ---------- */

/** "Elin" + purse + the two tilted role cards (artboard; content-box min-height 118 + padding 12 + border 3). Lost cards: 45 %, "elendi". */
export const InHand: React.FC<InHandProps> = ({ hand, gold }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 20 }}>{S.play.hand}</span>
      <span style={{ padding: '4px 12px', borderRadius: 999, background: T.yellow, color: T.ink2, border: `2px solid ${T.ink}`, fontWeight: 800, fontSize: 14 }}>
        {S.play.coins(gold)}
      </span>
    </div>
    {hand.length === 0 ? (
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text3 }}>{S.play.noHand}</span>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {hand.map((c, i) => {
          const role = inRole(c.role);
          return (
            <div
              key={i}
              style={{
                minWidth: 0,
                minHeight: 118,
                borderRadius: 18,
                background: IN_ROLE_COLOR[role],
                color: T.ink2,
                border: `3px solid ${T.ink}`,
                boxShadow: `4px 4px 0 ${T.ink}`,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                textAlign: 'center',
                transform: `rotate(${i % 2 === 0 ? -3 : 3}deg)`,
                opacity: c.lost ? 0.45 : undefined,
              }}
            >
              <InGlyph role={role} size={38} />
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: 1 }}>{ROLE_NAME[role]}</span>
              <span style={{ fontWeight: 700, fontSize: 12 }}>{c.lost ? S.play.out : ROLE_ABILITY[role]}</span>
            </div>
          );
        })}
      </div>
    )}
  </>
);

/* ---------- Action picker (artboard "Hamle seç") ---------- */

export type InPickActionProps = InTableProps &
  InHandProps & {
    /** Pressed action (id or Turkish name). A targeted one opens "Hedef seç" + the confirm button. */
    selected?: string | null;
    /** Chosen target's name (yellow in the target row). */
    target?: string | null;
    /** Seconds left ("Sıra sende · 38 sn"); null = no turn timer (web: "Sıra sende", no bar). */
    timer?: number | null;
    /** Bar fill 0–1 (artboard 0.65). */
    timerFill?: number;
  };

export const InPickAction: React.FC<InPickActionProps> = ({
  players,
  deck,
  pill = S.play.yourTurn,
  hand,
  gold,
  selected = null,
  target = null,
  timer = 38,
  timerFill = 0.65,
}) => {
  const sel = selected ? actionOf(selected) : null;
  const mustCoup = gold >= MUST_COUP_AT;
  const reason = (a: InAction) => (mustCoup && a !== 'coup' ? S.play.mustCoupReason : gold < ACTION_COST[a] ? S.play.needCoins(ACTION_COST[a]) : null);
  const targets = players.filter((p) => !isOut(p));
  return (
    <Shell>
      <InTable players={players} deck={deck} pill={pill} />
      <div style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22 }}>{S.play.chooseAction}</span>
          <span style={{ flex: 'none', fontWeight: 800, fontSize: 13 }}>{timer == null ? S.play.yourTurn : S.play.yourTurnLeft(timer)}</span>
        </div>
        {timer != null && <Bar fill={timerFill} />}
        {mustCoup && <span style={{ fontSize: 13, fontWeight: 800, color: T.alarm }}>{S.play.mustCoup}</span>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {IN_ACTION_ORDER.map((a) => {
            const why = reason(a);
            const on = sel === a && !why;
            return (
              <div
                key={a}
                style={{
                  ...btn,
                  minHeight: 58,
                  borderRadius: 14,
                  background: ACTION_BG[a],
                  color: T.ink2,
                  border: `3px solid ${T.ink}`,
                  boxShadow: `0 ${on ? 1 : 4}px 0 ${T.ink}`,
                  flexDirection: 'column',
                  gap: 3,
                  padding: 4,
                  transform: on ? 'translateY(3px)' : undefined,
                  outline: on ? `3px solid ${T.ink2}` : undefined,
                  outlineOffset: on ? 2 : undefined,
                  opacity: why ? 0.45 : undefined,
                }}
              >
                <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 17, lineHeight: 1 }}>{ACTION_NAME[a]}</span>
                <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1.2 }}>{why ?? ACTION_FX[a]}</span>
              </div>
            );
          })}
        </div>
        {sel && TARGETED[sel] && !reason(sel) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 13 }}>{S.play.chooseTarget}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {targets.map((p) => (
                <div
                  key={p.name}
                  style={{
                    ...btn,
                    flex: 1,
                    minWidth: 0,
                    minHeight: 40,
                    borderRadius: 12,
                    background: target === p.name ? T.yellow : T.paper2,
                    color: '#000000',
                    border: `2px solid ${T.ink}`,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {p.name} · {p.gold}
                </div>
              ))}
            </div>
            <div
              style={{
                ...btn,
                minHeight: 46,
                borderRadius: 14,
                background: T.ink2,
                color: T.paper,
                border: `2px solid ${T.ink}`,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 17,
                opacity: target ? undefined : 0.5,
              }}
            >
              {target ? S.play.confirm(ACTION_NAME[sel], target) : S.play.chooseTarget}
            </div>
          </div>
        )}
      </div>
      <Fill />
      <InHand hand={hand} gold={gold} />
    </Shell>
  );
};

/* ---------- Challenge window (artboard "İtiraz penceresi") ---------- */

export type InChallengeProps = InTableProps &
  InHandProps & {
    /** Who acts (claims the role). */
    actor: string;
    /** Action id or Turkish name ("assassinate" / "Suikast"). */
    action: string;
    /** The role the actor claims (drawn on the "?" card). */
    claim: InRole | CoupRole;
    /** Target's name; equal to `me` → "senin üzerinde" and the viewer may block. */
    target?: string | null;
    /** The viewer's name (default "Sen"); never in `players`. */
    me?: string;
    /** Big red seconds number. */
    countdown: number;
    /** Red bar fill 0–1 (artboard 0.5). */
    countdownFill?: number;
    /** "N/M geçti". */
    passed: number;
    needed: number;
    /** Grey status line; defaults to the web game's line for `mine`. */
    status?: string;
    /** The viewer's answer: lie / block draw that button pressed; pass hides the buttons (web). */
    mine?: 'lie' | 'block' | 'pass' | null;
  };

const respBtn: React.CSSProperties = {
  ...btn,
  minHeight: 56,
  borderRadius: 16,
  color: T.ink2,
  border: `3px solid ${T.ink}`,
  fontFamily: FONT_DISPLAY,
  fontWeight: 800,
};
const pressed = (on: boolean): React.CSSProperties => ({ boxShadow: `0 ${on ? 1 : 4}px 0 ${T.ink}`, transform: on ? 'translateY(3px)' : undefined });

export const InChallenge: React.FC<InChallengeProps> = ({
  players,
  deck,
  pill,
  hand,
  gold,
  actor,
  action,
  claim: claimIn,
  target = null,
  me = S.youLoser,
  countdown,
  countdownFill = 0.5,
  passed,
  needed,
  status,
  mine = null,
}) => {
  const claim = inRole(claimIn);
  const act = actionOf(action);
  const actName = act ? ACTION_NAME[act] : action;
  const meTarget = !!target && target === me;
  const title = act === 'aid' ? S.play.windowAid(actor) : S.play.windowClaim(actor, actName, target ? (meTarget ? S.youTarget : target) : null);
  const hint = act === 'aid' ? S.play.windowAidHint : S.play.windowClaimRole(ROLE_NAME[claim]);
  // Web: "Yalan!" for everyone but the claimant; block buttons only for the target (aid: anyone) and the roles that block the action.
  const canLie = act !== 'aid';
  const blockRoles = act ? BLOCK_ROLES[act] : [];
  const canBlock = blockRoles.length > 0 && (act === 'aid' || meTarget);
  const blockRole = blockRoles[0];
  const statusText =
    status ??
    (mine === 'pass' ? S.play.passed : mine === 'block' && blockRole ? S.play.blockedMine(ROLE_NAME[blockRole], actor) : S.play.waiting);
  const grid: React.ReactNode[] = [];
  if (canLie)
    grid.push(
      <div key="lie" style={{ ...respBtn, background: T.red, fontSize: 22, ...pressed(mine === 'lie') }}>
        {S.play.lie}
      </div>,
    );
  if (canBlock)
    blockRoles.forEach((r, i) =>
      grid.push(
        <div key={r} style={{ ...respBtn, background: IN_ROLE_COLOR[r], fontSize: 15, lineHeight: 1.1, ...pressed(mine === 'block' && i === 0) }}>
          {S.play.blockAs(ROLE_NAME[r])}
        </div>,
      ),
    );
  return (
    <Shell>
      <InTable players={players} deck={deck} pill={pill ?? S.play.turnOf(turnName(players) ?? actor)} target={target} />
      <div style={sheet}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 46, lineHeight: 0.9, color: T.alarm, width: 34 }}>
            {countdown}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, lineHeight: 1.1 }}>{title}</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{hint}</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              position: 'relative',
              flex: 'none',
              width: 64,
              height: 84,
              borderRadius: 12,
              background: IN_ROLE_COLOR[claim],
              border: `3px solid ${T.ink}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              transform: 'rotate(-4deg)',
            }}
          >
            <InGlyph role={claim} size={28} stroke={T.ink2} />
            <span style={{ fontWeight: 800, fontSize: 12 }}>{ROLE_NAME[claim]}</span>
            <span
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: T.yellow,
                border: `2px solid ${T.ink}`,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ?
            </span>
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Bar fill={countdownFill} color={T.alarm} height={10} />
            <span style={{ fontWeight: 800, fontSize: 13 }}>{S.play.passedList(passed, needed)}</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: T.inkSoft }}>{statusText}</span>
          </div>
        </div>
        {mine !== 'pass' && (
          <>
            {grid.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {grid.map((g, i) => {
                  // `.ig-responses-grid`: an only child, or an odd last child, spans both columns.
                  const span = grid.length === 1 || (i === grid.length - 1 && grid.length % 2 === 1);
                  return (
                    <div key={i} style={{ display: 'grid', gridColumn: span ? '1 / -1' : undefined }}>
                      {g}
                    </div>
                  );
                })}
              </div>
            )}
            <div
              style={{
                ...btn,
                minHeight: 46,
                borderRadius: 14,
                background: T.paper2,
                color: T.ink2,
                border: `2px solid ${T.ink}`,
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {S.play.pass}
            </div>
          </>
        )}
      </div>
      <Fill />
      <InHand hand={hand} gold={gold} />
    </Shell>
  );
};

/* ---------- Reveal overlay (artboard flash) ---------- */

export type InRevealProps = InTableProps &
  InHandProps & {
    /** Who was challenged and showed (or failed to show) the card. */
    who: string;
    role: InRole | CoupRole;
    truthful: boolean;
    /** Who loses a card: the challenger when truthful; equal to the viewer (`under.me`, default "Sen") → the artboard's "Sen bir kart kaybediyorsun …". Bluff copy names nobody. */
    loser: string;
    /** Optional window drawn under the overlay (as on the artboard); otherwise the empty table. */
    under?: Omit<InChallengeProps, keyof InTableProps | keyof InHandProps>;
  };

export const InRevealOverlay: React.FC<{ who: string; role: InRole | CoupRole; truthful: boolean; loser: string; me?: string }> = ({ who, role: roleIn, truthful, loser, me = S.youLoser }) => {
  const role = inRole(roleIn);
  const name = ROLE_NAME[role];
  return (
    <div
      className="in-artboard"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(15, 10, 42, 0.86)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 30,
        textAlign: 'center',
        color: T.text,
        fontFamily: FONT_BODY,
        lineHeight: 'normal',
      }}
    >
      <span
        style={{
          width: 150,
          height: 200,
          borderRadius: 22,
          background: IN_ROLE_COLOR[role],
          border: `4px solid ${T.ink}`,
          boxShadow: `8px 8px 0 ${T.ink}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: T.ink2,
          transform: 'rotate(-5deg)',
        }}
      >
        <InGlyph role={role} size={60} strokeWidth={2.2} />
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28 }}>{name}</span>
      </span>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 32, lineHeight: 1.05 }}>
        {truthful ? S.play.flashTrue(who, name) : S.play.flashFalse(who, name)}
      </span>
      <span style={{ fontWeight: 700, fontSize: 15, color: T.text2 }}>{truthful ? (loser === me ? S.play.flashTrueHintMe : S.play.flashTrueHint(loser)) : S.play.flashFalseHint}</span>
      <div
        style={{
          ...btn,
          minHeight: 52,
          padding: '0 28px',
          borderRadius: 16,
          background: T.yellow,
          color: T.ink2,
          border: `3px solid ${T.ink}`,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 19,
        }}
      >
        {S.play.ok}
      </div>
    </div>
  );
};

export const InReveal: React.FC<InRevealProps> = ({ who, role, truthful, loser, under, ...rest }) => (
  <div style={{ position: 'relative', width: KURT_W, height: '100%' }}>
    {under ? (
      <InChallenge {...rest} {...under} />
    ) : (
      <Shell>
        <InTable players={rest.players} deck={rest.deck} pill={rest.pill ?? S.play.turnOf(turnName(rest.players) ?? who)} />
        <Fill />
        <InHand hand={rest.hand} gold={rest.gold} />
      </Shell>
    )}
    <InRevealOverlay who={who} role={role} truthful={truthful} loser={loser} me={under?.me} />
  </div>
);

/* ---------- Lose a card (web LosePicker) ---------- */

export type InLoseCardProps = InTableProps &
  InHandProps & {
    /** InLoseReason key ("challenge" | "coup" | "assassinate" | "left") or the sentence itself. */
    reason?: string;
    /** Index into the hand's live (not lost) cards; null = nothing picked yet (button disabled). */
    picked?: number | null;
    /** Timer bar fill 0–1. */
    timerFill?: number;
  };

export const InLoseCard: React.FC<InLoseCardProps> = ({ players, deck, pill, hand, gold, reason = 'challenge', picked = null, timerFill = 0.6 }) => {
  const live = hand.filter((c) => !c.lost).map((c) => inRole(c.role));
  const pick = picked != null ? live[picked] : undefined;
  const title = reason in LOSE_REASON ? LOSE_REASON[reason as InLoseReason] : reason;
  return (
    <Shell>
      <InTable players={players} deck={deck} pill={pill ?? S.play.turnOf(turnName(players) ?? '?')} />
      {/* .ig-sheet[data-alert]; web elements are border-box and inherit body line-height 1.45 */}
      <div style={{ ...sheet, boxSizing: 'border-box', lineHeight: 1.45 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: 1.1, color: T.alarm }}>{title}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.inkSoft }}>{S.play.loseMeHint}</span>
        <Bar fill={timerFill} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, padding: 4 }}>
          {live.map((r, i) => {
            const on = picked === i;
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  boxSizing: 'border-box',
                  minHeight: 118,
                  padding: 12,
                  border: `3px solid ${T.ink}`,
                  borderRadius: 18,
                  background: IN_ROLE_COLOR[r],
                  boxShadow: `4px 4px 0 ${T.ink}`,
                  color: T.ink2,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transform: on ? 'translateY(-4px)' : `rotate(${i % 2 === 0 ? -3 : 3}deg)`,
                  outline: on ? `3px solid ${T.ink2}` : undefined,
                  outlineOffset: on ? 3 : undefined,
                }}
              >
                <InGlyph role={r} size={38} />
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{ROLE_NAME[r]}</span>
              </div>
            );
          })}
        </div>
        {/* .btn.btn-primary.btn-lg.btn-block */}
        <div
          style={{
            ...btn,
            gap: 8,
            width: '100%',
            minHeight: 64,
            padding: '0 18px',
            border: `3px solid ${T.ink}`,
            borderRadius: 20,
            background: T.mint,
            color: T.ink2,
            boxShadow: `0 6px 0 ${T.ink}`,
            fontFamily: FONT_DISPLAY,
            fontSize: 24,
            fontWeight: 800,
            lineHeight: 1,
            whiteSpace: 'nowrap',
            opacity: pick ? undefined : 0.5,
          }}
        >
          {pick ? S.play.loseBtn(ROLE_NAME[pick]) : S.play.loseMeTitle}
        </div>
      </div>
      <Fill />
      <InHand hand={hand} gold={gold} />
    </Shell>
  );
};

/* ---------- Game over (web Podium) ---------- */

export type InResultProps = {
  winner: string;
  /** Winner first, then by elimination (last out second). `cards` is accepted but not drawn: the web podium shows no cards. */
  ranking: { name: string; cards?: (InRole | CoupRole)[] }[];
  /** The viewer (web `data-me`, no visual change in intrigue.css). */
  me?: string;
  code?: string;
  /** Back-to-lobby bar fill 0–1. */
  backFill?: number;
};

/** game-kit Avatar colours (AVATAR_COLOR), picked per name. */
const AVATAR = ['#3ee0a8', '#ffd23f', '#ff6b6b', '#5ab8ff', '#b794ff'];
const avatarColor = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length]!;
};

const Avatar: React.FC<{ name: string; size: number }> = ({ name, size }) => (
  <span
    style={{
      display: 'inline-grid',
      placeItems: 'center',
      flex: 'none',
      boxSizing: 'border-box',
      width: size,
      height: size,
      border: `${size >= 40 ? 3 : 2}px solid ${T.ink}`,
      borderRadius: '50%',
      background: avatarColor(name),
      color: T.ink2,
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: size * 0.46,
      lineHeight: 1,
    }}
  >
    {name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'}
  </span>
);

export const InResult: React.FC<InResultProps> = ({ winner, ranking, code = S.code, backFill = 0.45 }) => {
  const ranked = ranking.length && ranking[0]!.name === winner ? ranking : [{ name: winner }, ...ranking.filter((r) => r.name !== winner)];
  const first = ranked[0];
  const second = ranked[1];
  const rest = ranked.slice(2);
  const half = Math.ceil(rest.length / 2);
  const confetti: React.CSSProperties[] = [
    { top: 50, left: 30, width: 16, height: 7, background: T.yellow, transform: 'rotate(30deg)' },
    { top: 90, right: 40, width: 16, height: 7, background: T.pink, transform: 'rotate(-40deg)' },
    { top: 150, left: 64, width: 11, height: 11, background: T.mint, transform: 'rotate(20deg)' },
    { top: 40, right: 120, width: 11, height: 11, borderRadius: '50%', background: T.sky },
    { top: 190, right: 60, width: 16, height: 7, background: T.coral, transform: 'rotate(70deg)' },
  ];
  const card = (isFirst: boolean): React.CSSProperties => ({
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 0,
    padding: 14,
    border: `4px solid ${T.ink}`,
    borderRadius: 26,
    background: isFirst ? T.mint : T.lilac,
    color: T.ink2,
    textAlign: 'center',
    transform: isFirst ? 'rotate(-3deg)' : 'rotate(2deg)',
    alignSelf: isFirst ? 'stretch' : 'flex-end',
    boxShadow: isFirst ? `6px 6px 0 ${T.ink}` : undefined,
  });
  const name: React.CSSProperties = { maxWidth: '100%', overflow: 'hidden', fontSize: 14, fontWeight: 800, textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  return (
    <Shell lineHeight={1.45} web>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: T.text3 }}>
        <span>{S.name}</span>
        <span style={{ letterSpacing: 2 }}>{code}</span>
      </div>
      <section style={{ position: 'relative', display: 'flex', flex: 1, flexDirection: 'column', gap: 18 }}>
        <span style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 220 }}>
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
            {trUpper(S.podium.gameOver)}
          </span>
          <span style={{ marginTop: 8, fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: 800, lineHeight: 0.95, overflowWrap: 'anywhere' }}>
            {winner ? S.podium.winnerTitle(winner) : S.podium.none}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text2 }}>{S.podium.title}</span>
        </div>
        {first && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 12 }}>
            <div style={card(true)}>
              <svg width={40} height={28} viewBox="0 0 40 28">
                <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="#FFD23F" stroke="#0D0828" strokeWidth={3} strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{S.podium.place(1)}</span>
              <span style={name}>{first.name}</span>
            </div>
            {second && (
              <>
                <span style={{ alignSelf: 'center', fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, color: T.text3 }}>–</span>
                <div style={card(false)}>
                  <span style={{ marginTop: 10, fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{S.podium.place(2)}</span>
                  <span style={name}>{second.name}</span>
                </div>
              </>
            )}
          </div>
        )}
        {rest.length > 0 && (
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
            {[rest.slice(0, half), rest.slice(half)].map(
              (col, i) =>
                col.length > 0 && (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: `3px solid ${T.ink}`, borderRadius: 18, background: T.panel }}>
                    {col.map((p, j) => (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 15, fontWeight: 800 }}>
                        <span style={{ minWidth: 22, color: T.yellow }}>{S.podium.place(3 + i * half + j)}</span>
                        <Avatar name={p.name} size={28} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                ),
            )}
          </div>
        )}
        <Fill />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: '100%', height: 12, boxSizing: 'border-box', overflow: 'hidden', border: `2px solid ${T.ink}`, borderRadius: 999, background: T.panel2 }}>
            <div style={{ height: '100%', width: `${Math.max(0, Math.min(1, backFill)) * 100}%`, background: T.yellow }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text2 }}>{S.podium.back}</span>
        </div>
      </section>
    </Shell>
  );
};

