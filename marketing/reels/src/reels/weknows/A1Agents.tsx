import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { z } from 'zod';
import { VIDEO } from '../../brand/fonts';
import { SFX_VOLUME } from '../../brand/mix';
import { Music } from '../../brand/Music';
import { BT, BrightShot, BrightThink, STAGES, WkBrightCta, brightBeats, type BrightShotSpec } from '../../brand/weknows/Bright';
import { AG_OPEN, AgBoard, AgGiveClue, AgResult } from '../../brand/weknows/agents/AgScreens';

/**
 * Ajanlar (We Knows) in the bright Songie look, music only: the artboard's own board (25 words, key, Deniz's clue
 * "SU 2"). Board indexes used: 0 BALIK (yeşil), 3 BUZ (yeşil), 6 BAHÇE (yeşil), 8 BARDAK (tarafsız), 11 BIÇAK (suikastçı).
 */
const FPS = VIDEO.fps;
export const agSchema = z.object({ music: z.string(), musicFrom: z.number().min(0).max(25) });
type Props = z.infer<typeof agSchema>;

const Sfx: React.FC<{ name: string; at: number; frames?: number; volume?: number }> = ({ name, at, frames = 15, volume = 1 }) => (
  <Sequence from={at} durationInFrames={frames} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={SFX_VOLUME * volume} />
  </Sequence>
);

const Reel: React.FC<{ p: Props; shots: BrightShotSpec[]; cta: string; extra?: (b: ReturnType<typeof brightBeats>) => React.ReactNode }> = ({ p, shots, cta, extra }) => {
  const b = brightBeats(shots);
  return (
    <AbsoluteFill style={{ backgroundColor: BT.colors.bg }}>
      {shots.map((s, i) => (
        <Sequence key={i} from={b.at[i]} durationInFrames={(b.at[i + 1] ?? b.cta) - b.at[i]!} name={`shot ${i + 1}`}>
          {s.render((b.at[i + 1] ?? b.cta) - b.at[i]!, STAGES[i % STAGES.length]!)}
        </Sequence>
      ))}
      <Sequence from={b.cta} name="CTA">
        <WkBrightCta cta={cta} />
      </Sequence>
      <Music src={p.music} from={p.musicFrom} />
      {extra?.(b)}
    </AbsoluteFill>
  );
};

/** Opens `idx` after `at` frames (local), with the tapped look just before. */
const Tap: React.FC<{ open: number[]; idx: number; at: number; leader?: boolean; clue?: { by: string; word: string; count: number } }> = ({ open, idx, at, leader, clue }) => {
  const frame = useCurrentFrame();
  const done = frame >= at;
  return <AgBoard open={done ? [...open, idx] : open} pressing={!leader && frame >= at - 8 && !done ? idx : null} leader={leader} clue={clue} tries={done ? 2 : 3} />;
};

const SU = { by: 'Deniz', word: 'SU', count: 2 };
const shot = (line: string, hold: number, screen: (len: number) => React.ReactNode, who?: string): BrightShotSpec => ({
  line,
  hold,
  render: (len, color) => (
    <BrightShot color={color} line={line} who={who} len={len}>
      {screen(len)}
    </BrightShot>
  ),
});

// ------------------------------------------------ A1 "SU 2": which two?

const A1_SHOTS: BrightShotSpec[] = [
  shot('Liderin ipucu: SU 2. Hangi iki kart?', 12, () => <AgBoard open={AG_OPEN} clue={SU} />),
  {
    line: 'Sen olsan hangi ikisine basardın?',
    hold: 56,
    render: (len, color) => (
      <AbsoluteFill>
        <BrightShot color={color} line="Sen olsan hangi ikisine basardın?" len={len}>
          <AgBoard open={AG_OPEN} clue={SU} />
        </BrightShot>
        <BrightThink len={len} text="Durdur, iki kartı yorumlara yaz." />
      </AbsoluteFill>
    ),
  },
  shot('BALIK. Yeşil ajan!', 14, () => <Tap open={AG_OPEN} idx={0} at={8} clue={SU} />),
  shot('BUZ. Bir yeşil daha!', 14, () => <Tap open={[...AG_OPEN, 0]} idx={3} at={8} clue={SU} />),
  shot('BARDAK’a basan yanardı: tarafsız. Lider ne görüyordu?', 20, () => <AgBoard open={[...AG_OPEN, 0, 3]} leader clue={SU} tries={1} />),
];

