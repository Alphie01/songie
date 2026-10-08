import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BANDS, DIAL_MAX, DIAL_MIN, type Card } from '../shared/index.js';
import { s } from './strings';

/* Yarım daire kadran. 0 = sol uç, 100 = sağ uç. */
const W = 240;
const CX = 120;
const CY = 124;
const R = 110;
const H = 136;

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
const clamp = (v: number) => Math.min(DIAL_MAX, Math.max(DIAL_MIN, v));

/** Hedef bölgesi: 2-3-4-3-2 bantları, kadran uçlarında kırpılır. */
function TargetZone({ target }: { target: number }) {
  const outer = [...BANDS].reverse();
  return (
    <g className="fq-zone">
      {outer.map((b) => (
        <path key={b.points} d={wedge(clamp(target - b.maxDistance), clamp(target + b.maxDistance), R - 2)} data-points={b.points} />
      ))}
      {[...BANDS]
        .flatMap((b, i) => {
          const inner = i === 0 ? 0 : BANDS[i - 1]!.maxDistance;
          const mid = (inner + b.maxDistance) / 2;
          return i === 0 ? [{ v: target, p: b.points }] : [{ v: target - mid, p: b.points }, { v: target + mid, p: b.points }];
        })
        .filter((l) => l.v >= DIAL_MIN + 1 && l.v <= DIAL_MAX - 1)
        .map((l, i) => {
          const [x, y] = point(l.v, R - 14);
          return (
            <text key={i} x={x} y={y} className="fq-zone-num" textAnchor="middle" dominantBaseline="central">
              {l.p}
            </text>
          );
        })}
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

export function Dial({ value, card, target, curtain, curtainKey, editable, onChange }: DialProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

  const valueAt = useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return value;
    const box = svg.getBoundingClientRect();
    const x = ((clientX - box.left) / box.width) * W - CX;
    const y = CY - ((clientY - box.top) / box.height) * H;
    let a = Math.atan2(Math.max(y, 0), x);
    if (y < 0) a = x < 0 ? Math.PI : 0;
    return Math.round(clamp(100 * (1 - a / Math.PI)) * 10) / 10;
  }, [value]);

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

  function key(e: KeyboardEvent<SVGSVGElement>) {
    if (!editable) return;
    const step = e.shiftKey ? 5 : 1;
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = value - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = value + step;
    else if (e.key === 'PageDown') next = value - 10;
    else if (e.key === 'PageUp') next = value + 10;
    else if (e.key === 'Home') next = DIAL_MIN;
    else if (e.key === 'End') next = DIAL_MAX;
    if (next === null) return;
    e.preventDefault();
    onChange?.(Math.round(clamp(next)), true);
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
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
  const left = card?.left ?? '';
  const right = card?.right ?? '';

  return (
    <div className="fq-dial" data-editable={editable || undefined} data-active={active || undefined}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="fq-dial-svg"
        role={editable ? 'slider' : 'img'}
        tabIndex={editable ? 0 : undefined}
        aria-label={s.play.dialLabel}
        aria-valuemin={editable ? DIAL_MIN : undefined}
        aria-valuemax={editable ? DIAL_MAX : undefined}
        aria-valuenow={editable ? Math.round(value) : undefined}
        aria-valuetext={card ? s.play.dialValue(left, right, value) : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <defs>
          <clipPath id="fq-face">
            <path d={HALF} />
          </clipPath>
          <pattern id="fq-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="6" height="6" className="fq-hatch-bg" />
            <line x1="0" y1="0" x2="0" y2="6" className="fq-hatch-line" />
          </pattern>
        </defs>

        <path d={HALF} className="fq-face" />
        <g clipPath="url(#fq-face)">
          {target !== null && <TargetZone target={target} />}
          {curtain !== 'none' && (
            <g key={curtainKey} className="fq-curtain" data-state={curtain}>
              <path d={HALF} fill="url(#fq-hatch)" />
              <path d={`M${CX - R} ${CY} H${CX + R}`} className="fq-curtain-edge" />
            </g>
          )}
        </g>

        {ticks.map((t) => {
          const [x1, y1] = point(t, R + 2);
          const [x2, y2] = point(t, t % 25 === 0 ? R + 9 : R + 5);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} className="fq-tick" data-major={t % 25 === 0 || undefined} />;
        })}

        <g className="fq-needle" style={{ transform: `rotate(${angle}deg)` }}>
          <line x1={CX} y1={CY} x2={CX} y2={CY - R + 6} className="fq-needle-line" />
          <circle cx={CX} cy={CY - R + 6} r={editable ? 5.5 : 3.5} className="fq-needle-tip" />
        </g>
        <circle cx={CX} cy={CY} r={9} className="fq-hub" />
      </svg>

      <div className="fq-ends" aria-hidden={!card || undefined}>
        <span className="fq-end fq-end-left">{left}</span>
        <span className="fq-end fq-end-right">{right}</span>
      </div>
    </div>
  );
}
