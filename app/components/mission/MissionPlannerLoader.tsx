"use client";

import dynamic from "next/dynamic";

/** OpenLayers touches `window`, so the planner is client-only. */
const MissionPlanner = dynamic(() => import("./MissionPlanner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[62vh] min-h-[380px] w-full flex-col items-center justify-center gap-4 rounded-xl bg-[#080e16] text-sm text-slate-300 lg:h-[calc(100vh-11rem)]">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-orange-400/20 border-t-orange-300" />
      <span>Loading Jezero mission planner…</span>
    </div>
  ),
});

export default function MissionPlannerLoader() {
  return <MissionPlanner />;
}