export const AG1_META = { id: 'weknows-ajanlar-01-su-2', fps: FPS, width: VIDEO.width, height: VIDEO.height, defaultProps: { music: 'assets/songs/2762625061.mp3', musicFrom: 0 } as Props } as const;
export const AG1Clue: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={A1_SHOTS}
    cta="Tek kelime, iki kart. Takımını topla."
    extra={(b) => (
      <>
        <Sfx name="pop" at={b.at[0]! + 4} frames={6} />
        <Sfx name="tick" at={b.at[1]! + 10} frames={3} />
        <Sfx name="ding" at={b.at[2]! + 8} frames={18} />
        <Sfx name="ding" at={b.at[3]! + 8} frames={18} />
        <Sfx name="buzz" at={b.at[4]! + 6} frames={10} />
      </>
    )}
  />
);

// ------------------------------------------------ A2 "Tek yanlış kart"

const SEBZE = { by: 'Deniz', word: 'SEBZE', count: 1 };
const A2_SHOTS: BrightShotSpec[] = [
  shot('Tek yanlış kart. Oyun biter.', 10, () => <AgBoard open={AG_OPEN} clue={SEBZE} />),
  shot('BAHÇE. Doğru!', 12, () => <Tap open={AG_OPEN} idx={6} at={8} clue={SEBZE} />),
  shot('Bir hak daha var… Mert: “BIÇAK da olur bence!”', 20, () => {
    const Press: React.FC = () => {
      const frame = useCurrentFrame();
      return <AgBoard open={[...AG_OPEN, 6]} pressing={frame > 40 ? 11 : null} clue={SEBZE} tries={1} />;
    };
    return <Press />;
  }),
  shot('BIÇAK: suikastçı. Yeşil kaybetti.', 22, () => <AgResult winner="p" reason="assassin" open={[...AG_OPEN, 6, 11]} />),
];

export const AG2_META = { id: 'weknows-ajanlar-02-tek-yanlis', fps: FPS, width: VIDEO.width, height: VIDEO.height, defaultProps: { music: 'assets/songs/3919656381.mp3', musicFrom: 0 } as Props } as const;
export const AG2Assassin: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={A2_SHOTS}
    cta="Açgözlü olma. Ajanları bul."
    extra={(b) => (
      <>
        <Sfx name="pop" at={b.at[0]! + 4} frames={6} />
        <Sfx name="ding" at={b.at[1]! + 8} frames={18} />
        <Sfx name="tick" at={b.at[2]! + 40} frames={3} />
        <Sfx name="buzz" at={b.at[3]!} frames={10} volume={1.4} />
      </>
    )}
  />
);

// ------------------------------------------------ A3 "Lider sensin"

const MINE_SU = { by: 'sen', word: 'SU', count: 2 };
const ALL_GREEN = [0, 3, 6, 7, 10, 13, 14, 15, 18];
const A3_SHOTS: BrightShotSpec[] = [
  shot('Lider sensin. Renkleri sadece sen görüyorsun.', 12, () => <AgBoard open={AG_OPEN} leader clue={null} leaderName="Sen" />),
  shot('İpucun: SU 2.', 12, () => <AgGiveClue open={AG_OPEN} word="su" count={2} />),
  shot('Takımın BARDAK’a uzanıyor. Yüzün bir şey belli etmesin.', 24, () => <AgBoard open={AG_OPEN} leader clue={MINE_SU} />),
  shot('BALIK’a bastılar. Oh be.', 12, () => <Tap open={AG_OPEN} idx={0} at={6} leader clue={MINE_SU} />),
  shot('Ve kazandınız. Hiçbir şey belli etmedin.', 18, () => <AgResult winner="g" reason="agents" open={[...AG_OPEN, ...ALL_GREEN]} />),
];

export const AG3_META = { id: 'weknows-ajanlar-03-lider-sensin', fps: FPS, width: VIDEO.width, height: VIDEO.height, defaultProps: { music: 'assets/songs/4021442071.mp3', musicFrom: 0 } as Props } as const;
export const AG3Leader: React.FC<Props> = (p) => (
  <Reel
    p={p}
    shots={A3_SHOTS}
    cta="Poker yüzün var mı?"
    extra={(b) => (
      <>
        <Sfx name="pop" at={b.at[0]! + 4} frames={6} />
        <Sfx name="tick" at={b.at[1]! + 10} frames={3} />
        <Sfx name="heart" at={b.at[2]! + 6} frames={18} volume={1.4} />
        <Sfx name="ding" at={b.at[3]! + 6} frames={18} />
        <Sfx name="whoosh" at={b.at[4]!} />
      </>
    )}
  />
);

export const AG_SHOTS = { a1: A1_SHOTS, a2: A2_SHOTS, a3: A3_SHOTS } as const;
