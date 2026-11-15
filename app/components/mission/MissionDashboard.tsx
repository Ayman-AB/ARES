"use client";

import { siteById, type Mission } from "../../data/jezero-missions";
import { formatLonLat, type LonLat } from "../../lib/mars-geo";
import {
  formatHours,
  type MissionAnalysis,
  type MissionProfile,
  type Severity,
} from "../../lib/mission-sim";
import EnvironmentalContext from "./EnvironmentalContext";
import ElevationProfile from "./ElevationProfile";
import { SEVERITY_HEX } from "./missionLayers";

interface MissionDashboardProps {
  mission: Mission;
  analysis: MissionAnalysis;
  profile: MissionProfile;
  onFlyTo: (at: LonLat) => void;
  onProbe: (at: LonLat | null) => void;
  selectedWaypointId: string | null;
  onSelectWaypoint: (id: string) => void;
}

const h4 = "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400";

function Metric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn" | "bad";
}) {
  const color = tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-200" : "text-white";
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-base font-semibold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{sub}</p>}
    </div>
  );
}

const SevDot = ({ s }: { s: Severity }) => (
  <span
    aria-hidden="true"
    className="inline-block h-2 w-2 shrink-0 rounded-full"
    style={{ background: SEVERITY_HEX[s] }}
  />
);

