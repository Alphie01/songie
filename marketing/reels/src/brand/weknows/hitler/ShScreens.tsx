import React from 'react';
import { FONT_BODY, FONT_DISPLAY } from '../../fonts';
import { KURT_W, type KurtPlayer } from '../kurt/KurtScreens';
import {
  FASCIST_TO_WIN,
  HITLER_ZONE,
  LIBERAL_TO_WIN,
  SH_TEXT as S,
  VETO_AT,
  fascistTrack,
  trUpper,
  type ShParty,
  type ShPhase,
  type ShPolicy,
  type ShPower,
  type ShRole,
  type ShWinReason,
} from './shText';

/**
 * Secret Hitler phone screens for ads, drawn at 390 CSS px like the design artboard. Wrap each in <Screen390> (kurt module).
 * Vote screen: SecretHitler.dc.html (390×844), values copied 1:1 (look 'artboard').
 * Every other screen: games/secret-hitler/client/PlayView.tsx + secret-hitler.css, tokens from apps/web/src/styles/tokens.css,
 * buttons from apps/web/src/styles/ui.css, icons from games/secret-hitler/client/Glyphs.tsx (look 'web').
 * The two looks differ only where the artboard and the web CSS differ (line-heights, content-box slot/dot sizes, track label font).
 */

/* ---------- Tokens ---------- */

/** apps/web/src/styles/tokens.css */
const T = {
  bg: '#2a1b6e',
  panel: '#3a2a8c',
  panel2: '#1f145a',
  paper: '#ffffff',
  ink: '#0d0828',
  ink2: '#120c2e',
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

/** secret-hitler.css `.sh` variables. */
const H = {
  bg: '#1a1240',
  edge: '#000000',
  dim: '#8a80b8',
  soft: '#3a2e80',
  libInk: '#9fd3ff',
  fasInk: '#ffc1a6',
  nein: '#0b0720',
} as const;

/** `--side` / `--side-ink` per party. */
export const SH_SIDE: Record<ShParty, { side: string; ink: string }> = {
  liberal: { side: T.sky, ink: H.libInk },
  fascist: { side: T.coral, ink: H.fasInk },
};
const partyOf = (r: ShRole): ShParty => (r === 'liberal' ? 'liberal' : 'fascist');
/** Role card / tag colour: party colour, Hitler red (`.sh-rolecard[data-role='hitler']`, `.sh-tag[data-role='hitler']`). */
export const SH_ROLE_COLOR: Record<ShRole, string> = { liberal: T.sky, fascist: T.coral, hitler: T.red };

/* ---------- Players ---------- */

export type ShPlayer = KurtPlayer & { dead?: boolean };

/** Seven seats (7 players: 4 liberal, 2 fascist + Hitler). Colours: the artboards' avatar colours; Kaan gets game-kit lilac. Bora is executed, as on the artboard. */
export const SH_PLAYERS: ShPlayer[] = [
  { name: 'Ece', color: '#FF7AC6' },
  { name: 'Mert', color: '#3EE0A8' },
  { name: 'Deniz', color: '#5AB8FF' },
  { name: 'Kaan', color: '#B794FF' },
  { name: 'Bora', color: '#FF8A5B', dead: true },
  { name: 'Zeynep', color: '#FFD23F' },
  { name: 'Sude', color: '#FFFFFF' },
];

const colorOf = (name: string, players: ShPlayer[]) =>
  players.find((p) => p.name === name)?.color ?? SH_PLAYERS.find((p) => p.name === name)?.color ?? T.mint;

/** Next living seat after `name` (presidency passes to the left). */
const nextAlive = (name: string, players: ShPlayer[]) => {
  const i = players.findIndex((p) => p.name === name);
  for (let k = 1; k <= players.length; k++) {
    const p = players[(i + k) % players.length]!;
    if (!p.dead) return p.name;
  }
  return name;
};

/* ---------- Shared props ---------- */

export type ShLook = 'artboard' | 'web';

/** Board header (phase pill + both tracks + election tracker + piles) and seats; every in-game screen takes these. */
export type ShBoardProps = {
  players?: ShPlayer[];
  liberal: number;
  fascist: number;
  /** Election tracker 0–3. */
  tracker: number;
  deck?: number;
  discard?: number;
  code?: string;
  /** Artboard values (vote default) or web CSS values (default elsewhere). */
  look?: ShLook;
};

/** The hold-to-reveal role card at the bottom of every in-game screen. */
export type ShCardProps = {
  cardOpen?: boolean;
  role?: ShRole;
  /** Who I am: my chip shows my role while the card is open (as on the web). */
  me?: string;
  /** Known teammates ("Takım arkadaşların: …"); also coloured in the strip while open. */
  team?: { name: string; role: ShRole }[];
  /** President's loyalty checks ("Sorgulama sonuçların: …"). */
  investigations?: { name: string; party: ShParty }[];
};

/* ---------- Glyphs (Glyphs.tsx, original) ---------- */

const POWER_PATHS: Record<ShPower, React.ReactNode> = {
  peek: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  investigate: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M15 15l5 5" />
    </>
  ),
  specialElection: <path d="M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />,
  execution: <path d="M6 6l12 12M18 6L6 18" />,
};

