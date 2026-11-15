import { useState } from "react";
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
  onOverlayChange: (
    id: string,
    patch: Partial<OverlayState[string]>,
  ) => void;
  places: MarsPlace[];
  selectedPlace: MarsPlace | null;
  onSelectPlace: (id: string) => void;
  onRemovePlace: (id: string) => void;
  routes: RouteInfo[];
  onRemoveRoute: (id: string) => void;
  onClearRoutes: () => void;

  // Route planner properties
  startPlaceId: string | null;
  destinationPlaceIds: string[];
  onStartPlaceChange: (id: string | null) => void;
  onDestinationPlaceIdsChange: (ids: string[]) => void;
  directRoute: RouteInfo | null;

  // Alternative route comparison properties
  alternativeRoutes: RouteInfo[];
  shortestRoute: RouteInfo | null;
}

const sectionTitle = "text-xs font-semibold tracking-wide text-slate-100";

export default function MapSidePanel(props: MapSidePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { all: placeInfo } = usePlaceInfo();
  const nameOf = (p: MarsPlace) => placeInfo[p.id]?.name?.trim() || p.name;

  const {
    open, onOpenChange, baseId, onBaseChange, baseOpacity, onBaseOpacityChange, overlayState, onOverlayChange,
    places, selectedPlace, onSelectPlace, onRemovePlace, routes, onRemoveRoute, onClearRoutes,
    startPlaceId, destinationPlaceIds, onStartPlaceChange,
    onDestinationPlaceIdsChange, directRoute, alternativeRoutes, shortestRoute,
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
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
        >
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

  // Find the selected starting point.
  const startPlace = places.find((p) => p.id === startPlaceId) ?? null;

  // Find all selected destinations in their selected order.
  const destinationPlaces = destinationPlaceIds
    .map((id) => places.find((p) => p.id === id))
    .filter((place): place is MarsPlace => place !== undefined);

  // All planner routes available for comparison.
  const comparisonRoutes = directRoute
    ? [directRoute, ...alternativeRoutes]
    : [];

  // Add or remove a destination.
  const toggleDestination = (id: string, checked: boolean) => {
    if (checked) {
      if (id === startPlaceId || destinationPlaceIds.includes(id)) return;

      onDestinationPlaceIdsChange([...destinationPlaceIds, id]);
    } else {
      onDestinationPlaceIdsChange(
        destinationPlaceIds.filter((destinationId) => destinationId !== id),
      );
    }
  };

  // Change the order of destinations.
  const moveDestination = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= destinationPlaceIds.length) return;

    const updatedIds = [...destinationPlaceIds];

    [updatedIds[index], updatedIds[newIndex]] = [
      updatedIds[newIndex],
      updatedIds[index],
    ];

    onDestinationPlaceIdsChange(updatedIds);
  };

  // If a selected destination becomes the starting point,
  // remove it from the destination list.
  const changeStartPlace = (id: string) => {
    onStartPlaceChange(id || null);

    onDestinationPlaceIdsChange(
      destinationPlaceIds.filter((destinationId) => destinationId !== id),
    );
  };

  return (
    <aside
      id="map-inspector-panel"
      aria-label="Map layers and places"
      className={`absolute right-3 top-3 z-20 flex h-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080d14]/95 text-sm text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-[width] duration-300 ease-in-out ${
        expanded
          ? "w-[calc(100vw-1.5rem)] sm:w-[80vw]"
          : "w-[min(22rem,calc(100vw-1.5rem))]"
      }`}
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
                {expanded ? "Map workspace" : "Map inspector"}
              </h3>
            </div>
          </div>
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "Restore panel width" : "Expand panel"}
              aria-expanded={expanded}
              aria-controls="map-inspector-panel"
              title={expanded ? "Restore panel width" : "Expand panel"}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-black/10 text-slate-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d={
                    expanded
                      ? "M8 3v5H3m13-5v5h5M3 16h5v5m8-5h5v5"
                      : "M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3"
                  }
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                onOpenChange(false);
              }}
              aria-label="Close panel"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-black/10 text-lg leading-none text-slate-400 transition hover:border-white/15 hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              ×
            </button>
          </div>
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

      <div
        className={`min-h-0 flex-1 overflow-y-auto ${
          expanded
            ? "grid content-start grid-cols-1 gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-2 lg:gap-6"
            : "flex flex-col px-3 py-3"
        }`}
        style={{ overflowAnchor: "none" }}
      >
        <div
          className={`min-w-0 space-y-4 ${
            expanded ? "rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4" : ""
          }`}
        >
          {expanded && (
            <div className="border-b border-white/[0.07] pb-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-orange-200/70">
                Map context
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Imagery and selected places</p>
            </div>
          )}
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
            <span className="font-mono text-[10px] text-orange-300/80">
              03
            </span>
            <h4 className={sectionTitle}>Route planner</h4>
          </div>

          {/* Starting point */}
          <div className="mb-4">
            <label
              htmlFor="start-place"
              className="mb-1 block text-xs text-slate-300"
            >
              Starting point
            </label>

            <select
              id="start-place"
              value={startPlaceId ?? ""}
              onChange={(e) => changeStartPlace(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-800 p-2 text-sm text-white"
            >
              <option value="">Choose starting point</option>

              {places
                .filter((p) => !destinationPlaceIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {nameOf(p)}
                  </option>
                ))}
            </select>
          </div>

          {/* Multiple destinations */}
          <div>
            <p className="mb-1 text-xs text-slate-300">
              Scientific destinations
            </p>

            <p className="mb-2 text-[10px] leading-4 text-slate-500">
              Select one or more destinations. They will be added to the route
              in the order you select them.
            </p>

            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-slate-900/70 p-2">
              {places.filter((p) => p.id !== startPlaceId).length > 0 ? (
                places
                  .filter((p) => p.id !== startPlaceId)
                  .map((p) => {
                    const checked = destinationPlaceIds.includes(p.id);

                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition ${
                          checked
                            ? "bg-orange-300/10 text-orange-100"
                            : "text-slate-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleDestination(p.id, e.target.checked)
                          }
                          className="h-3.5 w-3.5 accent-orange-400"
                        />

                        <span className="min-w-0 flex-1 truncate text-xs">
                          {nameOf(p)}
                        </span>

                        {checked && (
                          <span className="text-[9px] text-orange-300">
                            Selected
                          </span>
                        )}
                      </label>
                    );
                  })
              ) : (
                <p className="py-2 text-center text-[10px] text-slate-500">
                  No other places available.
                </p>
              )}
            </div>
          </div>

          {/* Selected destinations and ordering */}
          {destinationPlaces.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-200">
                  Route order
                </p>

                <button
                  type="button"
                  onClick={() => onDestinationPlaceIdsChange([])}
                  className="text-[10px] text-slate-500 underline hover:text-red-300"
                >
                  Clear destinations
                </button>
              </div>

              <div className="space-y-1">
                {destinationPlaces.map((place, index) => (
                  <div
                    key={place.id}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-300/10 font-mono text-[10px] text-orange-200">
                      {index + 1}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
                      {nameOf(place)}
                    </span>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveDestination(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${nameOf(place)} up`}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() => moveDestination(index, 1)}
                        disabled={index === destinationPlaces.length - 1}
                        aria-label={`Move ${nameOf(place)} down`}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleDestination(place.id, false)}
                        aria-label={`Remove ${nameOf(place)}`}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complete route information */}
          {directRoute && startPlace && (
            <div className="mt-3 space-y-3 rounded-xl border border-orange-300/15 bg-white/[0.035] p-3">
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Total route distance
                </p>

                <p className="mt-1 text-xl font-bold text-orange-400">
                  {formatKm(directRoute.km)}
                </p>

                <p className="mt-1 text-[10px] text-slate-500">
                  {destinationPlaces.length} destination
                  {destinationPlaces.length > 1 ? "s" : ""} selected
                </p>
              </div>

              <div className="border-t border-white/[0.08] pt-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Route coordinates
                </p>

                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-[10px] font-medium text-white">
                      Start: {nameOf(startPlace)}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-orange-200/80">
                      {formatLonLat(startPlace.lon, startPlace.lat)}
                    </p>
                    <p className="font-mono text-[9px] text-slate-500">
                      Lon: {startPlace.lon.toFixed(2)}°, Lat:{" "}
                      {startPlace.lat.toFixed(2)}°
                    </p>
                  </div>

                  {destinationPlaces.map((place, index) => (
                    <div key={place.id}>
                      <p className="text-[10px] font-medium text-white">
                        Destination {index + 1}: {nameOf(place)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-orange-200/80">
                        {formatLonLat(place.lon, place.lat)}
                      </p>
                      <p className="font-mono text-[9px] text-slate-500">
                        Lon: {place.lon.toFixed(2)}°, Lat:{" "}
                        {place.lat.toFixed(2)}°
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="border-t border-white/[0.08] pt-2 text-[9px] leading-4 text-slate-500">
                The total distance is calculated by adding the great-circle
                distances between consecutive locations on the Martian
                surface.
              </p>
            </div>
          )}

          {/* 4. Route comparison */}
          {directRoute && (
            <div className="mt-3 rounded-xl border border-sky-300/15 bg-sky-300/[0.035] p-3">
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-100">
                  Route comparison
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Compare the current itinerary with the generated alternatives.
                </p>
              </div>

              <div className="space-y-2">
                {comparisonRoutes.map((route) => {
                  const isCurrentRoute = route.id === directRoute.id;
                  const isShortest = route.id === shortestRoute?.id;

                  return (
                    <div
                      key={route.id}
                      className={`rounded-lg border p-2.5 ${
                        isShortest
                          ? "border-emerald-300/30 bg-emerald-300/[0.07]"
                          : "border-white/[0.07] bg-black/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              isCurrentRoute
                                ? "bg-emerald-400"
                                : "bg-sky-400"
                            }`}
                          />
                          <span className="truncate text-xs font-medium text-slate-200">
                            {isCurrentRoute
                              ? "Current route"
                              : route.name}
                          </span>
                        </div>

                        {isShortest && (
                          <span className="shrink-0 rounded-md bg-emerald-300/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-emerald-300">
                            Shortest
                          </span>
                        )}
                      </div>

                      <p className="mt-2 font-mono text-sm font-semibold text-white">
                        {formatKm(route.km)}
                      </p>

                      {isCurrentRoute && (
                        <p className="mt-1 text-[9px] text-slate-500">
                          Follows your selected destination order.
                        </p>
                      )}

                      {isShortest && (
                        <p className="mt-1 text-[9px] text-emerald-300/80">
                          Shortest among the routes currently compared.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {alternativeRoutes.length === 0 && (
                <p className="mt-3 text-[10px] leading-4 text-slate-500">
                  Select at least two destinations to generate alternative
                  routes and compare their distances.
                </p>
              )}

              <p className="mt-3 border-t border-white/[0.08] pt-2 text-[9px] leading-4 text-slate-500">
                Alternative routes are generated by swapping destination
                positions. The shortest result is selected from the current
                route and the generated alternatives; it is not guaranteed
                to be the global shortest possible route.
              </p>
            </div>
          )}

          {!startPlace && (
            <p className="mt-3 text-[10px] text-slate-500">
              Choose a starting point to begin planning your route.
            </p>
          )}

          {startPlace && destinationPlaces.length === 0 && (
            <p className="mt-3 text-[10px] text-slate-500">
              Select at least one scientific destination to calculate the
              route.
            </p>
          )}
        </section>

        {/* 5. Places */}
        <section>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-orange-300/80">
              04
            </span>
            <h4 className={sectionTitle}>Named places</h4>
            <span className="ml-auto font-mono text-[10px] text-slate-500">
              {places.length.toString().padStart(2, "0")} PTS
            </span>
          </div>

          {places.length > 0 ? (
            <ul
              className={`${
                expanded ? "max-h-64" : "max-h-36"
              } space-y-0.5 overflow-y-auto border-y border-white/[0.06] py-1`}
            >
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
              <p className="text-xs text-slate-400">
                No saved places in this view
              </p>
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
        </div>

        <div
          className={`min-w-0 space-y-4 ${
            expanded
              ? "rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
              : "mt-4"
          }`}
        >
          {expanded && (
            <div className="border-b border-white/[0.07] pb-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-orange-200/70">
                Research & operations
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Scientific details and measured routes
              </p>
            </div>
          )}
          <ScientificLocationsPanel expanded={expanded} />

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
              <p className="text-xs text-slate-400">
                No routes measured
              </p>
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
                    <span className="block truncate text-xs font-medium text-slate-200">
                      {r.name}
                    </span>
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
        </div>

        <div className={expanded ? "lg:col-span-2" : "mt-4"}>
          <SaveDataBar />
        </div>
      </div>
    </aside>
  );
}
