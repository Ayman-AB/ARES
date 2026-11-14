import { Suspense } from "react";

import RegionDetails from "./RegionDetails";

export default function MarsRegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d14] text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.08),transparent_38%),linear-gradient(to_bottom,rgba(15,23,42,0.2),transparent_35%)]"
      />
      <Suspense
        fallback={
          <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
            <div className="h-12 w-48 animate-pulse rounded-xl bg-white/[0.05]" />
            <div className="mt-8 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8">
              <div className="h-3 w-40 animate-pulse rounded bg-orange-200/10" />
              <div className="mt-5 h-12 max-w-lg animate-pulse rounded-lg bg-white/[0.07]" />
              <div className="mt-4 h-4 max-w-2xl animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        }
      >
        <RegionContent params={params} />
      </Suspense>
    </main>
  );
}

async function RegionContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RegionDetails key={id} regionId={id} />;
}
