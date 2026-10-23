import React from 'react';
import { SFX_VOLUME } from '../../brand/mix';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { ColorStage } from '../../brand/ColorStage';
import { ColorWipe } from '../../brand/ColorWipe';
import { CtaCard } from '../../brand/CtaCard';
import { FONT_BODY, SAFE, VIDEO } from '../../brand/fonts';
import { Headline } from '../../brand/Headline';
import { usePop } from '../../brand/motion';
import { Music } from '../../brand/Music';
import { scenePalette, stickerOn } from '../../brand/palette';
import { PhoneFrame } from '../../brand/PhoneFrame';
import { Sticker } from '../../brand/Sticker';
import { RedFlagRevealScreen } from '../../brand/itiraf/RedFlagRevealScreen';
import { RedFlagVoteScreen } from '../../brand/itiraf/RedFlagVoteScreen';
import type { RedFlagVote } from '../../brand/itiraf/redFlagText';
import { itirafTheme } from '../../themes/itiraf';
import type { AppTheme } from '../../themes/types';
import { crew, solverSchema, type Crew } from '../friends';

export const i7Schema = z.object({
  /** A situation from games/red-flag/server/content. */
  situation: z.string().min(10).max(200),
  /** Its category label as the app shows it ("Aile", "İlk buluşma", …). */
  category: z.string(),
  music: z.string(),
  musicFrom: z.number().min(0).max(25),
  palette: z.number().int().min(0),
  solver: solverSchema,
});

export type I7Props = z.infer<typeof i7Schema>;

/** Same readable beats as Aramızdaki En: hook → vote (you raise a flag) → reveal → closing (~17,5 sn). */
export const RF = {
  card: 8,
  ask: 56,
  wipe1: 110,
  vote: 118,
  voters: [12, 30, 48],
  tap: 80,
  late: [104, 122],
  revealPress: 142,
  wipe2: 318,
  reveal: 326,
  verdict: 34,
  you: 72,
  wipe3: 446,
  cta: 454,
} as const;

export const I7_META = {
  id: 'itiraf-07-red-flag',
  durationInFrames: 524,
  fps: VIDEO.fps,
  width: VIDEO.width,
  height: VIDEO.height,
  defaultProps: {
    situation: 'İlk buluşmada yarım saat boyunca eski sevgilisinden bahsetti.',
    category: 'İlk buluşma',
    music: 'assets/songs/2124248167.mp3',
    musicFrom: 0,
    palette: 6,
    solver: 'Mert',
  } as I7Props,
} as const;

export const CTA_TEXT = 'Red flag mı, green flag mı? Tartışma garanti!';

/** Who has voted at a vote-scene frame (6 players; you after your tap). */
export function rfVotedAt(frame: number) {
  const n = 1 + RF.voters.filter((f) => frame >= f).length + (frame >= RF.tap + 4 ? 1 : 0) + RF.late.filter((f) => frame >= f).length;
  return Math.min(6, n);
}

/** The normal twist: the room says green, only you said red. */
export function lonelyRed(c: Crew): { name: string; vote: RedFlagVote }[] {
  return [
    { name: 'Sen', vote: 'red' },
    { name: c.solver, vote: 'green' },
    { name: c.others[0], vote: 'green' },
    { name: c.others[1], vote: 'green' },
    { name: 'Bora', vote: 'green' },
    { name: c.others[2], vote: 'never' },
  ];
}

const Sfx: React.FC<{ name: string; at: number; frames?: number }> = ({ name, at, frames = 15 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME} />
  </Sequence>
);

const PHONE_W = 680;
const PHONE_H = 1240;
const CX = VIDEO.width / 2;
const STICKER_Y = 1340;

