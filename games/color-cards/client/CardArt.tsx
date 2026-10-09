import type { Card, CardColor, CardValue } from '../shared/index.js';
import { cardName } from './strings';

/** Atla: yolu kesilmiş daire. */
function SkipGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="cc-glyph" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M6.8 17.2L17.2 6.8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** Yön değiştir: zıt yönlü iki ok. */
function ReverseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="cc-glyph" aria-hidden="true">
      <path d="M5 9h11.5M13 5.2L16.8 9 13 12.8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15H7.5M11 11.2L7.2 15l3.8 3.8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Symbol({ value }: { value: CardValue }) {
  switch (value) {
    case 'skip':
      return <SkipGlyph />;
    case 'reverse':
      return <ReverseGlyph />;
    case 'draw2':
      return <span className="cc-sym-text">+2</span>;
    case 'wild':
      return null;
    case 'wild4':
      return <span className="cc-sym-text">+4</span>;
    default:
      return <span className="cc-num" data-under={value === '6' || value === '9' || undefined}>{value}</span>;
  }
}

function cornerText(value: CardValue): string {
  if (value === 'draw2') return '+2';
  if (value === 'wild4') return '+4';
  if (value === 'wild') return '';
  return value;
}

/** Kart yüzü: düz renk zemin, ortada eğik bir karo içinde sayı ya da simge. */
export function CardFace({ card, size }: { card: Pick<Card, 'color' | 'value'>; size?: 'sm' | 'lg' }) {
  const wild = card.color === null;
  const corner = cornerText(card.value);
  const cornerGlyph = card.value === 'skip' ? <SkipGlyph /> : card.value === 'reverse' ? <ReverseGlyph /> : corner;
  return (
    <span className="cc-card" data-color={card.color ?? 'wild'} data-size={size} data-value={card.value} role="img" aria-label={cardName(card)}>
      {!wild || card.value === 'wild4' ? (
        <>
          <span className="cc-corner cc-corner-tl" aria-hidden="true">
            {cornerGlyph}
          </span>
          <span className="cc-corner cc-corner-br" aria-hidden="true">
            {cornerGlyph}
          </span>
        </>
      ) : null}
      <span className="cc-tile" aria-hidden="true">
        {wild && <span className="cc-quad" />}
        <span className="cc-sym">
          <Symbol value={card.value} />
        </span>
      </span>
    </span>
  );
}

/** Kart arkası: dört renkli eğik şeritler ve kelime işareti. */
export function CardBack({ size }: { size?: 'sm' | 'lg' }) {
  return (
    <span className="cc-card cc-back" data-size={size} aria-hidden="true">
      <span className="cc-back-band" />
      <span className="cc-back-mark">
        renk
        <br />
        renk
      </span>
    </span>
  );
}

/** Etkin renk noktası (seçici ve rozetler için). */
export function Swatch({ color }: { color: CardColor | null }) {
  return <span className="cc-swatch" data-color={color ?? 'wild'} aria-hidden="true" />;
}