export const PowerGlyph: React.FC<{ power: ShPower; size?: number }> = ({ power, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flex: 'none' }}
  >
    {POWER_PATHS[power]}
  </svg>
);

/** Policy emblem: liberal = ring, fascist = sharp diamond. */
export const PolicyGlyph: React.FC<{ policy: ShPolicy; size?: number }> = ({ policy, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flex: 'none' }}>
    {policy === 'liberal' ? (
      <>
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      </>
    ) : (
      <path d="M12 2.5l7 9.5-7 9.5-7-9.5z" fill="currentColor" />
    )}
  </svg>
);

/* ---------- Canvas ---------- */

/** Artboard root: #1A1240, padding 18 18 22, column gap 12. Web body: line-height 1.45. */
const Shell: React.FC<{ look: ShLook; children: React.ReactNode }> = ({ look, children }) => (
  <div
    style={{
      position: 'relative',
      width: KURT_W,
      height: '100%',
      boxSizing: 'border-box',
      background: H.bg,
      color: T.text,
      fontFamily: FONT_BODY,
      fontWeight: 600,
      lineHeight: look === 'artboard' ? 'normal' : 1.45,
      padding: '18px 18px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const Fill = () => <div style={{ flex: 1 }} />;

/** .sh-top: lilac phase pill + room code. */
const TopBar: React.FC<{ look: ShLook; phase: ShPhase; code: string }> = ({ look, phase, code }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
    <span
      style={{
        padding: '7px 14px',
        borderRadius: 999,
        background: T.lilac,
        color: T.ink2,
        border: `3px solid ${H.edge}`,
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: 16,
        lineHeight: look === 'artboard' ? 'normal' : 1.2,
      }}
    >
      {S.phase[phase]}
    </span>
    <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: 2, color: H.dim }}>{code}</span>
  </div>
);

/** .sh-track-label: artboard = Nunito span; web = an h2 (Baloo 2, line-height 1.05). */
const TrackLabel: React.FC<{ look: ShLook; color: string; children: string }> = ({ look, color, children }) => (
  <span
    style={{
      fontFamily: look === 'artboard' ? FONT_BODY : FONT_DISPLAY,
      fontWeight: 800,
      fontSize: 12,
      letterSpacing: 1.5,
      lineHeight: look === 'artboard' ? 'normal' : 1.05,
      color,
    }}
  >
    {trUpper(children)}
  </span>
);

/** Slots are 46 px plus a 3 px border: content-box on the artboard (52), border-box on the web (46). */
const Slot: React.FC<{ look: ShLook; party: ShParty; filled: boolean; gate?: boolean; children?: React.ReactNode }> = ({ look, party, filled, gate, children }) => {
  const c = SH_SIDE[party];
  return (
    <span
      style={{
        boxSizing: 'border-box',
        height: look === 'artboard' ? 52 : 46,
        borderRadius: 10,
        border: filled ? `3px solid ${H.edge}` : `3px dashed ${c.side}`,
        background: filled ? c.side : party === 'fascist' ? 'rgba(255,107,107,0.15)' : undefined,
        boxShadow: gate ? `0 0 0 2px ${T.red}` : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: c.ink,
      }}
    >
      {children}
    </span>
  );
};

/** .sh-tracks: liberal 5 slots, fascist 6 slots with powers, election tracker + deck/discard. */
const Tracks: React.FC<{ look: ShLook; liberal: number; fascist: number; tracker: number; deck: number; discard: number; seats: number }> = ({
  look,
  liberal,
  fascist,
  tracker,
  deck,
  discard,
  seats,
}) => {
  const track = fascistTrack(seats);
  const dot = look === 'artboard' ? 16 : 12;
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <TrackLabel look={look} color={H.libInk}>
          {S.play.trackCount(S.play.liberalTrack, liberal, LIBERAL_TO_WIN)}
        </TrackLabel>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${LIBERAL_TO_WIN}, minmax(0, 1fr))`, gap: 6 }}>
          {Array.from({ length: LIBERAL_TO_WIN }, (_, i) => (
            <Slot key={i} look={look} party="liberal" filled={i < liberal} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <TrackLabel look={look} color={H.fasInk}>
          {S.play.trackCount(S.play.fascistTrack, fascist, FASCIST_TO_WIN)}
        </TrackLabel>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FASCIST_TO_WIN}, minmax(0, 1fr))`, gap: 6 }}>
          {track.map((power, i) => (
            <Slot key={i} look={look} party="fascist" filled={i < fascist} gate={i === HITLER_ZONE - 1}>
              {i >= fascist && power ? <PowerGlyph power={power} size={18} /> : null}
            </Slot>
          ))}
        </div>
        <span style={{ fontWeight: 700, fontSize: 12, color: H.fasInk }}>{fascist >= VETO_AT ? S.play.vetoZone : S.play.hitlerZone}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 12, color: T.text3 }}>
        <span>{S.play.tracker}</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              flex: 'none',
              boxSizing: 'border-box',
              width: dot,
              height: dot,
              borderRadius: '50%',
              border: `2px solid ${i < tracker ? H.edge : T.violet}`,
              background: i < tracker ? T.yellow : undefined,
            }}
          />
        ))}
        <span style={{ marginLeft: 'auto' }}>{S.play.pileInfo(deck, discard)}</span>
      </div>
    </>
  );
};

