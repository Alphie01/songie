import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { BANDS, DIAL_MAX, DIAL_MIN, type Card } from '../shared/index.js';

/* Yarım daire kadran (tasarım: 340×182 görünüm, merkez 170/170, yarıçap 160). 0 = sol uç, 100 = sağ uç. */
const W = 340;
const H = 182;
const CX = 170;
const CY = 170;
const R = 160;
/* Tasarımda ibre ve göbek HTML öğesi (354×190 kutuda); aynı ölçüler görünüm birimine çevrildi. */
const K = 182 / 190;
const NEEDLE_W = 8 * K;
const NEEDLE_H = 150 * K;
const NEEDLE_B = 2 * K;
const HUB_D = 32 * K;
const HUB_B = 4 * K;
const HUB_CY = (190 + 3 - 16) * K;

function point(v: number, r: number): [number, number] {
  const a = Math.PI * (1 - v / 100);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

/** Merkezden r yarıçaplı, v1–v2 arası dilim. */
function wedge(v1: number, v2: number, r: number): string {
  const [x1, y1] = point(v1, r);
  const [x2, y2] = point(v2, r);
  return `M${CX} ${CY} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

const HALF = `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY} Z`;
const ARC = `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const clamp = (v: number) => Math.min(DIAL_MAX, Math.max(DIAL_MIN, v));

/** Hedef bölgesi: 2-3-4-3-2 bantları, kadran uçlarında kırpılır. */
function TargetZone({ target }: { target: number }) {
  return (
    <g className="fq-zone">
      {[...BANDS].reverse().map((b) => (
        <path key={b.points} d={wedge(clamp(target - b.maxDistance), clamp(target + b.maxDistance), R)} data-points={b.points} />
      ))}
    </g>
  );
}

export interface DialProps {
  value: number;
  card: Card | null;
  /** Bilinen hedef (medyum ya da açıklama). */
  target: number | null;
  /** Perde: kapalı (hedef gizli), açılıyor (açıklama) ya da yok (medyum). */
  curtain: 'closed' | 'opening' | 'none';
  curtainKey: number;
  editable: boolean;
  onChange?(v: number, final: boolean): void;
}

/** Kadran yüzü ve uç etiketleri. Klavye ve ekran okuyucu için ayrıca `DialRange` kullanılır. */
export function Dial({ value, card, target, curtain, curtainKey, editable, onChange }: DialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

  const valueAt = useCallback(
    (clientX: number, clientY: number): number => {
      const svg = svgRef.current;
      if (!svg) return value;
      const box = svg.getBoundingClientRect();
      const x = ((clientX - box.left) / box.width) * W - CX;
      const y = CY - ((clientY - box.top) / box.height) * H;
      let a = Math.atan2(Math.max(y, 0), x);
      if (y < 0) a = x < 0 ? Math.PI : 0;
      return Math.round(clamp(100 * (1 - a / Math.PI)) * 10) / 10;
    },
    [value],
  );

  function down(e: PointerEvent<SVGSVGElement>) {
    if (!editable) return;
    e.preventDefault();
    dragging.current = true;
    setActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange?.(valueAt(e.clientX, e.clientY), false);
  }

  function move(e: PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    onChange?.(valueAt(e.clientX, e.clientY), false);
  }

  function up(e: PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    setActive(false);
    onChange?.(valueAt(e.clientX, e.clientY), true);
  }

  // Sürükleme sırasında sayfa kaymasın (iOS).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !editable) return;
    const stop = (ev: TouchEvent) => {
      if (dragging.current) ev.preventDefault();
    };
    svg.addEventListener('touchmove', stop, { passive: false });
    return () => svg.removeEventListener('touchmove', stop);
  }, [editable]);

  const angle = -90 + (value / 100) * 180;

  return (
    <div className="fq-dial" data-editable={editable || undefined} data-active={active || undefined}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="fq-dial-svg"
        aria-hidden="true"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <defs>
          <clipPath id="fq-face">
            <path d={HALF} />
          </clipPath>
          <pattern id="fq-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" className="fq-hatch-bg" />
            <rect width="4" height="10" className="fq-hatch-line" />
          </pattern>
        </defs>

        <path d={HALF} className="fq-face" />
        <g clipPath="url(#fq-face)">
          {target !== null && <TargetZone target={target} />}
          {curtain !== 'none' && (
            <g key={curtainKey} className="fq-curtain" data-state={curtain}>
              <path d={HALF} fill="url(#fq-hatch)" />
            </g>
          )}
        </g>
        <path d={ARC} className="fq-rim" />

        <g className="fq-needle" style={{ transform: `rotate(${angle}deg)` }}>
          <rect
            x={CX - NEEDLE_W / 2 + NEEDLE_B / 2}
            y={CY - NEEDLE_H + NEEDLE_B / 2}
            width={NEEDLE_W - NEEDLE_B}
            height={NEEDLE_H - NEEDLE_B}
            rx={6 * K - NEEDLE_B / 2}
            className="fq-needle-body"
            style={{ strokeWidth: NEEDLE_B }}
          />
        </g>
        <circle cx={CX} cy={HUB_CY} r={(HUB_D - HUB_B) / 2} className="fq-hub" style={{ strokeWidth: HUB_B }} />
      </svg>

      <div className="fq-ends" aria-hidden={!card || undefined}>
        {card && (
          <>
            <span className="fq-end fq-end-left">← {card.left}</span>
            <span className="fq-end fq-end-right">{card.right} →</span>
          </>
        )}
      </div>
    </div>
  );
}
