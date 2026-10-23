import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import type { AppTheme } from './themes/types';
import { APP } from './brand/app/appTokens';
import { ClipCard } from './brand/ClipCard';
import { ColorStage } from './brand/ColorStage';
import { ColorWipe } from './brand/ColorWipe';
import { CtaCard } from './brand/CtaCard';
import { Headline } from './brand/Headline';
import { PhoneFrame } from './brand/PhoneFrame';
import { Sticker } from './brand/Sticker';
import { SongPlayScreen, type FeedLine, type ScoreRow } from './brand/app/SongPlayScreen';

export const demoFeed = (t: AppTheme): FeedLine[] => [
  { name: 'Mert', text: '0.5s’de bildi', points: 880, color: t.colors.mint },
  { name: 'Deniz', text: 'sanatçıyı bildi', points: 210, color: t.colors.sky },
  { name: 'Kaan', text: 'pas geçti', color: APP.red },
];

export const demoScores = (t: AppTheme): ScoreRow[] => [
  { name: 'Mert', score: 3420, color: t.colors.mint },
  { name: 'Sen ×2', score: 2950, color: t.colors.yellow, me: true },
  { name: 'Deniz', score: 1780, color: t.colors.panel },
  { name: 'Kaan', score: 640, color: t.colors.panel },
];

/** App Store 02.png recreated: yellow stage, headline, phone with the play screen, "Kulağını aç" sticker. */
export const StoreShot: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const c = theme.colors;
  return (
    <ColorStage theme={theme} color={c.yellow}>
      <Headline theme={theme} text="Bilemedin mi? Pas de, parça uzasın." size={90} maxWidth={760} style={{ position: 'absolute', left: 160, top: 140 }} />
      <div
        style={{
          position: 'absolute',
          top: 375,
          width: '100%',
          textAlign: 'center',
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 800,
          fontSize: 40,
          color: c.ink,
        }}
      >
        0,1 → 0,5 → 2 → 8 → 15 saniye
      </div>
      <PhoneFrame theme={theme} style={{ position: 'absolute', left: 120, top: 540 }}>
        <SongPlayScreen theme={theme} stage={0} playing={false} timer={14} feed={demoFeed(theme)} scores={demoScores(theme)} />
      </PhoneFrame>
      <Sticker theme={theme} text="Kulağını aç" bg={c.pink} rotate={8} enterAt={4} size={52} style={{ position: 'absolute', left: 680, top: 495 }} />
    </ColorStage>
  );
};

/**
 * Preview of every brand piece (3 s). 0–37: the 02.png store shot; 37–45: color wipe yellow → mint;
 * 45–90: long-answer headline, missing-clip card, stickers and the CTA card (all settled by frame 60).
 */
export const BrandSheet: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const c = theme.colors;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={45}>
        <StoreShot theme={theme} />
      </Sequence>
      <Sequence from={45}>
        <ColorStage theme={theme} color={c.mint}>
          <Headline theme={theme} text="Sezen Aksu – Kaybolan Yıllar" size={120} stagger={2} style={{ position: 'absolute', left: 60, top: 250 }} />
          <div style={{ position: 'absolute', left: 70, top: 560 }}>
            <ClipCard theme={theme} src="assets/yok.mp4" width={400} height={620} />
          </div>
          <Sticker theme={theme} text="+880" bg={c.yellow} rotate={8} enterAt={2} size={64} style={{ position: 'absolute', left: 560, top: 600 }} />
          <Sticker theme={theme} text="Kulağını aç" bg={c.pink} rotate={-6} enterAt={4} size={52} style={{ position: 'absolute', left: 520, top: 760 }} />
          <div style={{ position: 'absolute', left: 500, top: 860, width: 540, height: 960 }}>
            <div style={{ width: 1080, height: 1920, transform: 'scale(0.5)', transformOrigin: '0 0' }}>
              <CtaCard theme={theme} enterAt={-30} />
            </div>
          </div>
        </ColorStage>
      </Sequence>
      <ColorWipe theme={theme} from={c.yellow} to={c.mint} at={37} />
    </AbsoluteFill>
  );
};
