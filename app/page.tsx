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
    </main>
  );
}