/** .sh-panel */
const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      background: T.bg,
      border: `3px solid ${H.edge}`,
      borderRadius: 22,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}
  >
    {children}
  </div>
);

const Title: React.FC<{ children: React.ReactNode; icon?: ShPower }> = ({ children, icon }) => (
  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: 1.1, display: icon ? 'flex' : undefined, alignItems: 'center', gap: 8 }}>
    {icon && (
      <span style={{ color: H.fasInk, display: 'inline-flex' }}>
        <PowerGlyph power={icon} size={20} />
      </span>
    )}
    {icon ? <span>{children}</span> : children}
  </span>
);

const Hint: React.FC<{ children: React.ReactNode; lineHeight?: number | 'normal' }> = ({ children, lineHeight = 1.4 }) => (
  <span style={{ fontWeight: 700, fontSize: 13, lineHeight, color: T.text2 }}>{children}</span>
);

/** .sh-wait */
const Wait: React.FC<{ children: React.ReactNode; power?: ShPower }> = ({ children, power }) => (
  <span
    style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19, lineHeight: 1.15, display: power ? 'flex' : undefined, alignItems: 'center', gap: 8 }}
  >
    {power && (
      <span style={{ color: H.fasInk, display: 'inline-flex' }}>
        <PowerGlyph power={power} size={18} />
      </span>
    )}
    {power ? <span>{children}</span> : children}
  </span>
);

/** .sh-silence */
const Silence = () => (
  <span style={{ padding: '8px 10px', border: `2px dashed ${T.violet}`, borderRadius: 14, fontSize: 12, fontWeight: 700, color: T.text3 }}>{S.play.silence}</span>
);

/** .btn.btn-primary.btn-block.btn-lg */
const BigButton: React.FC<{ children: string; disabled?: boolean }> = ({ children, disabled }) => (
  <span
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
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {children}
  </span>
);

/** .btn.btn-outline.btn-block (veto) */
const OutlineButton: React.FC<{ children: string }> = ({ children }) => (
  <span
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      boxSizing: 'border-box',
      minHeight: 48,
      padding: '0 18px',
      border: `3px solid ${T.ink}`,
      borderRadius: 16,
      background: T.panel,
      color: T.text,
      boxShadow: `0 4px 0 ${T.ink}`,
      fontFamily: FONT_DISPLAY,
      fontSize: 17,
      fontWeight: 800,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

/** .sh-voteresult pill: "Hükümet kuruldu  Ece / Mert: 5 Ja!, 1 Nein". */
const VoteResultPill: React.FC<{ president: string; nominee: string; votes: { name: string; ja: boolean }[]; passed: boolean }> = ({ president, nominee, votes, passed }) => {
  const ja = votes.filter((v) => v.ja).length;
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        padding: '4px 12px',
        border: `2px solid ${H.edge}`,
        borderRadius: 999,
        background: passed ? T.mint : T.red,
        color: T.ink2,
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <b style={{ fontWeight: 800 }}>{S.play.voteResult(passed)}</b>
      <span style={{ fontWeight: 700 }}>
        {' '}
        {president} / {nominee}: {ja} {S.play.ja}, {votes.length - ja} {S.play.nein}
      </span>
    </span>
  );
};

/** .sh-policy card. */
const PolicyCard: React.FC<{ policy: ShPolicy; index: number; selected?: boolean }> = ({ policy, index, selected }) => (
  <span
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      boxSizing: 'border-box',
      minHeight: 112,
      padding: '10px 4px',
      border: `3px solid ${H.edge}`,
      borderRadius: 18,
      background: policy === 'liberal' ? T.sky : T.coral,
      boxShadow: `4px 4px 0 ${H.edge}`,
      color: T.ink2,
      transform: selected ? 'translateY(-4px)' : index % 2 === 0 ? 'rotate(-3deg)' : 'rotate(3deg)',
      outline: selected ? `4px solid ${T.yellow}` : undefined,
      outlineOffset: selected ? 3 : undefined,
    }}
  >
    <PolicyGlyph policy={policy} size={30} />
    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{S.policy[policy]}</span>
  </span>
);

