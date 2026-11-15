import { MARS_LAYER_DEFS } from "../../config/mars-map";
import { MARKER_STYLES, type MarsPlace } from "../../data/mars-features";
import { formatKm, formatLonLat, type RouteInfo } from "../../lib/mars-geo";
import LayerSwitcher from "./LayerSwitcher";
import { usePlaceInfo } from "../../lib/place-info";
import ScientificLocationsPanel from "./ScientificLocationsPanel";
import PlaceInfoEditor from "./PlaceInfoEditor";
import SaveDataBar from "./SaveDataBar";
import MarsLocationGallery from "./MarsLocationGallery";
import type { OverlayState } from "./useMarsLayers";

export type { OverlayState };

export interface MapSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseId: string;
  onBaseChange: (id: string) => void;
  baseOpacity: number;
  onBaseOpacityChange: (opacity: number) => void;
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

const sectionTitle = "text-xs font-semibold tracking-wide text-slate-100";

export default function MapSidePanel(props: MapSidePanelProps) {
  const { all: placeInfo } = usePlaceInfo();
  const nameOf = (p: MarsPlace) => placeInfo[p.id]?.name?.trim() || p.name;

  const {
    open, onOpenChange, baseId, onBaseChange, baseOpacity, onBaseOpacityChange, overlayState, onOverlayChange,
    places, selectedPlace, onSelectPlace, onRemovePlace, routes, onRemoveRoute, onClearRoutes,
  } = props;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Open layers and places panel"
        title="Open map console"
        className="absolute right-3 top-3 z-20 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#0b111a]/95 text-orange-200 shadow-[0_12px_35px_rgba(0,0,0,0.4)] backdrop-blur-xl transition hover:border-orange-300/30 hover:bg-[#141d29] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="m12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  const activeBase = MARS_LAYER_DEFS.find((d) => d.role === "base" && d.id === baseId);

  return (
    <aside
      aria-label="Map layers and places"
      className="absolute right-3 top-3 z-20 flex h-[calc(100%-1.5rem)] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080d14]/95 text-sm text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
    >
      <div className="relative overflow-hidden border-b border-white/[0.08] bg-[#101923] px-3 pb-3 pt-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-20 h-44 w-44 rounded-full bg-orange-400/[0.09] blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-orange-300/20 bg-[#201b17] text-orange-200 shadow-inner shadow-orange-200/[0.04]">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M12 3v18M3 12h18M5.64 5.64l12.72 12.72m0-12.72L5.64 18.36"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[#101923] bg-emerald-300" />
            </span>
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-orange-200/65">
                ARES / MARS OPERATIONS
              </p>
              <h3 className="mt-0.5 text-sm font-semibold tracking-tight text-white">
                Map inspector
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close panel"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-black/10 text-lg leading-none text-slate-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            ×
          </button>
        </div>
        <div className="relative mt-3 flex items-end justify-between gap-3 border-t border-white/[0.07] pt-2">
          <div className="min-w-0">
            <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Active imagery
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-200">
              {activeBase?.title ?? "No base layer selected"}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-emerald-300/15 bg-emerald-300/[0.06] px-1.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-200/80">
            Mars surface
          </span>
        </div>
      </div>

      <div className="flex items-center border-b border-white/[0.07] bg-black/10 px-3 py-2">
        <div className="flex flex-1 items-center gap-2.5">
          <span className="font-mono text-base font-medium leading-none text-slate-100">
            {places.length.toString().padStart(2, "0")}
          </span>
          <span className="text-[8px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Places
          </span>
        </div>
        <span className="h-5 w-px bg-white/[0.08]" />
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <span className="font-mono text-base font-medium leading-none text-orange-200">
            {routes.length.toString().padStart(2, "0")}
          </span>
          <span className="text-[8px] font-medium uppercase tracking-[0.16em] text-slate-500">
            Routes
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <LayerSwitcher
          baseId={baseId}
          onBaseChange={onBaseChange}
          baseOpacity={baseOpacity}
          onBaseOpacityChange={onBaseOpacityChange}
          overlayState={overlayState}
          onOverlayChange={onOverlayChange}
        />

        <section>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-orange-300/80">03</span>
            <h4 className={sectionTitle}>Named places</h4>
            <span className="ml-auto font-mono text-[10px] text-slate-500">
              {places.length.toString().padStart(2, "0")} PTS
            </span>
          </div>
          {places.length > 0 ? (
            <ul className="max-h-36 space-y-0.5 overflow-y-auto border-y border-white/[0.06] py-1">
              {places.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlace(p.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
                      selectedPlace?.id === p.id
                        ? "bg-orange-300/[0.08] text-white"
                        : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-100"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ring-4 ring-white/[0.04] ${MARKER_STYLES[p.kind].dot}`}
                    />
                    <span className="truncate text-xs">{nameOf(p)}</span>
                    <span className="ml-auto font-mono text-[9px] text-slate-600">›</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-y border-dashed border-white/[0.08] px-3 py-4 text-center">
              <p className="text-xs text-slate-400">No saved places in this view</p>
              <p className="mt-1 text-[10px] text-slate-600">
                Drop a marker to keep a point of interest.
              </p>
            </div>
          )}

          {selectedPlace && (
            <div className="relative mt-2 overflow-hidden rounded-xl border border-orange-300/15 bg-[#151617] p-3">
              <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-orange-300/70" />
              <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-orange-200/70">
                Selected location
              </p>
              <p className="mt-1.5 text-sm font-semibold text-white">{nameOf(selectedPlace)}</p>
              <p className="mt-1 text-[10px] text-slate-400">
                {MARKER_STYLES[selectedPlace.kind].label} ·{" "}
                {formatLonLat(selectedPlace.lon, selectedPlace.lat)}
              </p>
              {selectedPlace.description && (
                <p className="mt-2 text-xs leading-5 text-slate-300/75">
                  {selectedPlace.description}
                </p>
              )}

              <PlaceInfoEditor
                key={selectedPlace.id}
                placeId={selectedPlace.id}
                originalName={selectedPlace.name}
              />

              {!selectedPlace.userAdded && <MarsLocationGallery place={selectedPlace} />}
              {selectedPlace.userAdded && (
                <button
                  type="button"
                  onClick={() => onRemovePlace(selectedPlace.id)}
                  className="mt-2 text-[10px] font-medium text-red-300/80 underline decoration-red-300/30 underline-offset-2 transition hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  Remove marker
                </button>
              )}
            </div>
          )}
        </section>

        {/* Scientific locations (Jezero): about, geology, importance, photos, modify/delete */}
        <ScientificLocationsPanel />

        <section className="pb-1">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-orange-300/80">05</span>
            <h4 className={sectionTitle}>Measured routes</h4>
            {routes.length > 0 && (
              <button
                type="button"
                onClick={onClearRoutes}
                className="ml-auto rounded-md px-2 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500 transition hover:bg-white/[0.05] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                Clear all
              </button>
            )}
          </div>
          {routes.length === 0 ? (
            <div className="border-y border-dashed border-white/[0.08] px-3 py-4 text-center">
              <p className="text-xs text-slate-400">No routes measured</p>
              <p className="mt-1 text-[10px] text-slate-600">
                Choose the route tool to trace a path.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
              {routes.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-200">{r.name}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-orange-200/80">
                      DISTANCE / {formatKm(r.km)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveRoute(r.id)}
                    aria-label={`Delete ${r.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-400/10 hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SaveDataBar />
      </div>
    </aside>
  );
}