/** The white situation card with its pink category chip, at poster size. */
export const BigSituation: React.FC<{ theme: AppTheme; text: string; category: string; enterAt: number; bg?: string }> = ({
  theme,
  text,
  category,
  enterAt,
  bg,
}) => {
  const c = theme.colors;
  const pop = usePop(enterAt, 12);
  return (
    <div
      style={{
        width: VIDEO.width - 2 * SAFE.side,
        boxSizing: 'border-box',
        padding: '40px 50px 54px',
        border: `6px solid ${c.ink}`,
        borderRadius: 40,
        background: bg ?? c.paper,
        boxShadow: `14px 14px 0 ${c.ink}`,
        transform: `translateY(${interpolate(pop, [0, 1], [300, 0])}px) rotate(${interpolate(pop, [0, 1], [6, -2])}deg)`,
        opacity: Math.min(1, pop * 2),
      }}
    >
      <span
        style={{
          display: 'inline-block',
          marginBottom: 22,
          padding: '6px 22px',
          border: `4px solid ${c.ink}`,
          borderRadius: 999,
          background: c.pink,
          fontFamily: FONT_BODY,
          fontWeight: 800,
          fontSize: 34,
          color: c.ink,
        }}
      >
        {category}
      </span>
      <Headline theme={theme} text={text} enterAt={enterAt + 6} size={80} minSize={50} maxLines={5} maxWidth={850} style={{ textAlign: 'left' }} />
    </div>
  );
};

