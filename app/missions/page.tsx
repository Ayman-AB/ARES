import type { Metadata } from "next";
import Link from "next/link";

import MissionPlannerLoader from "../components/mission/MissionPlannerLoader";

export const metadata: Metadata = {
  title: "Jezero Mission Planner · ARES",
  description: "Plan EVA and rover traverses across Jezero Crater on NASA Mars Trek imagery.",
};

export default function MissionsPage() {
  return (
    <main className="min-h-screen bg-[#060a10] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to globe"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-orange-200 transition hover:border-orange-300/40 hover:bg-orange-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              ←
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                ARES · NASA Space Apps 2026
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Jezero Crater mission planner
              </h1>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            18.4° N, 77.5° E · NASA Mars Trek WMTS · all calculations run in your browser
          </p>
        </header>
        <MissionPlannerLoader />
      </div>
    </main>
  );
}