export default function MissionDashboard({
  mission,
  analysis: a,
  profile,
  onFlyTo,
  onProbe,
  selectedWaypointId,
  onSelectWaypoint,
}: MissionDashboardProps) {
  const hasRoute = mission.waypoints.length > 0;
  const battTone = a.batteryPct > 100 ? "bad" : a.batteryPct > 80 ? "warn" : "default";
  const timeTone =
    a.totalHours > profile.sortieLimitH ? (profile.id === "eva" ? "bad" : "warn") : "default";
  const rangeTone = a.maxRangeKm > profile.walkbackKm ? "bad" : "default";
  const slopeTone =
    a.maxSlopeDeg >= profile.noGoSlopeDeg ? "bad" : a.maxSlopeDeg >= profile.cautionSlopeDeg ? "warn" : "default";

  const linkedSites = mission.waypoints
    .map((w) => siteById(w.siteId))
    .filter((s, i, arr): s is NonNullable<typeof s> => !!s && arr.indexOf(s) === i);

  return (
    <div className="space-y-6">
      {/* Terrain screening */}
      <section
        aria-labelledby="terrain-screening-h"
        className="rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h4 id="terrain-screening-h" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
            Terrain screening · model only
          </h4>
          <span className="shrink-0 rounded-full border border-amber-200/15 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-amber-100/70">
            Not safety clearance
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-300/80">
          Slopes, elevation, and hazard flags use an analytic Jezero model—not measured route terrain. A green result
          means only that model thresholds were not crossed; no DEM, surface-roughness survey, or obstacle detection
          currently validates this route.
        </p>
        <p className="mt-2 border-t border-amber-200/10 pt-2 text-[10px] leading-4 text-slate-400">
          Imagery is visual context only: global CTX ~5 m/px, Jezero CTX 6 m/px, and HiRISE 25 cm/px within its
          limited coverage. Global MOLA elevation is 463 m/px—too coarse for foot-scale safety—and none of these
          layers feed the route calculations.
        </p>
      </section>

      {/* Metrics */}
      <section aria-labelledby="metrics-h">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h4 id="metrics-h" className={h4}>
            Traverse budget
          </h4>
          <span className="text-[9px] uppercase tracking-[0.14em] text-slate-600">planning estimate</span>
        </div>
        <p className="mb-2.5 text-[10px] leading-4 text-slate-500">
          Distance, time, battery, and O₂ are calculated from editable EVA/rover assumptions—not validated vehicle
          performance.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="Total distance"
            value={a.totalKm >= 10 ? `${a.totalKm.toFixed(1)} km` : `${a.totalKm.toFixed(2)} km`}
            sub={`${mission.waypoints.length} stops${mission.returnToLander ? " · loop" : ""} · geodesic`}
          />
          <Metric
            label="Duration"
            value={formatHours(a.totalHours)}
            sub={`${formatHours(a.travelHours)} moving + ${formatHours(a.dwellHours)} at stops${
              a.sols > 1 ? ` · ${a.sols} sols` : ""
            }`}
            tone={timeTone}
          />
          <div className="col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
            <div className="flex items-baseline justify-between">
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                Battery · {profile.batteryKWh} kWh pack
              </p>
              <p
                className={`font-mono text-sm font-semibold tabular-nums ${
                  battTone === "bad" ? "text-red-300" : battTone === "warn" ? "text-amber-200" : "text-white"
                }`}
              >
                {a.energyKWh.toFixed(2)} kWh · {Math.round(a.batteryPct)}%
              </p>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round(a.batteryPct))}
              aria-label="Estimated battery use"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, a.batteryPct)}%`,
                  background:
                    battTone === "bad" ? SEVERITY_HEX[2] : battTone === "warn" ? SEVERITY_HEX[1] : SEVERITY_HEX[0],
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Reserve {Math.max(0, 100 - a.batteryPct).toFixed(0)}% · O₂ {a.o2Kg.toFixed(2)} kg ·{" "}
              {profile.hotelW} W hotel load
            </p>
          </div>
          <Metric
            label="Climb / descent"
            value={`+${Math.round(a.gainM)} / −${Math.round(a.lossM)} m`}
            sub={`Start ${Math.round(a.startElevM).toLocaleString()} m`}
          />
          <Metric
            label="Max slope"
            value={`${a.maxSlopeDeg.toFixed(1)}°`}
            sub={`caution ${profile.cautionSlopeDeg}° · no-go ${profile.noGoSlopeDeg}°`}
            tone={slopeTone}
          />
          <Metric
            label="Max range"
            value={`${a.maxRangeKm.toFixed(1)} km`}
            sub={`walk-back limit ${profile.walkbackKm} km`}
            tone={rangeTone}
          />
          <Metric
            label="Sortie limit"
            value={`${profile.sortieLimitH} h`}
            sub={`${Math.round((a.totalHours / profile.sortieLimitH) * 100)}% used`}
            tone={timeTone}
          />
        </div>
      </section>

      {/* Terrain warnings */}
      <section aria-labelledby="warn-h">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h4 id="warn-h" className={h4}>
            Terrain &amp; resource screening
          </h4>
          <span className="font-mono text-[10px] text-slate-500">
            {a.warnings.filter((w) => w.severity === 2).length} no-go ·{" "}
            {a.warnings.filter((w) => w.severity === 1).length} caution
          </span>
        </div>
        {!hasRoute ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-slate-500">
            No route yet.
          </p>
        ) : a.warnings.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2.5 text-xs text-emerald-100">
            <SevDot s={0} />
            No model or budget thresholds triggered. This is not a safety clearance.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {a.warnings.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  disabled={!w.at}
                  onClick={() => w.at && onFlyTo(w.at)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 enabled:hover:bg-white/[0.04] ${
                    w.severity === 2 ? "border-red-400/25 bg-red-400/[0.06]" : "border-amber-300/20 bg-amber-300/[0.05]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-slate-100">
                    <SevDot s={w.severity} />
                    <span className="min-w-0 flex-1">{w.title}</span>
                    {w.at && <span className="font-mono text-[9px] text-slate-500">locate ›</span>}
                  </span>
                  <span className="mt-1 block pl-4 text-[11px] leading-4 text-slate-400">{w.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EnvironmentalContext />

      {/* Elevation profile */}
      <section aria-labelledby="profile-h">
        <div className="mb-2 flex items-baseline justify-between">
          <h4 id="profile-h" className={h4}>
            Elevation profile
          </h4>
          <span className="text-[9px] uppercase tracking-[0.14em] text-slate-600">simulated terrain</span>
        </div>
        <ElevationProfile points={a.profile} legs={a.legs} onHover={onProbe} />
        <div className="mt-1.5 flex gap-3 text-[10px] text-slate-500">
          {(["ok", "caution", "no-go"] as const).map((label, i) => (
            <span key={label} className="flex items-center gap-1.5">
              <SevDot s={i as Severity} /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* Waypoints / legs */}
      <section aria-labelledby="legs-h">
        <h4 id="legs-h" className={`${h4} mb-2.5`}>
          Route legs
        </h4>
        <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          <li className="flex items-center gap-3 py-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-400/15 font-mono text-[10px] font-bold text-sky-200">
              L
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-slate-100">{mission.lander.name}</span>
              <span className="block font-mono text-[10px] text-slate-500">
                {formatLonLat(mission.lander.lon, mission.lander.lat, 4)}
              </span>
            </span>
            <span className="font-mono text-[10px] text-slate-500">start</span>
          </li>
          {a.legs.map((leg) => {
            const wp = mission.waypoints[leg.index];
            const isReturn = !wp;
            const selected = wp && wp.id === selectedWaypointId;
            return (
              <li key={leg.index}>
                <button
                  type="button"
                  onClick={() => (wp ? onSelectWaypoint(wp.id) : onFlyTo([mission.lander.lon, mission.lander.lat]))}
                  className={`flex w-full items-center gap-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
                    selected ? "bg-orange-300/[0.07]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold ${
                      isReturn ? "border-sky-300/40 text-sky-200" : "border-orange-300/60 text-orange-200"
                    }`}
                  >
                    {isReturn ? "↩" : leg.index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-slate-100">{leg.toName}</span>
                    <span className="block font-mono text-[10px] text-slate-500">
                      {wp ? formatLonLat(wp.lon, wp.lat, 4) : "return to lander"}
                    </span>
                  </span>
                  <span className="text-right font-mono text-[10px] leading-4">
                    <span className="block text-slate-200">+{leg.km.toFixed(2)} km</span>
                    <span className="flex items-center justify-end gap-1 text-slate-500">
                      <SevDot s={leg.severity} /> {leg.maxSlopeDeg.toFixed(0)}° · Σ {leg.cumKm.toFixed(1)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Science */}
      <section aria-labelledby="science-h" className="pb-2">
        <h4 id="science-h" className={`${h4} mb-2.5`}>
          Scientific objectives
        </h4>
        {mission.background && (
          <p className="text-xs leading-5 text-slate-300/85">{mission.background}</p>
        )}
        {mission.objectives.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {mission.objectives.map((o, i) => (
              <li key={i} className="flex gap-2 text-xs leading-5 text-slate-200">
                <span className="mt-[7px] h-1 w-3 shrink-0 rounded-full bg-orange-300/70" />
                {o}
              </li>
            ))}
          </ul>
        )}
        {linkedSites.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Waypoint science targets
            </p>
            {linkedSites.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onFlyTo([s.lon, s.lat])}
                className="block w-full rounded-xl border border-teal-300/10 bg-teal-300/[0.03] p-3 text-left transition hover:border-teal-300/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-teal-50">{s.name}</span>
                  <span className="truncate text-[9px] uppercase tracking-[0.12em] text-teal-200/60">{s.unit}</span>
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-slate-400">{s.summary}</span>
                {s.tasks && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {s.tasks.map((t) => (
                      <span key={t} className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-slate-300">
                        {t}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {!mission.background && mission.objectives.length === 0 && linkedSites.length === 0 && (
          <p className="text-[11px] text-slate-500">
            Snap waypoints to science sites (teal diamonds) or add objectives in the mission editor.
          </p>
        )}
      </section>
    </div>
  );
}
