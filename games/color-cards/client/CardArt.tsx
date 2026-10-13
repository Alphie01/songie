import type { Card, CardColor, CardValue } from '../shared/index.js';
import { cardName } from './strings';

/** Kart üstündeki kısa işaret (tasarım: Atla ⊘, Yön ⇄, Renk ★). */
function label(value: CardValue): string {
  switch (value) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'wild':
      return '★';
    case 'wild4':
      return '+4';
    default:
      return value === 'draw2' ? '+2' : value;
  }
}

/** Kart yüzü: düz renk zemin (jokerde dört renkli pasta), ortada eğik beyaz oval içinde sayı ya da işaret. */
export function CardFace({ card, size }: { card: Pick<Card, 'color' | 'value'>; size?: 'sm' | 'lg' }) {
  const text = label(card.value);
  return (
    <span className="cc-card" data-color={card.color ?? 'wild'} data-size={size} role="img" aria-label={cardName(card)}>
      <span className="cc-oval" data-long={text.length > 1 || undefined} aria-hidden="true">
        {text}
      </span>
    </span>
  );
}

/** Kart arkası: dört renkli yatay şeritler. */
export function CardBack() {
  return (
    <span className="cc-back" aria-hidden="true">
      <span data-color="green" />
      <span data-color="yellow" />
      <span data-color="red" />
      <span data-color="purple" />
    </span>
  );
}

/** Etkin renk noktası. */
export function Swatch({ color }: { color: CardColor | null }) {
  return <span className="cc-swatch" data-color={color ?? 'wild'} aria-hidden="true" />;
}
