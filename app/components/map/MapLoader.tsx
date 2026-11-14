"use client";

import dynamic from "next/dynamic";

const MarsExplorer = dynamic(() => import("./MarsExplorer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[320px] w-full items-center justify-center rounded-lg bg-slate-950 text-sm text-slate-400 ring-1 ring-white/10 md:h-[75vh]">
      Loading Mars map…
    </div>
  ),
});

export default MarsExplorer;