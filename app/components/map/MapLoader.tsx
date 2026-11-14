"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { MarsRegionSelection } from "../../data/mars-regions";

const MarsGlobe = dynamic(() => import("./MarsGlobe"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] min-h-[420px] w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-400 shadow-2xl">
      Loading Mars globe…
    </div>
  ),
});

export default function MapLoader() {
  const router = useRouter();
  const handleRegionSelect = useCallback(
    (region: MarsRegionSelection) => {
      router.push(`/regions/${encodeURIComponent(String(region.id))}`);
    },
    [router],
  );

  return <MarsGlobe onRegionSelect={handleRegionSelect} />;
}