const Hand: React.FC<{ cards: ShPolicy[]; selected: number | null | undefined }> = ({ cards, selected }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cards.length === 2 ? 2 : 3}, minmax(0, 1fr))`,
      gap: 10,
      padding: cards.length === 2 ? '4px 24px' : '4px 2px',
    }}
  >
    {cards.map((p, i) => (
      <PolicyCard key={i} policy={p} index={i} selected={selected === i} />
    ))}
  </div>
);

/** .sh-targets of .option.sh-target buttons; the picked one is pressed (yellow). */
const Targets: React.FC<{ names: string[]; picked: string | null }> = ({ names, picked }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
    {names.map((n) => {
      const on = n === picked;
      return (
        <span
          key={n}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            minHeight: 48,
            padding: '0 14px',
            border: `3px solid ${H.edge}`,
            borderRadius: 12,
            background: on ? T.yellow : T.panel,
            color: on ? T.ink2 : T.text,
            fontFamily: FONT_DISPLAY,
            fontSize: 17,
            fontWeight: 800,
          }}
        >
          {n}
        </span>
      );
    })}
  </div>
);

/* ---------- Player strip (.sh-strip) ---------- */

type StripState = {
  president: string;
  chancellor?: string | null;
  /** Chancellor chip reads "Aday" while nominating/voting, "Şansölye" after. */
  nominee?: boolean;
  voted?: Set<string>;
  votes?: Record<string, boolean>;
  known?: Map<string, ShRole>;
};

const Strip: React.FC<{ look: ShLook; players: ShPlayer[] } & StripState> = ({ look, players, president, chancellor, nominee, voted, votes, known }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(58px, 1fr))', gap: 6 }}>
    {players.map((p) => {
      const isPres = p.name === president;
      const isChan = !!chancellor && p.name === chancellor;
      const kind = isPres ? 'pres' : isChan ? 'chan' : null;
      const role = known?.get(p.name);
      const vote = votes?.[p.name];
      const status = p.dead
        ? S.play.deadShort
        : isPres
          ? S.play.president
          : isChan
            ? nominee
              ? S.play.nominee
              : S.play.chancellor
            : voted?.has(p.name)
              ? S.play.voted
              : vote !== undefined
                ? vote
                  ? S.play.ja
                  : S.play.nein
                : role
                  ? S.role[role]
                  : ' ';
      const line: React.CSSProperties = { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
      return (
        <span
          key={p.name}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 0,
            padding: '6px 2px',
            borderRadius: 12,
            background: kind === 'pres' ? T.yellow : kind === 'chan' ? T.lilac : T.bg,
            color: kind ? T.ink2 : T.text,
            border: `2px solid ${kind ? H.edge : role ? SH_SIDE[partyOf(role)].side : H.soft}`,
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 11,
            lineHeight: look === 'artboard' ? 'normal' : 1.35,
            opacity: p.dead ? 0.5 : 1,
          }}
        >
          <span style={line}>{p.name}</span>
          <span style={line}>{status}</span>
        </span>
      );
    })}
  </div>
);

/* ---------- Role card (.sh-rolecard) ---------- */

const RoleCard: React.FC<{ look: ShLook } & ShCardProps & { seats: number }> = ({ look, cardOpen = false, role = 'liberal', team = [], investigations = [], seats }) => {
  const blurb =
    role === 'liberal' ? S.play.roleLiberal : role === 'fascist' ? S.play.roleFascist : team.length || seats <= 6 ? S.play.roleHitlerKnows : S.play.roleHitlerBlind;
  const art = look === 'artboard';
  const sub: React.CSSProperties = { fontFamily: FONT_BODY, fontSize: 13, fontWeight: 800 };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        boxSizing: 'border-box',
        flex: 'none',
        minHeight: 66,
        padding: art ? '0 16px' : '8px 16px',
        border: `3px solid ${H.edge}`,
        borderRadius: 20,
        background: cardOpen ? SH_ROLE_COLOR[role] : T.lilac,
        boxShadow: `0 ${cardOpen ? 2 : 6}px 0 ${H.edge}`,
        color: T.ink2,
        fontFamily: FONT_DISPLAY,
        fontSize: cardOpen ? 16 : 19,
        fontWeight: 800,
        lineHeight: art ? 'normal' : 1.15,
        textAlign: 'center',
        transform: cardOpen && !art ? 'translateY(4px)' : undefined,
      }}
    >
      {cardOpen ? (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span>{S.play.roleOpen(S.role[role], blurb)}</span>
          {team.length > 0 && (
            <span style={sub}>
              {S.play.roleTeam}: {team.map((k) => `${k.name} (${S.role[k.role]})`).join(', ')}
            </span>
          )}
          {investigations.length > 0 && (
            <span style={sub}>
              {S.play.investigations}: {investigations.map((r) => `${r.name} ${S.party[r.party].toLocaleLowerCase('tr-TR')}`).join(', ')}
            </span>
          )}
        </span>
      ) : (
        <span>{S.play.roleHold}</span>
      )}
    </div>
  );
};

/** Roles shown on the strip while the card is open: me + known teammates (PlayView knownRoles). */
const knownOf = (c: ShCardProps): Map<string, ShRole> | undefined => {
  if (!c.cardOpen) return undefined;
  const m = new Map<string, ShRole>();
  if (c.me) m.set(c.me, c.role ?? 'liberal');
  for (const t of c.team ?? []) m.set(t.name, t.role);
  return m;
};

/** One in-game screen: pill, tracks, panel, strip, fill, role card. */
const Board: React.FC<{
  b: ShBoardProps;
  c: ShCardProps;
  phase: ShPhase;
  defaultLook: ShLook;
  strip: StripState;
  children: React.ReactNode;
}> = ({ b, c, phase, defaultLook, strip, children }) => {
  const look = b.look ?? defaultLook;
  const players = b.players ?? SH_PLAYERS;
  return (
    <Shell look={look}>
      <TopBar look={look} phase={phase} code={b.code ?? S.code} />
      <Tracks look={look} liberal={b.liberal} fascist={b.fascist} tracker={b.tracker} deck={b.deck ?? 9} discard={b.discard ?? 3} seats={players.length} />
      <Panel>{children}</Panel>
      <Strip look={look} players={players} known={knownOf(c)} {...strip} />
      <Fill />
      <RoleCard look={look} {...c} seats={players.length} />
    </Shell>
  );
};

const splitProps = <P extends ShBoardProps & ShCardProps>(p: P) => {
  const { players, liberal, fascist, tracker, deck, discard, code, look, cardOpen, role, me, team, investigations } = p;
  return {
    b: { players, liberal, fascist, tracker, deck, discard, code, look } as ShBoardProps,
    c: { cardOpen, role, me, team, investigations } as ShCardProps,
  };
};

/* ---------- Vote (artboard) ---------- */

export type ShVoteProps = ShBoardProps &
  ShCardProps & {
    president: string;
    nominee: string;
    mine: 'ja' | 'nein' | null;
    /** "voted/total oy verildi". */
    voted: number;
    total: number;
    /** Who has voted (strip "Oy verdi"); default: the first `voted` living seats. */
    votedBy?: string[];
  };

const Ballot: React.FC<{ look: ShLook; v: 'ja' | 'nein'; mine: 'ja' | 'nein' | null }> = ({ look, v, mine }) => {
  const on = mine === v;
  const rot = v === 'ja' ? '-3deg' : '3deg';
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        minHeight: 100,
        padding: '1px 6px',
        borderRadius: 20,
        background: v === 'ja' ? '#FFFFFF' : H.nein,
        color: v === 'ja' ? T.ink2 : '#FFFFFF',
        border: `3px solid ${H.edge}`,
        fontFamily: FONT_DISPLAY,
        fontWeight: 800,
        fontSize: 34,
        lineHeight: look === 'artboard' ? 'normal' : 1.45,
        boxShadow: `0 ${on ? 2 : 7}px 0 ${H.edge}`,
        transform: `rotate(${rot}) translateY(${on ? '5px' : '0'})`,
        opacity: mine && !on ? 0.45 : 1,
        outline: on ? `4px solid ${T.yellow}` : undefined,
        outlineOffset: on ? 3 : undefined,
      }}
    >
      {v === 'ja' ? S.play.ja : S.play.nein}
    </span>
  );
};

export const ShVote: React.FC<ShVoteProps> = (props) => {
  const { president, nominee, mine, voted, total, votedBy } = props;
  const { b, c } = splitProps(props);
  const look = b.look ?? 'artboard';
  const players = b.players ?? SH_PLAYERS;
  const who = new Set(votedBy ?? players.filter((p) => !p.dead).slice(0, voted).map((p) => p.name));
  // Artboard status logic: before voting only the progress; after, "X dedin; …" + progress + the hint.
  const status = mine
    ? `${S.play.voteMine(mine === 'ja' ? S.play.ja : S.play.nein)} ${S.play.voteProgress(voted, total)}. ${S.play.voteHint}`
    : `${S.play.voteProgress(voted, total)}.`;
  return (
    <Board b={{ ...b, look }} c={c} phase="vote" defaultLook="artboard" strip={{ president, chancellor: nominee, nominee: true, voted: who }}>
      <Title>{S.play.voteTitle(president, nominee)}</Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, padding: look === 'web' ? '4px 2px 8px' : undefined }}>
        <Ballot look={look} v="ja" mine={mine} />
        <Ballot look={look} v="nein" mine={mine} />
      </div>
      <Hint lineHeight={look === 'artboard' ? 'normal' : 1.4}>{status}</Hint>
    </Board>
  );
};

/* ---------- Vote result ---------- */

export type ShVoteResultProps = ShBoardProps &
  ShCardProps & {
    president: string;
    nominee: string;
    /** Everyone's ballot, opened together. */
    votes: { name: string; ja: boolean }[];
    passed: boolean;
  };

/**
 * The web game opens all ballots at once: the strip chips switch to "Ja!" / "Nein" and the panel shows the result pill
 * (mint "Hükümet kuruldu" / red "Hükümet kurulamadı" with the Ja!/Nein counts).
 * Passed → legislative session (president at the cards); failed → presidency moves on, the tracker is the caller's.
 */
export const ShVoteResult: React.FC<ShVoteResultProps> = (props) => {
  const { president, nominee, votes, passed } = props;
  const { b, c } = splitProps(props);
  const players = b.players ?? SH_PLAYERS;
  const map = Object.fromEntries(votes.map((v) => [v.name, v.ja]));
  const next = passed ? president : nextAlive(president, players);
  return (
    <Board
      b={b}
      c={c}
      phase={passed ? 'presidentLegislate' : 'nominate'}
      defaultLook="web"
      strip={passed ? { president, chancellor: nominee, votes: map } : { president: next, chancellor: null, votes: map }}
    >
      <VoteResultPill president={president} nominee={nominee} votes={votes} passed={passed} />
      {passed ? (
        <>
          <Wait>{S.play.waitPresident(president)}</Wait>
          <Silence />
        </>
      ) : (
        <Wait>{S.play.waitNominate(next)}</Wait>
      )}
    </Board>
  );
};

/* ---------- Legislative session ---------- */

type GovProps = {
  /** Default Ece / Mert, the artboard's government. */
  president?: string;
  chancellor?: string;
  /** Last vote, shown on the strip chips of everyone else. */
  votes?: { name: string; ja: boolean }[];
};
const voteMap = (v?: { name: string; ja: boolean }[]) => (v ? Object.fromEntries(v.map((x) => [x.name, x.ja])) : undefined);

export type ShPresidentDrawProps = ShBoardProps &
  ShCardProps &
  GovProps & {
    cards: ShPolicy[];
    /** Index of the card picked to discard (yellow outline, lifted; the button enables). */
    discarded?: number | null;
  };

export const ShPresidentDraw: React.FC<ShPresidentDrawProps> = (props) => {
  const { cards, discarded = null, president = 'Ece', chancellor = 'Mert', votes } = props;
  const { b, c } = splitProps(props);
  return (
    <Board b={b} c={{ ...c, me: c.me ?? president }} phase="presidentLegislate" defaultLook="web" strip={{ president, chancellor, votes: voteMap(votes) }}>
      <Title>{S.play.presidentTitle}</Title>
      <Hand cards={cards} selected={discarded} />
      <BigButton disabled={discarded === null}>{S.play.discardThis}</BigButton>
      <Hint>{S.play.presidentHint}</Hint>
      <Silence />
    </Board>
  );
};

export type ShChancellorEnactProps = ShBoardProps &
  ShCardProps &
  GovProps & {
    cards: ShPolicy[];
    /** Index of the card picked to enact. */
    enacted?: number | null;
  };

export const ShChancellorEnact: React.FC<ShChancellorEnactProps> = (props) => {
  const { cards, enacted = null, president = 'Ece', chancellor = 'Mert', votes } = props;
  const { b, c } = splitProps(props);
  return (
    <Board b={b} c={{ ...c, me: c.me ?? chancellor }} phase="chancellorLegislate" defaultLook="web" strip={{ president, chancellor, votes: voteMap(votes) }}>
      <Title>{S.play.chancellorTitle}</Title>
      <Hand cards={cards} selected={enacted} />
      <BigButton disabled={enacted === null}>{S.play.enactThis}</BigButton>
      <Hint>{S.play.chancellorHint}</Hint>
      {props.fascist >= VETO_AT && (
        <>
          <OutlineButton>{S.play.veto}</OutlineButton>
          <Hint>{S.play.vetoHint}</Hint>
        </>
      )}
      <Silence />
    </Board>
  );
};

/* ---------- Enacted ---------- */

export type ShEnactedProps = ShBoardProps &
  ShCardProps &
  GovProps & {
    /** The policy just enacted; `liberal` / `fascist` are the counts after it. */
    policy: ShPolicy;
    /** Power it grants; default read off the fascist track for a fascist policy. null = none. */
    power?: ShPower | null;
  };

/**
 * The web game has no separate "enacted" card: the new policy fills its track slot and the game moves on.
 * With a power the phase becomes "Yürütme yetkisi" and everyone else sees "Başkan Ece: idam." (glyph + hint);
 * without one, presidency passes on and the last vote's pill heads the nomination panel.
 */
export const ShEnacted: React.FC<ShEnactedProps> = (props) => {
  const { policy, president = 'Ece', chancellor = 'Mert', votes } = props;
  const { b, c } = splitProps(props);
  const players = b.players ?? SH_PLAYERS;
  const power = props.power !== undefined ? props.power : policy === 'fascist' ? (fascistTrack(players.length)[props.fascist - 1] ?? null) : null;
  if (power) {
    return (
      <Board b={b} c={c} phase="power" defaultLook="web" strip={{ president, chancellor, votes: voteMap(votes) }}>
        <Wait power={power}>{S.play.waitPower(president, S.power[power])}</Wait>
        <Hint>{S.powerHint[power]}</Hint>
      </Board>
    );
  }
  const next = nextAlive(president, players);
  return (
    <Board b={b} c={c} phase="nominate" defaultLook="web" strip={{ president: next, chancellor: null, votes: voteMap(votes) }}>
      {votes && <VoteResultPill president={president} nominee={chancellor} votes={votes} passed />}
      <Wait>{S.play.waitNominate(next)}</Wait>
    </Board>
  );
};

/* ---------- Powers ---------- */

export type ShInvestigateProps = ShBoardProps &
  ShCardProps &
  GovProps & {
    /** The tapped player (pressed, yellow). */
    target: string | null;
    /** The answer only the president sees: it lives on the role card ("Sorgulama sonuçların: …"), which opens by default. */
    result: ShParty | null;
  };

/** Web power panel 'investigate' (president's view): title + glyph, 2-column target list, hint. Already-checked and dead players are left out. */
export const ShInvestigate: React.FC<ShInvestigateProps> = (props) => {
  const { target, result, president = 'Ece', chancellor = 'Mert', votes } = props;
  const { b, c } = splitProps(props);
  const players = b.players ?? SH_PLAYERS;
  const done = new Set((c.investigations ?? []).map((x) => x.name));
  const names = players.filter((p) => !p.dead && p.name !== president && !done.has(p.name)).map((p) => p.name);
  const card: ShCardProps = {
    ...c,
    me: c.me ?? president,
    cardOpen: c.cardOpen ?? result !== null,
    investigations: [...(c.investigations ?? []), ...(target && result ? [{ name: target, party: result }] : [])],
  };
  return (
    <Board b={b} c={card} phase="power" defaultLook="web" strip={{ president, chancellor, votes: voteMap(votes) }}>
      <Title icon="investigate">{S.play.investigateTitle}</Title>
      <Targets names={names} picked={target} />
      <Hint>{S.play.investigateHint}</Hint>
    </Board>
  );
};

export type ShExecutionProps = ShBoardProps &
  ShCardProps &
  GovProps & {
    target: string | null;
    /** After the shot: the target's chip reads "İdam" and the presidency moves on (role not revealed). */
    done?: boolean;
  };

export const ShExecution: React.FC<ShExecutionProps> = (props) => {
  const { target, done = false, president = 'Ece', chancellor = 'Mert', votes } = props;
  const { b, c } = splitProps(props);
  const base = b.players ?? SH_PLAYERS;
  if (done && target) {
    const players = base.map((p) => (p.name === target ? { ...p, dead: true } : p));
    const next = nextAlive(president, players);
    return (
      <Board b={{ ...b, players }} c={c} phase="nominate" defaultLook="web" strip={{ president: next, chancellor: null, votes: voteMap(votes) }}>
        <Wait>{S.play.waitNominate(next)}</Wait>
      </Board>
    );
  }
  const names = base.filter((p) => !p.dead && p.name !== president).map((p) => p.name);
  return (
    <Board b={b} c={{ ...c, me: c.me ?? president }} phase="power" defaultLook="web" strip={{ president, chancellor, votes: voteMap(votes) }}>
      <Title icon="execution">{S.play.executionTitle}</Title>
      <Targets names={names} picked={target} />
      <Hint>{S.play.executionHint}</Hint>
    </Board>
  );
};

/* ---------- Game over (web Over) ---------- */

export type ShResultProps = {
  winner: ShParty;
  /** A win-reason key ("hitlerChancellor") or the sentence itself. */
  reason: string;
  roles?: { name: string; role: ShRole }[];
  /** Final track counts shown on the two big cards. */
  liberal?: number;
  fascist?: number;
  players?: ShPlayer[];
  backIn?: number;
  backTotal?: number;
  code?: string;
};

const DEFAULT_ROLES: { name: string; role: ShRole }[] = [
  { name: 'Ece', role: 'liberal' },
  { name: 'Mert', role: 'hitler' },
  { name: 'Deniz', role: 'liberal' },
  { name: 'Kaan', role: 'fascist' },
  { name: 'Bora', role: 'liberal' },
  { name: 'Zeynep', role: 'fascist' },
  { name: 'Sude', role: 'liberal' },
];

/** game-kit Avatar (.gk-avatar). */
const Avatar: React.FC<{ name: string; color: string; size: number }> = ({ name, color, size }) => (
  <span
    style={{
      width: size,
      height: size,
      flex: 'none',
      boxSizing: 'border-box',
      borderRadius: '50%',
      background: color,
      color: T.ink2,
      border: `${size >= 40 ? 3 : 2}px solid ${T.ink}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT_DISPLAY,
      fontWeight: 800,
      fontSize: size * 0.46,
      lineHeight: 1,
    }}
  >
    {name.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?'}
  </span>
);

