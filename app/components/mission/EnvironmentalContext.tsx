"use client";

import { useEffect, useState } from "react";

const WEATHER_URL = "https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json";

interface WeatherReport {
  sol: string;
  terrestrialDate: string;
  season: string | null;
  minTempC: number | null;
  maxTempC: number | null;
  pressurePa: number | null;
  sunrise: string | null;
  sunset: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "" || value.trim() === "--") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" && value.trim() !== "--"
    ? value.trim()
    : null;
}

function parseWeatherReports(payload: unknown): WeatherReport[] {
  if (!isRecord(payload) || !Array.isArray(payload.sols)) {
    throw new Error("NASA returned an unexpected weather-report format.");
  }

  const reports = payload.sols.flatMap((item): WeatherReport[] => {
    if (!isRecord(item)) return [];
    const sol = parseText(item.sol);
    const terrestrialDate = parseText(item.terrestrial_date);
    if (!sol || !/^\d+$/.test(sol) || !terrestrialDate) return [];

    return [
      {
        sol,
        terrestrialDate,
        season: parseText(item.season),
        minTempC: parseNumber(item.min_temp),
        maxTempC: parseNumber(item.max_temp),
        pressurePa: parseNumber(item.pressure),
        sunrise: parseText(item.sunrise),
        sunset: parseText(item.sunset),
      },
    ];
  });

  if (reports.length === 0) {
    throw new Error("NASA's weather feed did not contain any valid sol reports.");
  }

  return reports.sort((a, b) => Number(a.sol) - Number(b.sol));
}

function formatTemperature(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Unavailable";
  return `${min === null ? "—" : min.toFixed(1)}° to ${max === null ? "—" : max.toFixed(1)}°C`;
}

function EnvironmentMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{detail}</p>
    </div>
  );
}

function TemperatureTrend({ reports }: { reports: WeatherReport[] }) {
  const readings = reports.flatMap((item, index) =>
    item.minTempC === null || item.maxTempC === null
      ? []
      : [{ index, report: item, min: item.minTempC, max: item.maxTempC }],
  );

  if (readings.length === 0) {
    return <p className="py-3 text-center text-[10px] text-slate-500">No recent temperature ranges reported.</p>;
  }

  const values = readings.flatMap((item) => [item.min, item.max]);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const padding = Math.max(5, (dataMax - dataMin) * 0.12);
  const domainMin = Math.floor((dataMin - padding) / 10) * 10;
  const domainMax = Math.ceil((dataMax + padding) / 10) * 10;
  const plotTop = 10;
  const plotBottom = 79;
  const x = (index: number) =>
    40 + (index / Math.max(1, reports.length - 1)) * 267;
  const y = (value: number) =>
    plotBottom - ((value - domainMin) / (domainMax - domainMin)) * (plotBottom - plotTop);
  const ticks = [domainMax, (domainMin + domainMax) / 2, domainMin];

  return (
    <svg
      viewBox="0 0 320 104"
      role="img"
      aria-labelledby="temperature-trend-title temperature-trend-description"
      className="mt-1 block w-full"
    >
      <title id="temperature-trend-title">Recent reported temperature ranges</title>
      <desc id="temperature-trend-description">
        Minimum-to-maximum air temperature ranges for the latest {reports.length} reports, ordered by sol.
      </desc>
      {ticks.map((tick, index) => {
        const tickY = plotTop + (index / 2) * (plotBottom - plotTop);
        return (
          <g key={tick}>
            <line x1="36" x2="312" y1={tickY} y2={tickY} stroke="rgba(148,163,184,0.12)" />
            <text x="31" y={tickY + 3} textAnchor="end" fill="#64748b" fontSize="8">
              {Math.round(tick)}°
            </text>
          </g>
        );
      })}
      {readings.map((item) => {
        const top = y(item.max);
        const bottom = y(item.min);
        const isLatest = item.report.sol === reports[reports.length - 1]?.sol;
        const width = Math.min(7, 235 / Math.max(1, reports.length));
        return (
          <g key={item.report.sol}>
            <title>
              Sol {item.report.sol}: {item.min.toFixed(1)}°C to {item.max.toFixed(1)}°C
            </title>
            <line
              x1={x(item.index)}
              x2={x(item.index)}
              y1={top}
              y2={Math.max(top + 2, bottom)}
              stroke={isLatest ? "#fdba74" : "#38bdf8"}
              strokeWidth={width}
              strokeLinecap="round"
              opacity={isLatest ? 1 : 0.72}
            />
          </g>
        );
      })}
      <text x="40" y="98" fill="#64748b" fontSize="8">
        Sol {reports[0]?.sol}
      </text>
      <text x="307" y="98" textAnchor="end" fill="#64748b" fontSize="8">
        Sol {reports[reports.length - 1]?.sol}
      </text>
    </svg>
  );
}

