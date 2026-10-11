import type { FloorPlan as Plan } from '../shared/index.js';
import { s } from './strings';

const DOOR = 0.9;
const WIN = 1.2;
const WALL = 0.14;

type Marker = Plan['markers'][number];

function MarkerGlyph({ m, n }: { m: Marker; n: number }) {
  const r = 0.34;
  switch (m.kind) {
    case 'body':
      return (
        <g className="dt-fp-m" data-kind="body">
          <circle cx={m.x} cy={m.y} r={r + 0.08} />
          <path d={`M${m.x - r * 0.6} ${m.y - r * 0.6}l${r * 1.2} ${r * 1.2}M${m.x + r * 0.6} ${m.y - r * 0.6}l${-r * 1.2} ${r * 1.2}`} />
        </g>
      );
    case 'camera':
      return (
        <g className="dt-fp-m" data-kind="camera">
          <path d={`M${m.x} ${m.y}l${r * 1.6} ${-r * 0.9}v${r * 1.8}z`} />
          <rect x={m.x - r * 0.5} y={m.y - r * 0.5} width={r} height={r} />
        </g>
      );
    case 'item':
      return (
        <g className="dt-fp-m" data-kind="item">
          <rect x={m.x - r * 0.8} y={m.y - r * 0.8} width={r * 1.6} height={r * 1.6} transform={`rotate(45 ${m.x} ${m.y})`} />
        </g>
      );
    case 'stain':
      return (
        <g className="dt-fp-m" data-kind="stain">
          <path
            d={`M${m.x} ${m.y - r}c${r * 0.6} 0 ${r} ${r * 0.4} ${r * 0.9} ${r * 0.9}s-${r * 0.2} ${r} -${r * 0.9} ${r}-${r} -${r * 0.3} -${r} -${r * 0.9} ${r * 0.4} -${r} ${r} -${r}z`}
          />
        </g>
      );
    default:
      return (
        <g className="dt-fp-m" data-kind="note">
          <circle cx={m.x} cy={m.y} r={r} />
          <text x={m.x} y={m.y + 0.13} textAnchor="middle" fontSize={0.36}>
            {n}
          </text>
        </g>
      );
  }
}

