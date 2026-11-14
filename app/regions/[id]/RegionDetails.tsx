"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchMarsRegionById,
  type MarsRegion,
} from "../../data/mars-regions";

const MarsExplorer = dynamic(() => import("../../components/map/MarsExplorer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[320px] w-full flex-col items-center justify-center gap-4 rounded-xl bg-[#080e16] text-sm text-slate-300 md:h-[75vh]">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-orange-400/20 border-t-orange-300" />
      <span>Preparing the regional surface map…</span>
    </div>
  ),
});

export default function RegionDetails({ regionId }: { regionId: string }) {
  const [region, setRegion] = useState<MarsRegion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchMarsRegionById(regionId)
      .then((result) => {
        if (active) setRegion(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load this region from NASA's Mars data service.",
        );
      });

    return () => {
      active = false;
    };
  }, [regionId]);

  return (
    <div className="relative mx-auto max-w-[1440px] px-4 py-6 text-slate-100 sm:px-6 lg:px-10 lg:py-9">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-xl pr-3 transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-orange-200 transition group-hover:border-orange-300/40 group-hover:bg-orange-300/10">
            ←
          </span>
          <span className="leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              ARES / MARS EXPLORER
            </span>
            <span className="mt-1 block text-sm font-medium text-slate-200">
              Return to globe
            </span>
          </span>
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.7)]" />
          NASA data
        </div>
      </header>

      {error ? (
        <section
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-950/50 to-[#0b1018] p-6 shadow-2xl shadow-black/20 sm:p-8"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-300/20 bg-red-300/10 text-lg text-red-200">
              !
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-200/70">
                Data connection issue
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Could not open this Mars region
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/70">{error}</p>
            </div>
          </div>
        </section>
      ) : region ? (
        <>
          <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-[#151c26] via-[#101720] to-[#0c121a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-orange-400/[0.08] blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-px w-2/3 bg-gradient-to-r from-orange-300/50 via-orange-300/10 to-transparent"
            />
            <div className="relative">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-orange-200/80">
                  <span className="h-px w-6 bg-orange-300/70" />
                  Regional intelligence
                </p>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] tracking-wide text-slate-400">
                  NASA REGION / {region.id}
                </span>
              </div>
              <div className="max-w-3xl">
                <h1 className="text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
                  {region.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                  The map is framed around this region. The orange outline marks its NASA
                  boundary; imagery detail depends on the real datasets available there.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-orange-300/20 bg-orange-300/[0.07] px-3 py-2 text-xs font-medium text-orange-100/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                  NASA boundary
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/15 px-3 py-2 text-xs text-slate-300">
                  <span className="text-slate-500">CENTER</span>
                  <span className="font-mono text-slate-200">
                    LAT {region.center[1].toFixed(2)}° · LON {region.center[0].toFixed(2)}°
                  </span>
                </span>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0c121a] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Surface explorer
                </p>
                <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-100">
                  Explore {region.title}
                </h2>
              </div>
              <p className="text-xs text-slate-500">Pan · zoom · inspect available layers</p>
            </div>
            <div className="p-2 sm:p-3">
              <MarsExplorer
                key={String(region.id)}
                region={region}
                initialCenter={region.center}
                initialZoom={5}
                initialExtent={region.extent}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] px-5 py-3 text-[10px] text-slate-500 sm:px-6">
              <span>Boundary and map data are supplied by NASA Mars Trek.</span>
              <span className="font-mono uppercase tracking-[0.14em]">Regional view</span>
            </div>
          </section>
        </>
      ) : (
        <div
          role="status"
          className="overflow-hidden rounded-3xl border border-white/[0.09] bg-[#101720] p-6 shadow-2xl shadow-black/20 sm:p-8"
        >
          <div className="animate-pulse">
            <div className="h-3 w-36 rounded bg-orange-200/10" />
            <div className="mt-5 h-10 max-w-md rounded-lg bg-white/[0.07]" />
            <div className="mt-3 h-4 max-w-xl rounded bg-white/[0.04]" />
            <div className="mt-8 flex h-48 items-center justify-center rounded-2xl border border-white/[0.06] bg-black/10 text-sm text-slate-400 sm:h-64">
              Loading region boundary from NASA…
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