function PressureTrend({ reports }: { reports: WeatherReport[] }) {
  const readings = reports.flatMap((item, index) =>
    item.pressurePa === null ? [] : [{ index, report: item, value: item.pressurePa }],
  );

  if (readings.length === 0) {
    return <p className="py-2 text-center text-[10px] text-slate-500">No recent pressure reports.</p>;
  }

  const values = readings.map((item) => item.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const padding = Math.max(1, (dataMax - dataMin) * 0.12);
  const domainMin = dataMin - padding;
  const domainMax = dataMax + padding;
  const plotTop = 8;
  const plotBottom = 43;
  const x = (index: number) =>
    40 + (index / Math.max(1, reports.length - 1)) * 267;
  const y = (value: number) =>
    plotBottom - ((value - domainMin) / (domainMax - domainMin)) * (plotBottom - plotTop);
  const width = Math.min(7, 235 / Math.max(1, reports.length));

  return (
    <svg
      viewBox="0 0 320 65"
      role="img"
      aria-labelledby="pressure-trend-title pressure-trend-description"
      className="mt-1 block w-full"
    >
      <title id="pressure-trend-title">Recent reported surface pressure</title>
      <desc id="pressure-trend-description">
        Surface pressure values for the latest {reports.length} reports, ordered by sol.
      </desc>
      {[plotTop, (plotTop + plotBottom) / 2, plotBottom].map((tickY, index) => (
        <line
          key={tickY}
          x1="36"
          x2="312"
          y1={tickY}
          y2={tickY}
          stroke={index === 2 ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.1)"}
        />
      ))}
      <text x="31" y="11" textAnchor="end" fill="#64748b" fontSize="7">
        {Math.round(domainMax)}
      </text>
      <text x="31" y="46" textAnchor="end" fill="#64748b" fontSize="7">
        {Math.round(domainMin)}
      </text>
      {readings.map((item) => {
        const top = y(item.value);
        const isLatest = item.report.sol === reports[reports.length - 1]?.sol;
        return (
          <g key={item.report.sol}>
            <title>Sol {item.report.sol}: {item.value.toFixed(1)} Pa</title>
            <line
              x1={x(item.index)}
              x2={x(item.index)}
              y1={top}
              y2={plotBottom}
              stroke={isLatest ? "#fdba74" : "#2dd4bf"}
              strokeWidth={width}
              strokeLinecap="round"
              opacity={isLatest ? 1 : 0.7}
            />
          </g>
        );
      })}
      <text x="40" y="60" fill="#64748b" fontSize="8">
        Sol {reports[0]?.sol}
      </text>
      <text x="307" y="60" textAnchor="end" fill="#64748b" fontSize="8">
        Sol {reports[reports.length - 1]?.sol}
      </text>
    </svg>
  );
}

export default function EnvironmentalContext() {
  const [reports, setReports] = useState<WeatherReport[] | null>(null);
  const [selectedSol, setSelectedSol] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      try {
        const response = await fetch(WEATHER_URL, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`NASA's weather feed returned HTTP ${response.status}.`);
        }
        const payload: unknown = await response.json();
        setReports(parseWeatherReports(payload));
        setError(null);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setReports(null);
        setError(cause instanceof Error ? cause.message : "The NASA weather feed could not be read.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadReports();
    return () => controller.abort();
  }, [retryToken]);

  const latest = reports?.[reports.length - 1];
  const report = reports?.find((item) => item.sol === selectedSol) ?? latest;
  const recentReports = reports?.slice(-12) ?? [];

  return (
    <section aria-labelledby="environment-h">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <h4 id="environment-h" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Environmental snapshot
          </h4>
          <p className="mt-1 text-[10px] text-slate-500">Perseverance surface reports · historical</p>
        </div>
        <span className="rounded-full border border-sky-300/15 bg-sky-300/[0.06] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-sky-200/80">
          NASA archive
        </span>
      </div>

      {isLoading ? (
        <p role="status" className="rounded-lg border border-white/[0.07] px-3 py-3 text-xs text-slate-400">
          Loading NASA environmental reports…
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-3">
          <p className="text-xs font-medium text-amber-100">Environmental reports unavailable</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setRetryToken((value) => value + 1);
            }}
            className="mt-2 rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] font-medium text-slate-200 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Retry
          </button>
        </div>
      ) : report ? (
        <>
          <div className="mb-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                Recent environmental trends
              </p>
              <span className="text-[8px] uppercase tracking-[0.1em] text-slate-500">
                {recentReports.length} reports
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[9px] text-slate-500">Air temperature · min–max °C</p>
              <span className="flex items-center gap-1 text-[8px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-300" /> latest report
              </span>
            </div>
            <TemperatureTrend reports={recentReports} />
            <div className="mt-1 border-t border-white/[0.06] pt-2">
              <p className="text-[9px] text-slate-500">Surface pressure · Pa</p>
              <PressureTrend reports={recentReports} />
            </div>
            <p className="mt-1 text-[8px] leading-3 text-slate-600">
              Shows the latest reports, independent of the selected observation below. Ordered by sol; spacing is
              by report order, not elapsed time.
            </p>
          </div>

          <label htmlFor="environment-sol" className="mb-1.5 block text-[10px] text-slate-500">
            Observation
          </label>
          <select
            id="environment-sol"
            value={report.sol}
            onChange={(event) => setSelectedSol(event.target.value)}
            className="mb-2.5 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            {reports?.map((item) => (
              <option key={item.sol} value={item.sol}>
                Sol {item.sol} · {item.terrestrialDate}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <EnvironmentMetric
              label="Air temperature"
              value={formatTemperature(report.minTempC, report.maxTempC)}
              detail="Reported min–max · °C"
            />
            <EnvironmentMetric
              label="Surface pressure"
              value={report.pressurePa === null ? "Unavailable" : `${report.pressurePa.toFixed(1)} Pa`}
              detail="Perseverance site report"
            />
            <EnvironmentMetric
              label="Sunrise"
              value={report.sunrise ?? "Unavailable"}
              detail="Local rover time"
            />
            <EnvironmentMetric
              label="Sunset"
              value={report.sunset ?? "Unavailable"}
              detail={report.season ?? "Season not reported"}
            />
          </div>

          <p className="mt-2.5 rounded-lg border border-amber-300/15 bg-amber-300/[0.035] px-3 py-2 text-[10px] leading-4 text-amber-100/75">
            Historical rover-site reports only—not live, route-specific, or EVA safety conditions. NASA marks this
            feed for outreach use; use the science archive for research.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={WEATHER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-[10px] font-medium text-sky-300/80 underline decoration-sky-300/25 underline-offset-2 transition hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              Open NASA Mars 2020 weather feed
            </a>
            <a
              href="https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-[10px] font-medium text-sky-300/80 underline decoration-sky-300/25 underline-offset-2 transition hover:text-sky-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              Open PDS MEDA archive
            </a>
          </div>
        </>
      ) : null}
    </section>
  );
}