export const ShResult: React.FC<ShResultProps> = ({
  winner,
  reason,
  roles = DEFAULT_ROLES,
  liberal,
  fascist,
  players = SH_PLAYERS,
  backIn = 8,
  backTotal = 15,
  code = S.code,
}) => {
  const lib = liberal ?? (winner === 'liberal' ? 5 : 2);
  const fas = fascist ?? (winner === 'fascist' ? 4 : 3);
  const dead = new Set(players.filter((p) => p.dead).map((p) => p.name));
  const sides = [
    { key: 'liberal' as const, label: S.play.sideLiberal, track: S.play.liberalTrack, n: lib, seats: roles.filter((r) => r.role === 'liberal') },
    { key: 'fascist' as const, label: S.play.sideFascist, track: S.play.fascistTrack, n: fas, seats: roles.filter((r) => r.role !== 'liberal') },
  ];
  if (winner === 'fascist') sides.reverse();
  const reasonText = reason in S.play.reason ? S.play.reason[reason as ShWinReason] : reason;
  const confetti: React.CSSProperties[] = [
    { top: 50, left: 30, width: 16, height: 7, background: T.yellow, transform: 'rotate(30deg)' },
    { top: 90, right: 40, width: 16, height: 7, background: T.pink, transform: 'rotate(-40deg)' },
    { top: 150, left: 64, width: 11, height: 11, background: T.mint, transform: 'rotate(20deg)' },
    { top: 40, right: 120, width: 11, height: 11, borderRadius: '50%', background: T.sky },
    { top: 190, right: 60, width: 16, height: 7, background: T.coral, transform: 'rotate(70deg)' },
  ];
  // `.sh[data-over] .sh-sky { display: none }`: the game-over screen sits on the platform purple.
  return (
    <div
      style={{
        position: 'relative',
        width: KURT_W,
        height: '100%',
        boxSizing: 'border-box',
        background: T.bg,
        color: T.text,
        fontFamily: FONT_BODY,
        fontWeight: 600,
        lineHeight: 1.45,
        padding: '18px 18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: T.text3 }}>
        <span>{S.name}</span>
        <span style={{ letterSpacing: 2 }}>{code}</span>
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
            {trUpper(S.play.gameOver)}
          </span>
          <span style={{ marginTop: 8, fontFamily: FONT_DISPLAY, fontSize: 48, fontWeight: 800, lineHeight: 0.95 }}>{S.play.winnerTitle[winner]}</span>
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
                    background: SH_SIDE[side.key].side,
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
                  <span style={{ marginTop: won ? 0 : 10, fontFamily: FONT_DISPLAY, fontSize: won ? 64 : 52, fontWeight: 800, lineHeight: 1 }}>{side.n}</span>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{side.track}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
          {sides.map((side) => (
            <div key={side.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: `3px solid ${T.ink}`, borderRadius: 18, background: T.panel }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: SH_SIDE[side.key].side }}>{trUpper(side.label)}</span>
              {side.seats.map((seat) => (
                <div key={seat.name} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 15, fontWeight: 800 }}>
                  <Avatar name={seat.name} color={colorOf(seat.name, players)} size={28} />
                  <span
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      overflow: 'hidden',
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                      opacity: dead.has(seat.name) ? 0.6 : 1,
                    }}
                  >
                    {seat.name}
                    <small style={{ fontSize: 11, fontWeight: 800, color: seat.role === 'hitler' ? T.red : SH_SIDE[partyOf(seat.role)].ink }}>{S.role[seat.role]}</small>
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
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text2 }}>{S.play.backIn(backIn)}</span>
        </div>
      </section>
    </div>
  );
};