/** Mekân krokisi: odalar, kapı açılış yayları, pencereler, numaralı işaretler ve lejant. */
export function FloorPlan({ plan, title, compact }: { plan: Plan; title: string; compact?: boolean }) {
  const { width: W, height: H } = plan;
  const pad = 1.2;
  const cx = W / 2;
  const cy = H / 2;
  const markers = plan.markers.map((m, i) => ({ ...m, n: i + 1 }));
  const unit = Math.max(W, H) / 22;
  const fs = Math.max(0.36, Math.min(0.55, unit * 1.1));

  return (
    <figure className="dt-fp" data-compact={compact || undefined}>
      <svg className="dt-fp-svg" viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2 + 0.6}`} role="img" aria-label={title}>
        <defs>
          <pattern id="dt-fp-hatch" width="0.5" height="0.5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 0v0.5" className="dt-fp-hatch" />
          </pattern>
          <pattern id="dt-fp-grid" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M1 0H0V1" className="dt-fp-gridline" />
          </pattern>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill="url(#dt-fp-grid)" />

        {plan.rooms
          .filter((r) => r.outdoor)
          .map((r) => (
            <rect key={r.id} className="dt-fp-outdoor" x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#dt-fp-hatch)" />
          ))}
        {plan.rooms
          .filter((r) => !r.outdoor)
          .map((r) => (
            <rect key={r.id} className="dt-fp-room" x={r.x} y={r.y} width={r.w} height={r.h} strokeWidth={WALL} />
          ))}

        {plan.windows.map((w, i) =>
          w.vertical ? (
            <g key={`w${i}`} className="dt-fp-win">
              <rect x={w.x - WALL} y={w.y - WIN / 2} width={WALL * 2} height={WIN} className="dt-fp-cut" />
              <path d={`M${w.x - WALL * 0.7} ${w.y - WIN / 2}v${WIN}M${w.x + WALL * 0.7} ${w.y - WIN / 2}v${WIN}M${w.x} ${w.y - WIN / 2}v${WIN}`} />
            </g>
          ) : (
            <g key={`w${i}`} className="dt-fp-win">
              <rect x={w.x - WIN / 2} y={w.y - WALL} width={WIN} height={WALL * 2} className="dt-fp-cut" />
              <path d={`M${w.x - WIN / 2} ${w.y - WALL * 0.7}h${WIN}M${w.x - WIN / 2} ${w.y + WALL * 0.7}h${WIN}M${w.x - WIN / 2} ${w.y}h${WIN}`} />
            </g>
          ),
        )}

        {plan.doors.map((d, i) => {
          if (d.vertical) {
            const dir = d.x > cx ? 1 : -1;
            const y0 = d.y - DOOR / 2;
            return (
              <g key={`d${i}`} className="dt-fp-door">
                <rect x={d.x - WALL} y={y0} width={WALL * 2} height={DOOR} className="dt-fp-cut" />
                <path d={`M${d.x} ${y0}h${DOOR * dir}`} />
                <path className="dt-fp-swing" d={`M${d.x + DOOR * dir} ${y0}A${DOOR} ${DOOR} 0 0 ${dir > 0 ? 1 : 0} ${d.x} ${y0 + DOOR}`} />
              </g>
            );
          }
          const dir = d.y > cy ? -1 : 1;
          const x0 = d.x - DOOR / 2;
          return (
            <g key={`d${i}`} className="dt-fp-door">
              <rect x={x0} y={d.y - WALL} width={DOOR} height={WALL * 2} className="dt-fp-cut" />
              <path d={`M${x0} ${d.y}v${DOOR * dir}`} />
              <path className="dt-fp-swing" d={`M${x0} ${d.y + DOOR * dir}A${DOOR} ${DOOR} 0 0 ${dir > 0 ? 0 : 1} ${x0 + DOOR} ${d.y}`} />
            </g>
          );
        })}

        {plan.rooms.map((r) => {
          // İşaretlerle çakışmasın: odada işaret varsa etiket sol üst köşeye
          const crowded = plan.markers.some((m) => m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h);
          return crowded ? (
            <text key={`l${r.id}`} className="dt-fp-label" x={r.x + 0.3} y={r.y + 0.3 + fs} fontSize={fs * 0.9}>
              {r.label}
            </text>
          ) : (
            <text key={`l${r.id}`} className="dt-fp-label" x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={fs}>
              {r.label}
            </text>
          );
        })}

        {markers.map((m) => (
          <g key={`m${m.n}`}>
            <MarkerGlyph m={m} n={m.n} />
            <text className="dt-fp-mnum" x={m.x + 0.45} y={m.y - 0.35} fontSize={fs * 0.8}>
              {m.n}
            </text>
          </g>
        ))}

        {/* Ölçek çubuğu ve kuzey */}
        <g className="dt-fp-scale" transform={`translate(0 ${H + 0.75})`}>
          <path d="M0 0h1M0 -0.15v0.3M1 -0.15v0.3" />
          <text x={1.25} y={0.14} fontSize={0.36}>
            {s.doc.scale}
          </text>
        </g>
        <g className="dt-fp-north" transform={`translate(${W + 0.55} ${-0.5})`}>
          <path d="M0 -0.45L0.22 0.25L0 0.12L-0.22 0.25z" />
          <text x={0} y={0.7} textAnchor="middle" fontSize={0.34}>
            {s.doc.north}
          </text>
        </g>
      </svg>
      {markers.length > 0 && (
        <ol className="dt-fp-legend" aria-label={s.doc.legend}>
          {markers.map((m) => (
            <li key={m.n} data-kind={m.kind}>
              <span className="dt-fp-legend-n">{m.n}</span>
              <span>{m.label}</span>
              <span className="dt-fp-legend-kind">({s.doc.marker[m.kind]})</span>
            </li>
          ))}
          {plan.doors
            .filter((d) => d.label)
            .map((d, i) => (
              <li key={`door${i}`} data-kind="door">
                <span className="dt-fp-legend-n dt-fp-legend-door" />
                <span>{d.label}</span>
                <span className="dt-fp-legend-kind">({s.doc.door})</span>
              </li>
            ))}
        </ol>
      )}
    </figure>
  );
}
