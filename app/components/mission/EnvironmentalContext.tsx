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
