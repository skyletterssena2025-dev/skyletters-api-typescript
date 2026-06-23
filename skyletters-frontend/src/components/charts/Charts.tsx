// Graficas SVG ligeras (sin dependencias) para el dashboard. Theme-aware via CSS vars.
import { useId } from "react";

const PALETTE = ["#60a5fa", "#38bdf8", "#4ade80", "#fbbf24", "#f87171", "#a78bfa", "#34d399"];

const money = (n: number): string =>
  new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

/**
 * Tarjeta contenedora estandar de una grafica (titulo + cuerpo).
 */
export function ChartCard({
  title,
  icon,
  children,
  sub,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="chart-card">
      <div className="chart-card-head">
        <h3>
          <i className={`fa-solid ${icon}`} /> {title}
        </h3>
        {sub && <span className="chart-card-sub">{sub}</span>}
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}

export interface Bar {
  label: string;
  value: number;
}

/**
 * Grafica de barras verticales. Escala automatica al valor maximo.
 */
export function BarChart({ data, height = 200 }: { data: Bar[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const gid = useId();
  if (!data.some((d) => d.value > 0)) return <EmptyChart />;
  return (
    <div className="bar-chart" style={{ height }}>
      <svg width="0" height="0">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
      </svg>
      {data.map((d, i) => {
        const h = max > 0 ? Math.round((d.value / max) * 100) : 0;
        return (
          <div className="bar-col" key={i} title={`${d.label}: ${d.value.toLocaleString("es-CO")}`}>
            <div className="bar-value">{d.value > 0 ? money(d.value) : ""}</div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ height: `${h}%`, background: `linear-gradient(180deg, var(--accent), var(--accent-2))` }}
              />
            </div>
            <div className="bar-label">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export interface Segment {
  label: string;
  value: number;
  color?: string;
}

/**
 * Grafica de dona (donut) con leyenda. Util para distribuciones (estado, %).
 */
export function DonutChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return <EmptyChart />;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="donut-chart">
      <svg viewBox="0 0 160 160" width="160" height="160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--border)" strokeWidth="18" />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={s.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="80" y="76" textAnchor="middle" className="donut-total">
          {total.toLocaleString("es-CO")}
        </text>
        <text x="80" y="94" textAnchor="middle" className="donut-total-label">
          total
        </text>
      </svg>
      <ul className="donut-legend">
        {segments.map((s, i) => (
          <li key={i}>
            <span className="dot" style={{ background: s.color ?? PALETTE[i % PALETTE.length] }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-value">{s.value.toLocaleString("es-CO")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="chart-empty">
      <i className="fa-solid fa-chart-simple" />
      <span>Sin datos para mostrar</span>
    </div>
  );
}
