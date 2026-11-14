import { MARS_LAYER_DEFS } from "../../config/mars-map";
import { MARKER_STYLES, type MarsPlace } from "../../data/mars-features";
import { formatKm, formatLonLat, type RouteInfo } from "../../lib/mars-geo";

export type OverlayState = Record<string, { visible: boolean; opacity: number }>;

export interface MapSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseId: string;
  onBaseChange: (id: string) => void;
  overlayState: OverlayState;
  onOverlayChange: (id: string, patch: Partial<OverlayState[string]>) => void;
  places: MarsPlace[];
  selectedPlace: MarsPlace | null;
  onSelectPlace: (id: string) => void;
  onRemovePlace: (id: string) => void;
  routes: RouteInfo[];
  onRemoveRoute: (id: string) => void;
  onClearRoutes: () => void;
}

const sectionTitle = "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400";

export default function MapSidePanel(props: MapSidePanelProps) {
  const {
    open, onOpenChange, baseId, onBaseChange, overlayState, onOverlayChange,
    places, selectedPlace, onSelectPlace, onRemovePlace, routes, onRemoveRoute, onClearRoutes,
  } = props;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="absolute right-3 top-3 z-20 rounded-md bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white shadow ring-1 ring-white/20 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        Layers &amp; places
      </button>
    );
  }

  const baseDefs = MARS_LAYER_DEFS.filter((d) => d.role === "base");
  const overlayDefs = MARS_LAYER_DEFS.filter((d) => d.role === "overlay");

  return (
    <aside
      aria-label="Map layers and places"
      className="absolute right-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-72 max-w-[calc(100%-5rem)] flex-col overflow-hidden rounded-lg bg-slate-900/90 text-sm text-slate-100 shadow-lg ring-1 ring-white/10 backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h3 className="font-semibold">Layers &amp; places</h3>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close panel"
          className="rounded px-2 text-lg leading-none text-slate-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          ×
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto p-3">
        <section>
          <h4 className={sectionTitle}>Base map</h4>
          <div className="space-y-1">
            {baseDefs.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="mars-base-layer"
                  checked={baseId === d.id}
                  onChange={() => onBaseChange(d.id)}
                  className="mt-1 accent-orange-400"
                />
                <span>
                  {d.title}
                  <span className="block text-xs text-slate-400">{d.subtitle}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h4 className={sectionTitle}>Overlays</h4>
          <div className="space-y-2">
            {overlayDefs.map((d) => {
              const state = overlayState[d.id];
              return (
                <div key={d.id}>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={state.visible}
                      onChange={(e) => onOverlayChange(d.id, { visible: e.target.checked })}
                      className="mt-1 accent-orange-400"
                    />
                    <span>
                      {d.title}
                      <span className="block text-xs text-slate-400">{d.subtitle}</span>
                    </span>
                  </label>
                  {state.visible && (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(state.opacity * 100)}
                      onChange={(e) =>
                        onOverlayChange(d.id, { opacity: Number(e.target.value) / 100 })
                      }
                      aria-label={`${d.title} opacity`}
                      className="mt-1 h-1 w-full accent-orange-400"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Elevation and albedo tiles are opaque, so use the slider to blend them with the base.
          </p>
        </section>

        <section>
          <h4 className={sectionTitle}>Places</h4>
          <ul className="max-h-40 space-y-0.5 overflow-y-auto">
            {places.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelectPlace(p.id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                    selectedPlace?.id === p.id ? "bg-white/10" : ""
                  }`}
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${MARKER_STYLES[p.kind].dot}`} />
                  <span className="truncate">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>

          {selectedPlace && (
            <div className="mt-2 rounded-md bg-white/5 p-2 ring-1 ring-white/10">
              <p className="font-semibold">{selectedPlace.name}</p>
              <p className="text-xs text-slate-400">
                {MARKER_STYLES[selectedPlace.kind].label} ·{" "}
                {formatLonLat(selectedPlace.lon, selectedPlace.lat)}
              </p>
              {selectedPlace.description && (
                <p className="mt-1 text-xs text-slate-300">{selectedPlace.description}</p>
              )}
              {selectedPlace.userAdded && (
                <button
                  type="button"
                  onClick={() => onRemovePlace(selectedPlace.id)}
                  className="mt-2 rounded bg-red-600/80 px-2 py-1 text-xs font-semibold hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  Remove marker
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Routes</h4>
            {routes.length > 0 && (
              <button
                type="button"
                onClick={onClearRoutes}
                className="text-xs text-slate-300 underline hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>
          {routes.length === 0 ? (
            <p className="text-xs text-slate-500">Use the route tool (✏️) to measure a path.</p>
          ) : (
            <ul className="space-y-1">
              {routes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded bg-white/5 px-2 py-1"
                >
                  <span>
                    {r.name}
                    <span className="ml-2 text-xs text-orange-300">{formatKm(r.km)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveRoute(r.id)}
                    aria-label={`Delete ${r.name}`}
                    className="rounded px-1.5 text-slate-300 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}