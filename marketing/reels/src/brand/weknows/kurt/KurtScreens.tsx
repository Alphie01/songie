import React from 'react';
import { FONT_BODY, FONT_DISPLAY } from '../../fonts';
import { KURT_TEXT as S, trUpper, type KurtReason, type KurtRole, type KurtStep } from './kurtText';

/**
 * Kurt Adam (werewolf) phone screens for ads, drawn at 390 CSS px like the design artboard.
 * Night wolf / sleeper and the hold-to-reveal role card: KurtAdam.dc.html (390×844), values copied 1:1.
 * Every other screen: games/werewolf/client/PlayView.tsx + werewolf.css, tokens from apps/web/src/styles/tokens.css,
 * icons from games/werewolf/client/Glyphs.tsx. Day and game-over screens use the platform's purple look.
 * Wrap each screen in <Screen390 width height> to scale it to the phone.
 */

export const KURT_W = 390;

/* ---------- Tokens ---------- */

/** apps/web/src/styles/tokens.css */
const T = {
  bg: '#2a1b6e',
  panel: '#3a2a8c',
  panel2: '#1f145a',
  paper: '#ffffff',
  paper2: '#f1ecff',
  ink: '#0d0828',
  ink2: '#120c2e',
  line2: '#6e5fc4',
  text: '#ffffff',
  text2: '#e4dcff',
  text3: '#c9bef5',
  mint: '#3ee0a8',
  yellow: '#ffd23f',
  pink: '#ff7ac6',
  sky: '#5ab8ff',
  lilac: '#b794ff',
  coral: '#ff8a5b',
  red: '#ff6b6b',
  violet: '#6e5fc4',
} as const;

/** werewolf.css .ww night values (the artboard's colors). */
const N = {
  night: '#0f0a2a',
  card: '#221a4d',
  line: '#3a2e80',
  dim: '#8a80b8',
  moon: '#ffe680',
  moonShade: '#e8c64a',
  wolfPick: '#3a1a3a',
} as const;

type Look = { bg: string; card: string; edge: string; soft: string; dim: string; ring: string; disc: string };
const NIGHT: Look = { bg: N.night, card: N.card, edge: '#000000', soft: N.line, dim: N.dim, ring: N.moon, disc: N.card };
const DAY: Look = { bg: T.bg, card: T.panel, edge: T.ink, soft: T.line2, dim: T.text3, ring: T.yellow, disc: T.panel2 };

/** werewolf.css role colors (`--role`). */
export const KURT_ROLE_COLOR: Record<KurtRole, string> = {
  wolf: T.red,
  villager: T.paper2,
  seer: T.lilac,
  doctor: T.mint,
  hunter: T.coral,
  witch: T.sky,
  cupid: T.pink,
  fool: T.yellow,
};
const STEP_COLOR: Record<KurtStep, string> = { wolves: T.red, seer: T.lilac, doctor: T.mint, witch: T.sky, cupid: T.pink };

/** Role key from a key ("seer") or its Turkish name ("Kahin"). */
const roleOf = (r: string | undefined): KurtRole | null => {
  if (!r) return null;
  if (r in S.role) return r as KurtRole;
  const hit = (Object.keys(S.role) as KurtRole[]).find((k) => S.role[k].toLocaleLowerCase('tr-TR') === r.toLocaleLowerCase('tr-TR'));
  return hit ?? null;
};

/* ---------- Players ---------- */

export type KurtPlayer = { name: string; color: string };

/** The artboard's six villagers (KurtAdam.dc.html `P`). */
export const KURT_PLAYERS: KurtPlayer[] = [
  { name: 'Ece', color: '#FF7AC6' },
  { name: 'Mert', color: '#3EE0A8' },
  { name: 'Deniz', color: '#5AB8FF' },
  { name: 'Zeynep', color: '#FFD23F' },
  { name: 'Bora', color: '#FF8A5B' },
  { name: 'Sude', color: '#FFFFFF' },
];

/** game-kit Avatar colors, used for names outside the player list (e.g. the other wolf, Kaan). */
const AVATAR_FALLBACK = ['#b794ff', '#3ee0a8', '#ffd23f', '#ff6b6b', '#5ab8ff'];
const colorOf = (name: string, players: KurtPlayer[] = KURT_PLAYERS) => {
  const p = players.find((x) => x.name === name) ?? KURT_PLAYERS.find((x) => x.name === name);
  if (p) return p.color;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_FALLBACK[h % AVATAR_FALLBACK.length]!;
};

/* ---------- Canvas ---------- */

