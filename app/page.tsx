import Link from "next/link";

import MapLoader from "./components/map/MapLoader";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-6">
      {/* ...existing ARES content... */}
      <section
        aria-labelledby="mars-map-heading"
        className="flex min-h-0 flex-1 flex-col space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="mars-map-heading" className="text-xl font-semibold">
            Explore Mars
          </h2>
          <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200">
            NASA WMTS
          </span>
        </div>
        <MapLoader />
      </section>

      <Link
        href="/missions"
        className="group mt-6 flex items-center justify-between gap-4 rounded-2xl border border-orange-300/20 bg-gradient-to-r from-orange-400/[0.08] to-transparent p-5 transition hover:border-orange-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-200/70">
            Mission planner
          </p>
          <p className="mt-1 text-base font-semibold">Plan a traverse across Jezero Crater</p>
          <p className="mt-1 text-xs text-slate-400">
            Preset delta and rim missions, custom waypoints, distance, battery and slope alerts.
          </p>
        </div>
        <span className="text-xl text-orange-200 transition group-hover:translate-x-1">→</span>
      </Link>
    </main>
  );
}