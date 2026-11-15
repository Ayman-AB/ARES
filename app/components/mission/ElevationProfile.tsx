"use client";

import { useMemo, useState } from "react";

import type { LonLat } from "../../lib/mars-geo";
import type { LegStats, ProfilePoint } from "../../lib/mission-sim";
import { SEVERITY_HEX } from "./missionLayers";

interface ElevationProfileProps {
  points: ProfilePoint[];
  legs: LegStats[];
  onHover?: (at: LonLat | null) => void;
}

const W = 340;
const H = 110;
const PAD = { l: 34, r: 6, t: 8, b: 18 };

/** Simulated elevation along the route, coloured by segment severity. */
export default function ElevationProfile({ points, legs, onHover }: ElevationProfileProps) {
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (points.length < 2) return null;
    const maxKm = points[points.length - 1].km || 1;
    let lo = Infinity;
    let hi = -Infinity;
    points.forEach((p) => {
      lo = Math.min(lo, p.elevM);
      hi = Math.max(hi, p.elevM);
    });
    const span = Math.max(20, hi - lo);
    lo -= span * 0.08;
    hi += span * 0.08;
    const x = (km: number) => PAD.l + (km / maxKm) * (W - PAD.l - PAD.r);
    const y = (m: number) => PAD.t + (1 - (m - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const xy = points.map((p) => [x(p.km), y(p.elevM)] as const);
    const area =
      `M${xy[0][0]},${H - PAD.b} ` + xy.map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join(" ") +
      ` L${xy[xy.length - 1][0]},${H - PAD.b} Z`;
    // Severity-coloured line pieces
    const pieces: { d: string; sev: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      const sev = points[i].severity;
      const seg = `M${xy[i - 1][0].toFixed(1)},${xy[i - 1][1].toFixed(1)} L${xy[i][0].toFixed(1)},${xy[i][1].toFixed(1)}`;
      const last = pieces[pieces.length - 1];
      if (last && last.sev === sev) last.d += ` L${xy[i][0].toFixed(1)},${xy[i][1].toFixed(1)}`;
      else pieces.push({ d: seg, sev });
    }
    return { x, y, area, pieces, lo, hi, maxKm };
  }, [points]);

  if (!geom) {
    return (
      <div className="flex h-[110px] items-center justify-center rounded-lg border border-dashed border-white/10 text-[11px] text-slate-500">
        Add waypoints to see the elevation profile
      </div>
    );
  }

  const pick = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    const km = ((px - PAD.l) / (W - PAD.l - PAD.r)) * geom.maxKm;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].km - km) < Math.abs(points[best].km - km)) best = i;
    }
    return best;
  };

  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label="Simulated elevation profile along the route"
        onPointerMove={(e) => {
          const i = pick(e.clientX, e.currentTarget.getBoundingClientRect());
          setHover(i);
          onHover?.(points[i].at);
        }}
        onPointerLeave={() => {
          setHover(null);
          onHover?.(null);
        }}
      >
        <defs>
          <linearGradient id="elev-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[geom.lo, (geom.lo + geom.hi) / 2, geom.hi].map((m) => (
          <g key={m}>
            <line x1={PAD.l} x2={W - PAD.r} y1={geom.y(m)} y2={geom.y(m)} stroke="rgba(255,255,255,0.06)" />
            <text x={PAD.l - 4} y={geom.y(m) + 3} textAnchor="end" className="fill-slate-500 font-mono text-[8px]">
              {Math.round(m)}
            </text>
          </g>
        ))}
        {legs.slice(0, -1).map((l) => (
          <line
            key={l.index}
            x1={geom.x(l.cumKm)}
            x2={geom.x(l.cumKm)}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke="rgba(254,215,170,0.25)"
            strokeDasharray="2 3"
          />
        ))}
        <path d={geom.area} fill="url(#elev-fill)" />
        {geom.pieces.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={SEVERITY_HEX[p.sev as 0 | 1 | 2]} strokeWidth={1.8} />
        ))}
        <text x={PAD.l} y={H - 4} className="fill-slate-500 font-mono text-[8px]">0 km</text>
        <text x={W - PAD.r} y={H - 4} textAnchor="end" className="fill-slate-500 font-mono text-[8px]">
          {geom.maxKm.toFixed(1)} km
        </text>
        {hp && (
          <g>
            <line x1={geom.x(hp.km)} x2={geom.x(hp.km)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(255,255,255,0.5)" />
            <circle cx={geom.x(hp.km)} cy={geom.y(hp.elevM)} r={3} fill="#fff" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="pointer-events-none absolute right-1 top-0 rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-200 ring-1 ring-white/10">
          {hp.km.toFixed(2)} km · {Math.round(hp.elevM).toLocaleString()} m
        </div>
      )}
    </div>
  );
}
