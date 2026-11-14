import MapLoader from "./components/map/MapLoader";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* ...existing ARES content... */}
      <section aria-labelledby="mars-map-heading" className="space-y-3">
        <h2 id="mars-map-heading" className="text-xl font-semibold">
          Mars Map
        </h2>
        <MapLoader />
      </section>
    </main>
  );
}