const press = (frame: number, at: number) =>
  interpolate(frame, [at, at + 3, at + 8], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Hook: React.FC<{ theme: AppTheme; bg: string; p: I7Props }> = ({ theme, bg, p }) => (
  <ColorStage theme={theme} color={bg}>
    <Headline theme={theme} text="Red flag mı," size={110} maxLines={1} style={{ position: 'absolute', left: SAFE.side, top: SAFE.top }} />
    <Headline
      theme={theme}
      text="green flag mı? 🚩"
      enterAt={6}
      size={110}
      maxLines={1}
      style={{ position: 'absolute', left: SAFE.side, top: SAFE.top + 120 }}
    />
    <div style={{ position: 'absolute', left: SAFE.side, top: 600 }}>
      <BigSituation theme={theme} text={p.situation} category={p.category} enterAt={RF.card} />
    </div>
    <Sticker
      theme={theme}
      text="Sen ne dersin? 👇"
      bg={stickerOn(theme, bg, ['yellow', 'mint', 'pink'])}
      rotate={4}
      enterAt={RF.ask}
      size={92}
      style={{ position: 'absolute', right: SAFE.side, top: STICKER_Y + 30 }}
    />
  </ColorStage>
);

/** The vote scene, shared by the normal and flirt reels; `mine` is your flag. */
export const RFVotePhone: React.FC<{ theme: AppTheme; situation: string; category: string; mine: RedFlagVote }> = ({
  theme,
  situation,
  category,
  mine,
}) => {
  const frame = useCurrentFrame();
  const enter = usePop(0, 14);
  return (
    <div
      style={{
        position: 'absolute',
        left: CX - PHONE_W / 2,
        top: SAFE.top + 20,
        transform: `translateY(${interpolate(enter, [0, 1], [900, 0])}px) rotate(${interpolate(enter, [0, 1], [6, -1.5])}deg)`,
      }}
    >
      <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
        <RedFlagVoteScreen
          theme={theme}
          situation={situation}
          category={category}
          predict={false}
          myVote={frame >= RF.tap + 4 ? mine : undefined}
          votePress={press(frame, RF.tap)}
          pressing={frame >= RF.tap && frame < RF.tap + 8 ? mine : undefined}
          voted={rfVotedAt(frame)}
          total={6}
          seconds={Math.max(1, 22 - Math.floor(frame / 30))}
          revealPress={press(frame, RF.revealPress)}
        />
      </PhoneFrame>
    </div>
  );
};

const Vote: React.FC<{ theme: AppTheme; bg: string; p: I7Props }> = ({ theme, bg, p }) => {
  const frame = useCurrentFrame();
  return (
    <ColorStage theme={theme} color={bg}>
      <RFVotePhone theme={theme} situation={p.situation} category={p.category} mine="red" />
      {frame < RF.tap ? (
        <Sticker
          theme={theme}
          text="Bayrağını gizlice kaldır 🤫"
          bg={stickerOn(theme, bg, ['paper', 'yellow'])}
          rotate={-4}
          enterAt={8}
          size={76}
          style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
        />
      ) : (
        <Sequence from={RF.tap} layout="none">
          <Sticker
            theme={theme}
            text="Kesin red flag 🚩"
            bg={stickerOn(theme, bg, ['coral', 'pink', 'yellow'])}
            rotate={-4}
            size={90}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </ColorStage>
  );
};

/** The reveal phone, shared by the normal and flirt reels. */
export const RFRevealPhone: React.FC<{
  theme: AppTheme;
  situation: string;
  category: string;
  ballots: { name: string; vote: RedFlagVote }[];
  mine: RedFlagVote;
}> = ({ theme, situation, category, ballots, mine }) => {
  const enter = usePop(0, 14);
  return (
    <div
      style={{
        position: 'absolute',
        left: CX - PHONE_W / 2,
        top: SAFE.top + 20,
        transform: `translateY(${interpolate(enter, [0, 1], [700, 0])}px) rotate(${interpolate(enter, [0, 1], [-6, 1.5])}deg)`,
      }}
    >
      <PhoneFrame theme={theme} width={PHONE_W} height={PHONE_H}>
        <RedFlagRevealScreen
          theme={theme}
          situation={situation}
          category={category}
          ballots={ballots}
          me="Sen"
          myVote={mine}
          predict={false}
          enterAt={6}
        />
      </PhoneFrame>
    </div>
  );
};

const Reveal: React.FC<{ theme: AppTheme; bg: string; p: I7Props; c8: Crew }> = ({ theme, bg, p, c8 }) => {
  const frame = useCurrentFrame();
  return (
    <ColorStage theme={theme} color={bg}>
      <RFRevealPhone theme={theme} situation={p.situation} category={p.category} ballots={lonelyRed(c8)} mine="red" />
      {frame < RF.you ? (
        <Sticker
          theme={theme}
          text="Çoğunluk: green flag 💚"
          bg={stickerOn(theme, bg, ['mint', 'yellow', 'sky'])}
          rotate={-4}
          enterAt={RF.verdict}
          size={84}
          style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
        />
      ) : (
        <Sequence from={RF.you} layout="none">
          <Sticker
            theme={theme}
            text="Sadece sen red flag dedin 😂"
            bg={stickerOn(theme, bg, ['yellow', 'pink', 'mint'])}
            rotate={-3}
            size={70}
            style={{ position: 'absolute', left: SAFE.side, top: STICKER_Y }}
          />
        </Sequence>
      )}
    </ColorStage>
  );
};

export const I7RedFlag: React.FC<I7Props> = (p) => {
  const theme = itirafTheme;
  const [A, B, C, D] = scenePalette(theme, p.palette);
  const c8 = crew(p.solver);
  return (
    <AbsoluteFill style={{ backgroundColor: A }}>
      <Sequence durationInFrames={RF.wipe1} name="Hook">
        <Hook theme={theme} bg={A} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={A} to={B} at={RF.wipe1} durationInFrames={RF.vote - RF.wipe1} />
      <Sequence from={RF.vote} durationInFrames={RF.wipe2 - RF.vote} name="Vote">
        <Vote theme={theme} bg={B} p={p} />
      </Sequence>
      <ColorWipe theme={theme} from={B} to={C} at={RF.wipe2} durationInFrames={RF.reveal - RF.wipe2} />
      <Sequence from={RF.reveal} durationInFrames={RF.wipe3 - RF.reveal} name="Reveal">
        <Reveal theme={theme} bg={C} p={p} c8={c8} />
      </Sequence>
      <ColorWipe theme={theme} from={C} to={D} at={RF.wipe3} durationInFrames={RF.cta - RF.wipe3} />
      <Sequence from={RF.cta} name="CTA">
        <ColorStage theme={theme} color={D}>
          <CtaCard theme={theme} cta={CTA_TEXT} />
        </ColorStage>
      </Sequence>

      <Music src={p.music} from={p.musicFrom} />
      <Sfx name="pop" at={RF.card} />
      <Sfx name="pop" at={RF.ask} />
      {[...RF.voters, ...RF.late].map((f) => (
        <Sfx key={f} name="tick" at={RF.vote + f} frames={4} />
      ))}
      <Sfx name="pop" at={RF.vote + RF.tap} />
      <Sfx name="ding" at={RF.vote + RF.revealPress} frames={30} />
      <Sfx name="pop" at={RF.reveal + RF.verdict} />
      <Sfx name="pop" at={RF.reveal + RF.you} />
      <Sfx name="pop" at={RF.cta + 18} />
    </AbsoluteFill>
  );
};