/** Draws children on a 390-px-wide canvas scaled to fill width×height; overflow is clipped like a phone viewport. */
export const Screen390: React.FC<{ width: number; height: number; children?: React.ReactNode }> = ({ width, height, children }) => {
  const scale = width / KURT_W;
  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: KURT_W,
          height: height / scale,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Screen root: artboard padding 18 18 22, column gap 14. Night adds the three stars. */
const Shell: React.FC<{ look: 'night' | 'day'; children: React.ReactNode }> = ({ look, children }) => {
  const L = look === 'night' ? NIGHT : DAY;
  return (
    <div
      style={{
        position: 'relative',
        width: KURT_W,
        height: '100%',
        boxSizing: 'border-box',
        background: L.bg,
        color: T.text,
        fontFamily: FONT_BODY,
        fontWeight: 600,
        // The artboard sets no line-height (normal); the web body sets 1.45 for day screens.
        lineHeight: look === 'night' ? 'normal' : 1.45,
        padding: '18px 18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflow: 'hidden',
      }}
    >
      {look === 'night' && (
        <>
          <span style={{ position: 'absolute', top: 70, left: 30, width: 4, height: 4, borderRadius: '50%', background: N.moon }} />
          <span style={{ position: 'absolute', top: 120, right: 50, width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF' }} />
          <span style={{ position: 'absolute', top: 200, left: 60, width: 3, height: 3, borderRadius: '50%', background: T.lilac }} />
        </>
      )}
      {children}
    </div>
  );
};

const Fill = () => <div style={{ flex: 1 }} />;

/* ---------- Glyphs (Glyphs.tsx) ---------- */

const ROLE_PATHS: Record<KurtRole, React.ReactNode> = {
  wolf: (
    <>
      <path d="M4 3.5l4.2 5h7.6l4.2-5-.8 9.2-2.7 3.6L12 20.5l-4.5-4.2-2.7-3.6z" />
      <path d="M9 12.2l1.4.8M15 12.2l-1.4.8M10.6 16.4L12 17.4l1.4-1" />
    </>
  ),
  villager: (
    <>
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  seer: (
    <>
      <path d="M2.5 13.5s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5-9.5-5.5-9.5-5.5z" />
      <circle cx="12" cy="13.5" r="2.5" />
      <path d="M12 2.5v2.5M6.5 4.5l1.3 1.8M17.5 4.5l-1.3 1.8" />
    </>
  ),
  doctor: (
    <>
      <path d="M12 3l7 2.8v5.4c0 4.7-3 8.2-7 9.8-4-1.6-7-5.1-7-9.8V5.8z" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
  hunter: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  witch: (
    <>
      <path d="M9 3h6M10 3v5.5L5.2 17a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 8.5V3" />
      <path d="M7.5 14.5h9" />
      <circle cx="11" cy="17.2" r=".9" fill="currentColor" />
      <circle cx="14" cy="16.6" r=".6" fill="currentColor" />
    </>
  ),
  cupid: (
    <>
      <path d="M12 19.5s-7-4.3-7-9.6A3.9 3.9 0 0 1 12 7.5a3.9 3.9 0 0 1 7 2.4c0 5.3-7 9.6-7 9.6z" />
      <path d="M3 21L21 3M16.5 3H21v4.5M3 21v-3M3 21h3" />
    </>
  ),
  fool: (
    <>
      <path d="M5.5 18L3.5 7.5l4.8 3.8L12 4.5l3.7 6.8 4.8-3.8-2 10.5z" />
      <path d="M5.5 18h13v2.5h-13z" />
      <circle cx="3.5" cy="6" r="1.3" />
      <circle cx="12" cy="3" r="1.3" />
      <circle cx="20.5" cy="6" r="1.3" />
    </>
  ),
};

export const RoleGlyph: React.FC<{ role: KurtRole; size?: number }> = ({ role, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flex: 'none' }}
  >
    {ROLE_PATHS[role]}
  </svg>
);

/** The artboard's open wolf card icon: three claw marks (KurtAdam.dc.html). */
const ClawGlyph: React.FC = () => (
  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" style={{ display: 'block' }}>
    <path d="M6 4c1 5 1 11-1 16" />
    <path d="M11 3c1 6 1 12-1 18" />
    <path d="M16 4c1 5 1 11-1 16" />
  </svg>
);

/* ---------- Parts ---------- */

const Avatar: React.FC<{ name: string; color: string; size: number; edge: string; fontSize?: number }> = ({ name, color, size, edge, fontSize }) => (
  <span
    style={{
      width: size,
      height: size,
      flex: 'none',
      boxSizing: 'border-box',
      borderRadius: '50%',
      background: color,
      color: T.ink2,
      border: `${size >= 40 ? 3 : 2}px solid ${edge}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: fontSize ?? size * 0.46,
      lineHeight: 1,
    }}
  >
    {name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'}
  </span>
);

/** .ww-top: lilac phase pill + room code. */
const TopBar: React.FC<{ L: Look; label: string; code?: string; lineHeight?: number }> = ({ L, label, code = S.code, lineHeight }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
    <span
      style={{
        padding: '7px 14px',
        borderRadius: 999,
        background: T.lilac,
        color: T.ink2,
        border: `3px solid ${L.edge}`,
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: 16,
        lineHeight,
      }}
    >
      {label}
    </span>
    <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 2, color: L.dim }}>{code}</span>
  </div>
);

/** Glyphs.tsx ClockRing inside .ww-clock-disc. */
const Disc: React.FC<{ L: Look; timer: number; timerMax: number }> = ({ L, timer, timerMax }) => {
  const r = 40;
  const c = 2 * Math.PI * r;
  const left = Math.max(0, Math.min(1, timer / Math.max(1, timerMax)));
  return (
    <div
      style={{
        width: 92,
        height: 92,
        flex: 'none',
        boxSizing: 'border-box',
        borderRadius: '50%',
        background: L.disc,
        border: `3px solid ${L.edge}`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={92} height={92} viewBox="0 0 92 92" style={{ position: 'absolute', inset: -3 }}>
        <circle
          cx={46}
          cy={46}
          r={r}
          fill="none"
          stroke={L.ring}
          strokeWidth={7}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - left)}
          strokeLinecap="round"
          transform="rotate(-90 46 46)"
        />
      </svg>
      <span style={{ position: 'relative', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, color: L.ring, fontVariantNumeric: 'tabular-nums' }}>
        {Math.max(0, Math.ceil(timer))}
      </span>
    </div>
  );
};

const NIGHT_STEPS: KurtStep[] = ['wolves', 'seer', 'doctor', 'witch'];

/** Night .ww-clock: ring + "GECENİN SIRASI" chips + who wakes now. */
const NightClock: React.FC<{ timer: number; timerMax: number; step: KurtStep }> = ({ timer, timerMax, step }) => {
  const now = NIGHT_STEPS.indexOf(step);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
      <Disc L={NIGHT} timer={timer} timerMax={timerMax} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5, color: N.dim }}>{trUpper(S.nightOrder)}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {NIGHT_STEPS.map((st, i) =>
            i === now ? (
              <span
                key={st}
                style={{ padding: '3px 9px', borderRadius: 999, background: STEP_COLOR[st], color: T.ink2, fontWeight: 800, fontSize: 12, border: '2px solid #000000' }}
              >
                {S.step[st]}
              </span>
            ) : (
              <span
                key={st}
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  border: `2px solid ${N.line}`,
                  fontWeight: 800,
                  fontSize: 12,
                  color: T.text3,
                  opacity: i < now ? 0.5 : 1,
                }}
              >
                {S.step[st]}
              </span>
            ),
          )}
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.text2 }}>{S.stepWakes[step]}</span>
      </div>
    </div>
  );
};

/** Day .ww-clock: ring + "2. GÜN" / phase / "N kişi hayatta". */
const DayClock: React.FC<{ timer: number; timerMax: number; day: number; phase: string; alive: number }> = ({ timer, timerMax, day, phase, alive }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <Disc L={DAY} timer={timer} timerMax={timerMax} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, color: DAY.dim, lineHeight: 1 }}>{trUpper(S.day(day))}</span>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, lineHeight: 1 }}>{phase}</span>
      <span style={{ fontWeight: 700, fontSize: 13, color: T.text2 }}>{S.alive(alive)}</span>
    </div>
  </div>
);

/** .ww-rolecard: lilac "hold" card; pressed = role color, 5 px down, shadow 7 → 2. */
const RoleCard: React.FC<{
  L: Look;
  open: boolean;
  role: KurtRole;
  icon?: React.ReactNode;
  lines?: string[];
  blurb?: string;
  /** Gap between the text lines: the artboard has none, the web game 2 px. */
  textGap?: number;
}> = ({ L, open, role, icon, lines = [], blurb, textGap = 2 }) => (
  <div
    style={{
      minHeight: 84,
      width: '100%',
      boxSizing: 'border-box',
      flex: 'none',
      borderRadius: 22,
      padding: '14px 16px',
      border: `3px solid ${L.edge}`,
      boxShadow: `0 ${open ? 2 : 7}px 0 ${L.edge}`,
      color: T.ink2,
      background: open ? KURT_ROLE_COLOR[role] : T.lilac,
      position: 'relative',
      transform: open ? 'translateY(5px)' : undefined,
      display: 'flex',
      alignItems: 'center',
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
      <span
        style={{
          width: 54,
          height: 54,
          flex: 'none',
          boxSizing: 'border-box',
          borderRadius: 16,
          background: open ? T.ink2 : N.moon,
          border: `3px solid ${L.edge}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: open ? KURT_ROLE_COLOR[role] : T.ink2,
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: 28,
        }}
      >
        {open ? (icon ?? <RoleGlyph role={role} size={32} />) : '?'}
      </span>
      {open ? (
        <span style={{ display: 'flex', flexDirection: 'column', gap: textGap, minWidth: 0 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 24, lineHeight: 1 }}>{S.role[role]}</span>
          {lines.map((l) => (
            <span key={l} style={{ fontWeight: 800, fontSize: 13 }}>
              {l}
            </span>
          ))}
          {blurb && <span style={{ marginTop: 2, fontSize: 12, fontWeight: 700, lineHeight: 1.35, opacity: 0.85 }}>{blurb}</span>}
        </span>
      ) : (
        <span style={{ display: 'flex', flexDirection: 'column', gap: textGap, minWidth: 0 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, lineHeight: textGap ? 1.15 : undefined }}>{S.roleHold}</span>
          <span style={{ fontWeight: 700, fontSize: 12, opacity: 0.85 }}>{S.roleHoldHint}</span>
        </span>
      )}
    </span>
  </div>
);

/** .ww-tile in a 3-column .ww-grid. */
const Tile: React.FC<{
  L: Look;
  player: KurtPlayer;
  picked?: boolean;
  pick?: string;
  pickBg?: string;
  badge?: React.ReactNode;
}> = ({ L, player, picked, pick, pickBg, badge }) => (
  <div
    style={{
      position: 'relative',
      minHeight: 96,
      boxSizing: 'border-box',
      padding: '8px 4px',
      borderRadius: 18,
      background: picked ? pickBg : L.card,
      color: T.text,
      border: `3px solid ${picked ? pick : L.edge}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      transform: picked ? 'rotate(-2deg)' : undefined,
    }}
  >
    <Avatar name={player.name} color={player.color} size={46} edge={L.edge} fontSize={20} />
    <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {player.name}
    </span>
    {badge != null && <span style={{ position: 'absolute', top: -8, right: -6 }}>{badge}</span>}
  </div>
);

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>{children}</div>
);

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 26, lineHeight: 1.05 }}>{children}</span>
);

const Hint: React.FC<{ L: Look; center?: boolean; children: React.ReactNode }> = ({ L, center, children }) => (
  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.4, color: L.dim, textAlign: center ? 'center' : undefined }}>{children}</p>
);

/** .ww-count: yellow number chip. */
const Count: React.FC<{ n: number }> = ({ n }) => (
  <span
    style={{
      display: 'inline-block',
      minWidth: 26,
      boxSizing: 'border-box',
      padding: '2px 7px',
      border: `2px solid ${T.ink}`,
      borderRadius: 999,
      background: T.yellow,
      color: T.ink2,
      fontFamily: FONT_DISPLAY,
      fontSize: 12,
      fontWeight: 800,
      textAlign: 'center',
      lineHeight: 1.45,
    }}
  >
    {n}
  </span>
);

/** .ww-rolechip */
const RoleChip: React.FC<{ role: KurtRole; label: string }> = ({ role, label }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      padding: '2px 8px',
      border: `2px solid ${T.ink}`,
      borderRadius: 999,
      background: KURT_ROLE_COLOR[role],
      color: T.ink2,
      fontSize: 12,
      fontWeight: 800,
    }}
  >
    <RoleGlyph role={role} size={14} />
    {label}
  </span>
);

/* ---------- Night: wolf (artboard "Kurt (avlanıyor)") ---------- */

export type KurtNightWolfProps = {
  players?: KurtPlayer[];
  /** Index into `players` of my pick (red tile, tilted), or null. */
  pick: number | null;
  /** Other wolves' votes per target (artboard: [0,0,1,0,0,0]); my pick adds 1. */
  baseVotes?: number[];
  timer: number;
  timerMax?: number;
  /** One wolf-chat line; null hides the box. */
  chat?: { who: string; text: string } | null;
  cardOpen: boolean;
  nightNo?: number;
  /** "Diğer kurtlar: …" on the open card. */
  allies?: string[];
};

export const KurtNightWolf: React.FC<KurtNightWolfProps> = ({
  players = KURT_PLAYERS,
  pick,
  baseVotes = [0, 0, 1, 0, 0, 0],
  timer,
  timerMax = 30,
  chat = { who: 'Kaan', text: 'Deniz çok şüpheleniyor, onu alalım' },
  cardOpen,
  nightNo = 2,
  allies = ['Kaan'],
}) => (
  <Shell look="night">
    <TopBar L={NIGHT} label={`${S.phase.night} · ${S.night(nightNo)}`} />
    <NightClock timer={timer} timerMax={timerMax} step="wolves" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
      <Title>{S.wolvesTitle}</Title>
      <Grid>
        {players.map((p, i) => {
          const on = pick === i;
          const v = (baseVotes[i] ?? 0) + (on ? 1 : 0);
          return (
            <Tile
              key={p.name}
              L={NIGHT}
              player={p}
              picked={on}
              pick={T.red}
              pickBg={N.wolfPick}
              badge={
                v > 0 ? (
                  <span style={{ display: 'block', padding: '2px 7px', borderRadius: 999, background: T.red, color: T.ink2, border: '2px solid #000000', fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap' }}>
                    {S.wolfVotes(v)}
                  </span>
                ) : null
              }
            />
          );
        })}
      </Grid>
      {chat && (
        <div style={{ background: N.card, border: `2px solid ${N.line}`, borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.5, color: T.red }}>
            {trUpper(S.wolfChat)} · {S.wolfChatHint}
          </span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            <strong style={{ fontWeight: 800 }}>{chat.who}:</strong> {chat.text}
          </span>
        </div>
      )}
    </div>
    <Fill />
    <RoleCard
      L={NIGHT}
      open={cardOpen}
      role="wolf"
      icon={<ClawGlyph />}
      lines={[allies.length ? `${S.allies}: ${allies.join(', ')}` : S.noAllies]}
      textGap={0}
    />
  </Shell>
);

/* ---------- Night: sleeper (artboard "Uyuyan köylü") ---------- */

export type KurtNightSleepProps = {
  players?: KurtPlayer[];
  timer: number;
  cardOpen: boolean;
  nightNo?: number;
  timerMax?: number;
  /** My role on the open card (default villager). */
  role?: KurtRole;
};

export const KurtNightSleep: React.FC<KurtNightSleepProps> = ({ players = KURT_PLAYERS, timer, timerMax = 30, cardOpen, nightNo = 2, role = 'villager' }) => (
  <Shell look="night">
    <TopBar L={NIGHT} label={`${S.phase.night} · ${S.night(nightNo)}`} />
    <NightClock timer={timer} timerMax={timerMax} step="wolves" />
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: '26px 0', position: 'relative' }}>
      <span
        style={{
          width: 110,
          height: 110,
          boxSizing: 'border-box',
          borderRadius: '50%',
          background: N.moon,
          border: '3px solid #000000',
          boxShadow: `inset -24px -10px 0 ${N.moonShade}`,
        }}
      />
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 30, lineHeight: 1.05 }}>{S.sleepTitle}</span>
      <span style={{ fontWeight: 700, fontSize: 15, color: T.text3, maxWidth: 300 }}>{S.sleepBody}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1.5, color: T.text3, textAlign: 'left' }}>
          {trUpper(S.aliveNow)} · {players.length}
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {players.map((p) => (
            <Avatar key={p.name} name={p.name} color={p.color} size={46} edge="#000000" fontSize={19} />
          ))}
        </div>
      </div>
    </div>
    <Fill />
    <RoleCard L={NIGHT} open={cardOpen} role={role} textGap={0} />
  </Shell>
);

/* ---------- Night: seer (web game Turn 'seer') ---------- */

/** color-mix(in srgb, lilac 22%, #221a4d) */
const SEER_PICK_BG = '#433574';

export type KurtNightSeerProps = {
  players?: KurtPlayer[];
  /** Index into `players` I tapped; without a result the hint reads "Gönderiliyor…". */
  pick: number | null;
  result: { name: string; wolf: boolean } | null;
  timer: number;
  cardOpen?: boolean;
  timerMax?: number;
  nightNo?: number;
};

export const KurtNightSeer: React.FC<KurtNightSeerProps> = ({ players = KURT_PLAYERS, pick, result, timer, timerMax = 30, cardOpen = false, nightNo = 2 }) => (
  <Shell look="night">
    <TopBar L={NIGHT} label={`${S.phase.night} · ${S.night(nightNo)}`} />
    <NightClock timer={timer} timerMax={timerMax} step="seer" />
    {result ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '20px 16px',
            border: '3px solid #000000',
            borderRadius: 22,
            background: result.wolf ? T.red : T.mint,
            boxShadow: '6px 6px 0 #000000',
            color: T.ink2,
            textAlign: 'center',
            transform: 'rotate(-2deg)',
          }}
        >
          <RoleGlyph role={result.wolf ? 'wolf' : 'villager'} size={34} />
          <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, lineHeight: 1.05 }}>
            {result.wolf ? S.seerIsWolf(result.name) : S.seerNotWolf(result.name)}
          </p>
        </div>
        <Hint L={NIGHT}>{S.stepDone}</Hint>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
        <Title>{S.seerTitle}</Title>
        <Grid>
          {players.map((p, i) => (
            <Tile key={p.name} L={NIGHT} player={p} picked={pick === i} pick={T.lilac} pickBg={SEER_PICK_BG} />
          ))}
        </Grid>
        <Hint L={NIGHT}>{pick !== null ? S.pending : S.seerHint}</Hint>
      </div>
    )}
    <Fill />
    <RoleCard
      L={NIGHT}
      open={cardOpen}
      role="seer"
      lines={result ? [`${S.seerResults}: ${result.name} ${result.wolf ? S.isWolf : S.notWolf}`] : []}
      blurb={S.roleBlurb.seer}
    />
  </Shell>
);

/* ---------- Day: dawn (web game Dawn, shown at the top of the discussion) ---------- */

export type KurtDawnProps = {
  nightNo: number;
  dead: string[];
  players?: KurtPlayer[];
  /** Revealed role per dead name (rule "Ölenin rolü açıklansın"); key or Turkish name. */
  roles?: Record<string, string>;
  timer?: number;
  timerMax?: number;
};

const DawnCard: React.FC<{ nightNo: number; dead: string[]; roles?: Record<string, string> }> = ({ nightNo, dead, roles }) => (
  <section
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '14px 16px',
      border: `3px solid ${T.ink}`,
      borderRadius: 22,
      background: T.yellow,
      boxShadow: `6px 6px 0 ${T.ink}`,
      color: T.ink2,
      transform: 'rotate(-1deg)',
    }}
  >
    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, lineHeight: 1 }}>{trUpper(S.dawnTitle(nightNo))}</span>
    {dead.length === 0 ? (
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, lineHeight: 1.05 }}>{S.dawnNone}</span>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {dead.map((d) => {
          const r = roleOf(roles?.[d]);
          return (
            <div key={d} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 26,
                  fontWeight: 800,
                  lineHeight: 1.05,
                  textDecoration: 'line-through',
                  textDecorationThickness: 3,
                }}
              >
                {d}
              </span>
              {r && <RoleChip role={r} label={S.role[r]} />}
            </div>
          );
        })}
      </div>
    )}
  </section>
);

export const KurtDawn: React.FC<KurtDawnProps> = ({ nightNo, dead, players = KURT_PLAYERS, roles, timer = 88, timerMax = 90 }) => (
  <Shell look="day">
    <TopBar L={DAY} label={`${S.phase.discuss} · ${S.day(nightNo)}`} lineHeight={1.2} />
    <DayClock timer={timer} timerMax={timerMax} day={nightNo} phase={S.phase.discuss} alive={players.filter((p) => !dead.includes(p.name)).length} />
    <DawnCard nightNo={nightNo} dead={dead} roles={roles} />
    <Fill />
    <RoleCard L={DAY} open={false} role="villager" />
  </Shell>
);

/* ---------- Day: discussion (web game Discuss) ---------- */

export type KurtDiscussProps = {
  dayNo: number;
  /** Alive players. */
  players?: KurtPlayer[];
  candidates: { name: string; by: string[] }[];
  timer: number;
  readyCount?: [number, number];
  timerMax?: number;
  /** Me: left out of the nomination grid (the game never lets you nominate yourself). */
  me?: string;
  /** My nomination: yellow tilted tile + "… kişisini aday gösterdin." */
  myNomination?: string | null;
  /** Show the dawn card above the panel, as the game does on the morning after a night. */
  dawn?: { dead: string[]; roles?: Record<string, string> } | null;
};

/** color-mix(in srgb, yellow 22%, panel) */
const DAY_PICK_BG = '#654f7b';

export const KurtDiscuss: React.FC<KurtDiscussProps> = ({
  dayNo,
  players = KURT_PLAYERS,
  candidates,
  timer,
  timerMax = 120,
  readyCount,
  me,
  myNomination = null,
  dawn = null,
}) => {
  const [ready, total] = readyCount ?? [0, players.length];
  const grid = players.filter((p) => p.name !== me);
  return (
    <Shell look="day">
      <TopBar L={DAY} label={`${S.phase.discuss} · ${S.day(dayNo)}`} lineHeight={1.2} />
      <DayClock timer={timer} timerMax={timerMax} day={dayNo} phase={S.phase.discuss} alive={total} />
      {dawn && <DawnCard nightNo={dayNo} dead={dawn.dead} roles={dawn.roles} />}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p
          style={{
            margin: 0,
            padding: 10,
            border: `3px dashed ${T.violet}`,
            borderRadius: 18,
            fontSize: 14,
            fontWeight: 700,
            color: T.text3,
            textAlign: 'center',
          }}
        >
          {S.discussRule}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, color: DAY.dim, lineHeight: 1 }}>{trUpper(S.candidates)}</span>
          {candidates.length === 0 ? (
            <Hint L={DAY}>{S.noCandidates}</Hint>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {candidates.map((c) => (
                <div
                  key={c.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '10px 12px',
                    border: `3px solid ${T.ink}`,
                    borderRadius: 16,
                    background: T.panel,
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  <b style={{ fontWeight: 800 }}>{c.name}</b>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text3 }}>{S.nominatedBy(c.by.join(', '))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.text2, fontFamily: FONT_DISPLAY, lineHeight: 1 }}>{S.discussPick}</span>
        <Grid>
          {grid.map((p) => {
            const n = candidates.find((c) => c.name === p.name)?.by.length ?? 0;
            return <Tile key={p.name} L={DAY} player={p} picked={myNomination === p.name} pick={T.yellow} pickBg={DAY_PICK_BG} badge={n ? <Count n={n} /> : null} />;
          })}
        </Grid>
        {myNomination && <Hint L={DAY}>{S.myNomination(myNomination)}</Hint>}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            boxSizing: 'border-box',
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
          }}
        >
          {S.readyBtn}
        </div>
        <Hint L={DAY} center>
          {S.readyCount(ready, total)}
        </Hint>
      </section>
      <Fill />
      <RoleCard L={DAY} open={false} role="villager" />
    </Shell>
  );
};

/* ---------- Day: vote (web game Vote) ---------- */

export type KurtVoteProps = {
  options: { name: string; votes: number; by?: string[] }[];
  noneVotes: number;
  /** My ballot: a candidate's name, or "Kimseyi asma" / "none" for the none row; null/undefined = not voted yet. */
  mine?: string | null;
  /** [voted, alive] → "3/6 kişi oy verdi". */
  progress: [number, number];
  /** Open votes: counts (and voter names when `by` is given) are visible; secret votes hide them. Default true. */
  open?: boolean;
  dayNo?: number;
  timer?: number;
  timerMax?: number;
  players?: KurtPlayer[];
  noneBy?: string[];
};

export const KurtVote: React.FC<KurtVoteProps> = ({
  options,
  noneVotes,
  mine = null,
  progress,
  open = true,
  dayNo = 2,
  timer = 24,
  timerMax = 45,
  players = KURT_PLAYERS,
  noneBy,
}) => {
  const mineNone = mine === 'none' || mine === S.voteNone;
  const rows = [
    ...options.map((o) => ({ key: o.name, name: o.name, votes: o.votes, by: o.by, none: false, on: !mineNone && mine === o.name })),
    { key: '__none', name: S.voteNone, votes: noneVotes, by: noneBy, none: true, on: mineNone },
  ];
  const mineLabel = mine == null ? '' : `${S.voteMine(mineNone ? S.nobody : mine)}. `;
  return (
    <Shell look="day">
      <TopBar L={DAY} label={`${S.phase.vote} · ${S.day(dayNo)}`} lineHeight={1.2} />
      <DayClock timer={timer} timerMax={timerMax} day={dayNo} phase={S.phase.vote} alive={progress[1]} />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Title>{S.voteTitle}</Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <div key={r.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 62,
                  padding: '8px 14px',
                  border: `3px solid ${T.ink}`,
                  borderRadius: 18,
                  background: r.on ? (r.none ? T.paper2 : T.yellow) : r.none ? T.panel2 : T.panel,
                  boxShadow: `0 ${r.on ? 1 : 4}px 0 ${T.ink}`,
                  color: r.on ? T.ink2 : T.text,
                  transform: r.on ? 'translateY(3px)' : undefined,
                }}
              >
                {r.none ? (
                  <span style={{ flex: 'none', boxSizing: 'border-box', width: 40, height: 40, border: `3px dashed ${T.violet}`, borderRadius: '50%' }} />
                ) : (
                  <Avatar name={r.name} color={colorOf(r.name, players)} size={32} edge={T.ink} />
                )}
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    fontFamily: FONT_DISPLAY,
                    fontSize: 20,
                    fontWeight: 800,
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.name}
                </span>
                {open && <Count n={r.votes} />}
              </div>
              {open && r.by && r.by.length > 0 && (
                <p style={{ margin: 0, padding: '6px 14px 0', fontSize: 12, fontWeight: 700, color: T.text3 }}>{r.by.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
        <Hint L={DAY} center>
          {mineLabel}
          {S.voteProgress(progress[0], progress[1])}. {S.voteHint(open)}
        </Hint>
      </section>
      <Fill />
      <RoleCard L={DAY} open={false} role="villager" />
    </Shell>
  );
};

/* ---------- Day: verdict (web game Verdict) ---------- */

export type KurtVerdictProps = {
  hanged: string | null;
  /** Hanged player's role: key ("wolf") or Turkish name ("Kurt Adam"). Shown only with `hanged`. */
  role?: string;
  /** Use "Kimseyi asma" as the name for the none row. */
  tally: { name: string; votes: number; by?: string[] }[];
  /** Why nobody hanged: 'none' = no candidates, 'tie' = tie; omitted = "Bugün kimse asılmadı." */
  spared?: 'none' | 'tie';
  dayNo?: number;
  timer?: number;
  timerMax?: number;
  alive?: number;
};

export const KurtVerdict: React.FC<KurtVerdictProps> = ({ hanged, role, tally, spared, dayNo = 2, timer = 6, timerMax = 8, alive = 5 }) => {
  const r = hanged ? roleOf(role) : null;
  const max = Math.max(1, ...tally.map((t) => t.votes));
  const sorted = [...tally].sort((a, b) => b.votes - a.votes);
  return (
    <Shell look="day">
      <TopBar L={DAY} label={`${S.phase.verdict} · ${S.day(dayNo)}`} lineHeight={1.2} />
      <DayClock timer={timer} timerMax={timerMax} day={dayNo} phase={S.phase.verdict} alive={alive} />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
          {hanged ? S.hanged(hanged) : spared === 'none' ? S.sparedNone : spared === 'tie' ? S.sparedTie : S.spared}
        </span>
        {r && <RoleChip role={r} label={S.hangedRole(S.role[r])} />}
        {sorted.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 12,
              border: `3px solid ${T.ink}`,
              borderRadius: 18,
              background: T.panel,
            }}
          >
            {sorted.map((t) => {
              const top = !!hanged && t.name === hanged;
              return (
                <div
                  key={t.name}
                  style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7em) 1fr auto', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 800 }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <span style={{ height: 12, boxSizing: 'border-box', overflow: 'hidden', border: `2px solid ${T.ink}`, borderRadius: 999, background: T.panel2 }}>
                    <span style={{ display: 'block', height: '100%', width: `${(t.votes / max) * 100}%`, background: top ? T.yellow : T.text3 }} />
                  </span>
                  <span style={{ fontFamily: FONT_DISPLAY }}>{t.votes}</span>
                  {t.by && t.by.length > 0 && <span style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700, color: T.text3 }}>{t.by.join(', ')}</span>}
                </div>
              );
            })}
          </div>
        )}
        <Hint L={DAY} center>
          {S.nightFalls}
        </Hint>
      </section>
      <Fill />
      <RoleCard L={DAY} open={false} role="villager" />
    </Shell>
  );
};

/* ---------- Game over (web game Over) ---------- */

export type KurtResultProps = {
  winner: 'wolves' | 'village';
  /** A KurtReason key ("wolvesParity") or the sentence itself. */
  reason: string;
  /** Everyone's role (key or Turkish name); wolves go to the Kurtlar column, the rest to Köy. */
  roles?: { name: string; role: string; dead?: boolean }[];
  /** "Lobiye dönülüyor… · N sn" and the bar under it. */
  backIn?: number;
  backTotal?: number;
  players?: KurtPlayer[];
};

const DEFAULT_ROLES: { name: string; role: string; dead?: boolean }[] = [
  { name: 'Kaan', role: 'wolf' },
  { name: 'Bora', role: 'wolf' },
  { name: 'Ece', role: 'seer', dead: true },
  { name: 'Mert', role: 'doctor' },
  { name: 'Deniz', role: 'villager', dead: true },
  { name: 'Zeynep', role: 'witch' },
  { name: 'Sude', role: 'villager' },
];

export const KurtResult: React.FC<KurtResultProps> = ({ winner, reason, roles = DEFAULT_ROLES, backIn = 8, backTotal = 15, players = KURT_PLAYERS }) => {
  const resolved = roles.map((x) => ({ ...x, r: roleOf(x.role) ?? 'villager' }));
  const sides = [
    { key: 'wolves' as const, label: S.sideWolves, seats: resolved.filter((x) => x.r === 'wolf'), color: T.red },
    { key: 'village' as const, label: S.sideVillage, seats: resolved.filter((x) => x.r !== 'wolf'), color: T.mint },
  ];
  if (winner === 'village') sides.reverse();
  const reasonText = reason in S.reason ? S.reason[reason as KurtReason] : reason;
  const confetti: React.CSSProperties[] = [
    { top: 50, left: 30, width: 16, height: 7, background: T.yellow, transform: 'rotate(30deg)' },
    { top: 90, right: 40, width: 16, height: 7, background: T.pink, transform: 'rotate(-40deg)' },
    { top: 150, left: 64, width: 11, height: 11, background: T.mint, transform: 'rotate(20deg)' },
    { top: 40, right: 120, width: 11, height: 11, borderRadius: '50%', background: T.sky },
    { top: 190, right: 60, width: 16, height: 7, background: T.coral, transform: 'rotate(70deg)' },
  ];
  return (
    <Shell look="day">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: T.text3 }}>
        <span>{S.name}</span>
        <span style={{ letterSpacing: 2 }}>{S.code}</span>
      </div>
      <section style={{ position: 'relative', display: 'flex', flex: 1, flexDirection: 'column', gap: 18 }}>
        <span style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 240 }}>
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
            {trUpper(S.gameOver)}
          </span>
          <span style={{ marginTop: 8, fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: 800, lineHeight: 0.95 }}>{S.winnerTitle[winner]}</span>
          {reasonText && <span style={{ fontSize: 15, fontWeight: 700, color: T.text2 }}>{reasonText}</span>}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: 12 }}>
          {sides.map((side, i) => {
            const won = side.key === winner;
            return (
              <React.Fragment key={side.key}>
                {i > 0 && <span style={{ alignSelf: 'center', fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 800, color: T.text3 }}>–</span>}
                <div
                  style={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    minWidth: 0,
                    padding: 14,
                    border: `4px solid ${T.ink}`,
                    borderRadius: 26,
                    background: side.color,
                    color: T.ink2,
                    textAlign: 'center',
                    transform: won ? 'rotate(-3deg)' : 'rotate(2deg)',
                    alignSelf: won ? 'stretch' : 'flex-end',
                    boxShadow: won ? `6px 6px 0 ${T.ink}` : undefined,
                  }}
                >
                  {won && (
                    <svg width={40} height={28} viewBox="0 0 40 28">
                      <path d="M3 25L6 6l9 9 5-12 5 12 9-9 3 19z" fill="#FFD23F" stroke="#0D0828" strokeWidth={3} strokeLinejoin="round" />
                    </svg>
                  )}
                  <span style={{ marginTop: won ? 0 : 10, fontFamily: FONT_DISPLAY, fontSize: won ? 64 : 52, fontWeight: 800, lineHeight: 1 }}>{side.seats.length}</span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{side.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
          {sides.map((side) => (
            <div
              key={side.key}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: `3px solid ${T.ink}`, borderRadius: 18, background: T.panel }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: side.color }}>{trUpper(side.label)}</span>
              {side.seats.map((seat) => (
                <div key={seat.name} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 15, fontWeight: 800 }}>
                  <Avatar name={seat.name} color={colorOf(seat.name, players)} size={28} edge={T.ink} />
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', lineHeight: 1.15, whiteSpace: 'nowrap', opacity: seat.dead ? 0.6 : 1 }}>
                    {seat.name}
                    <small style={{ fontSize: 11, fontWeight: 800, color: KURT_ROLE_COLOR[seat.r] }}>{S.role[seat.r]}</small>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <Fill />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: '100%', height: 12, boxSizing: 'border-box', overflow: 'hidden', border: `2px solid ${T.ink}`, borderRadius: 999, background: T.panel2 }}>
            <div style={{ height: '100%', width: `${(1 - backIn / Math.max(1, backTotal)) * 100}%`, background: T.yellow }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text2 }}>{S.backIn(backIn)}</span>
        </div>
      </section>
    </Shell>
  );
};
