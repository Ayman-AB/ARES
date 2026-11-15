
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type OLMap from "ol/Map";
import type BaseLayer from "ol/layer/Base";
import type LineString from "ol/geom/LineString";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import Draw from "ol/interaction/Draw";
import { containsCoordinate, type Extent } from "ol/extent";
import { unByKey } from "ol/Observable";

import {
  MARS_DEFAULT_BASE_ID,
  MARS_EXTENT,
  MARS_LAYER_DEFS,
} from "../../config/mars-map";

import { MARS_PLACES, type MarsPlace } from "../../data/mars-features";

import {
  isMarsLocationInRegion,
  type MarsRegion,
} from "../../data/mars-regions";

import {
  pathLengthKm,
  generateAlternativeRoutes,
  type LonLat,
  type RouteInfo,
} from "../../lib/mars-geo";

import MapComponent from "./MapComponent";
import MapSidePanel, { type OverlayState } from "./MapSidePanel";
import MapToolbar, { type MapMode } from "./MapToolbar";
import { createMarsTrekLayer } from "./marsTrekLayer";

import {
  createMarkerLayer,
  createMarsRegionLayer,
  createRouteLayer,
  placeToFeature,
  routeStyle,
  routeToFeature,
} from "./marsVectorLayers";

const NO_LAYERS: BaseLayer[] = [];

type TileLayerT = ReturnType<typeof createMarsTrekLayer>;
type MarkerLayerT = ReturnType<typeof createMarkerLayer>;
type RouteLayerT = ReturnType<typeof createRouteLayer>;

const HINTS: Record<MapMode, string | null> = {
  pan: null,
  marker: "Click the map to drop a marker",
  route: "Click to add points, double-click to finish",
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

interface MarsExplorerProps {
  initialCenter?: LonLat;
  initialZoom?: number;
  initialExtent?: Extent;
  region?: MarsRegion;
}

export default function MarsExplorer({
  initialCenter,
  initialZoom,
  initialExtent,
  region,
}: MarsExplorerProps) {
  const [map, setMap] = useState<OLMap | null>(null);
  const [layers, setLayers] = useState<BaseLayer[]>(NO_LAYERS);
  const [mode, setMode] = useState<MapMode>("pan");
  const [tileError, setTileError] = useState(false);

  const [panelOpen, setPanelOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
  );

  const [baseId, setBaseId] = useState(MARS_DEFAULT_BASE_ID);

  const [overlayState, setOverlayState] = useState<OverlayState>(() =>
    Object.fromEntries(
      MARS_LAYER_DEFS.filter((d) => d.role === "overlay").map((d) => [
        d.id,
        { visible: false, opacity: d.defaultOpacity },
      ]),
    ),
  );

  // Filter the default scientific places according to the selected region.
  const visibleDefaultPlaces = useMemo(
    () =>
      region
        ? MARS_PLACES.filter((place) =>
            isMarsLocationInRegion(region, place.lon, place.lat),
          )
        : MARS_PLACES,
    [region],
  );

  const [places, setPlaces] = useState<MarsPlace[]>(
    () => visibleDefaultPlaces,
  );

  // Manually drawn routes only.
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Route planner selections.
  const [startPlaceId, setStartPlaceId] = useState<string | null>(null);
  const [destinationPlaceIds, setDestinationPlaceIds] = useState<string[]>([]);

  // Find the selected starting point.
  const startPlace = places.find((p) => p.id === startPlaceId) ?? null;

  // Find all selected destinations, preserving their selected order.
  const destinationPlaces = destinationPlaceIds
    .map((id) => places.find((p) => p.id === id))
    .filter((place): place is MarsPlace => place !== undefined);

  // Build the current route:
  // Starting point -> Destination 1 -> Destination 2 -> ...
  const routeCoordinates: LonLat[] = startPlace
    ? [
        [startPlace.lon, startPlace.lat],
        ...destinationPlaces.map(
          (place): LonLat => [place.lon, place.lat],
        ),
      ]
    : [];

  // Generate the current route when a starting point and at least one
  // destination are selected.
  const directRoute: RouteInfo | null =
    startPlace && destinationPlaces.length > 0
      ? {
          id: "selected-multi-destination-route",
          name: "Scientific destinations route",
          coordinates: routeCoordinates,
          km: pathLengthKm(routeCoordinates),
        }
      : null;

  // Generate alternative routes by changing the destination order.
  const alternativeRoutes =
    startPlace && destinationPlaces.length >= 2
      ? generateAlternativeRoutes(startPlace, destinationPlaces)
      : [];

  // Compare the current route with all generated alternatives.
  const comparedRoutes = directRoute
    ? [directRoute, ...alternativeRoutes]
    : [];

  // Find the shortest route among the generated candidates.
  const shortestRoute =
    comparedRoutes.length > 0
      ? comparedRoutes.reduce((shortest, current) =>
          current.km < shortest.km ? current : shortest,
        )
      : null;

  const tileLayersRef = useRef<Record<string, TileLayerT>>({});
  const markerLayerRef = useRef<MarkerLayerT | null>(null);
  const routeLayerRef = useRef<RouteLayerT | null>(null);
  const selectedRef = useRef<string | null>(null);
  const counters = useRef({ marker: 0, route: 0 });

  // Create all layers.
  useEffect(() => {
    const tileLayers: Record<string, TileLayerT> = {};

    MARS_LAYER_DEFS.forEach((def, i) => {
      tileLayers[def.id] = createMarsTrekLayer(def, {
        visible: false,
        zIndex: i,
        ...(def.role === "base"
          ? {
              onTileError: () => setTileError(true),
              onTileLoad: () => setTileError(false),
            }
          : {}),
      });
    });

    // Add the region layer when a region is selected.
    const regionLayer = region ? createMarsRegionLayer(region) : null;

    const routeLayer = createRouteLayer();
    const markerLayer = createMarkerLayer(() => selectedRef.current);

    tileLayersRef.current = tileLayers;
    routeLayerRef.current = routeLayer;
    markerLayerRef.current = markerLayer;

    setLayers([
      ...Object.values(tileLayers),
      ...(regionLayer ? [regionLayer] : []),
      routeLayer,
      markerLayer,
    ]);

    return () => {
      Object.values(tileLayers).forEach((l) => l.dispose());
      regionLayer?.dispose();
      routeLayer.dispose();
      markerLayer.dispose();

      tileLayersRef.current = {};
      routeLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, [region]);

  // Layer visibility and opacity.
  useEffect(() => {
    for (const def of MARS_LAYER_DEFS) {
      const layer = tileLayersRef.current[def.id];
      if (!layer) continue;

      if (def.role === "base") {
        layer.setVisible(def.id === baseId);
      } else {
        const s = overlayState[def.id];
        layer.setVisible(s.visible);
        layer.setOpacity(s.opacity);
      }
    }
  }, [layers, baseId, overlayState]);

  // Markers -> vector source.
  useEffect(() => {
    const source = markerLayerRef.current?.getSource();
    if (!source) return;

    source.clear();
    source.addFeatures(places.map(placeToFeature));
  }, [layers, places]);

  // Manual routes + current planner route + alternative routes -> vector source.
  useEffect(() => {
    const source = routeLayerRef.current?.getSource();
    if (!source) return;

    source.clear();

    const allRoutes = [
      ...routes,
      ...(directRoute ? [directRoute] : []),
      ...alternativeRoutes,
    ];

    source.addFeatures(allRoutes.map(routeToFeature));
  }, [layers, routes, directRoute, alternativeRoutes]);

  // Selection highlight.
  useEffect(() => {
    selectedRef.current = selectedId;
    markerLayerRef.current?.changed();
  }, [layers, selectedId]);

  // Tool mode: cursor, route drawing, double-click zoom.
  useEffect(() => {
    if (!map) return;

    const viewport = map.getViewport();
    if (!viewport) return;

    const dblZoom = map
      .getInteractions()
      .getArray()
      .find((i) => i instanceof DoubleClickZoom);

    viewport.classList.toggle("cursor-crosshair", mode !== "pan");
    dblZoom?.setActive(mode !== "route");

    let draw: Draw | null = null;
    let onKey: ((e: KeyboardEvent) => void) | null = null;

    if (mode === "route") {
      const activeDraw = new Draw({
        type: "LineString",
        style: routeStyle,
      });

      draw = activeDraw;

      activeDraw.on("drawend", (e) => {
        const raw = (e.feature.getGeometry() as LineString).getCoordinates();

        const coordinates = raw.map(
          ([lon, lat]): LonLat => [
            clamp(lon, -180, 180),
            clamp(lat, -90, 90),
          ],
        );

        const n = ++counters.current.route;

        setRoutes((prev) => [
          ...prev,
          {
            id: `route-${n}`,
            name: `Route ${n}`,
            coordinates,
            km: pathLengthKm(coordinates),
          },
        ]);
      });

      map.addInteraction(activeDraw);

      onKey = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement) return;

        if (e.key === "Escape") {
          activeDraw.abortDrawing();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          activeDraw.removeLastPoint();
        }
      };

      window.addEventListener("keydown", onKey);
    }

    return () => {
      if (draw) map.removeInteraction(draw);
      if (onKey) window.removeEventListener("keydown", onKey);

      dblZoom?.setActive(true);
      viewport.classList.remove("cursor-crosshair");
    };
  }, [map, mode]);

  // Click: drop markers or select existing ones.
  useEffect(() => {
    if (!map || mode === "route") return;

    const key = map.on("singleclick", (e) => {
      if (mode === "marker") {
        if (!containsCoordinate(MARS_EXTENT, e.coordinate)) return;

        const n = ++counters.current.marker;

        const place: MarsPlace = {
          id: `custom-${n}`,
          name: `Marker ${n}`,
          kind: "custom",
          lon: e.coordinate[0],
          lat: e.coordinate[1],
          userAdded: true,
        };

        setPlaces((prev) => [...prev, place]);
        setSelectedId(place.id);
        return;
      }

      const hit = map.forEachFeatureAtPixel(e.pixel, (f) => f, {
        layerFilter: (l) => l === markerLayerRef.current,
        hitTolerance: 6,
      });

      setSelectedId(hit ? String(hit.getId()) : null);

      if (hit) setPanelOpen(true);
    });

    return () => unByKey(key);
  }, [map, mode, layers]);

  // Move map to a selected place.
  const flyTo = useCallback(
    (lon: number, lat: number) => {
      const view = map?.getView();
      if (!view) return;

      view.animate({
        center: [lon, lat],
        zoom: Math.max(view.getZoom() ?? 0, 3),
        duration: 600,
      });
    },
    [map],
  );

  const selectPlace = (id: string) => {
    setSelectedId(id);

    const place = places.find((p) => p.id === id);
    if (place) flyTo(place.lon, place.lat);
  };

  // Remove a place and clear any route planner selection using it.
  const removePlace = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== id));

    setSelectedId((cur) => (cur === id ? null : cur));
    setStartPlaceId((cur) => (cur === id ? null : cur));

    setDestinationPlaceIds((prev) =>
      prev.filter((destinationId) => destinationId !== id),
    );
  };

  const hint = HINTS[mode];
  const selectedPlace = places.find((p) => p.id === selectedId) ?? null;

  return (
    <MapComponent
      layers={layers}
      onMapReady={setMap}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      initialExtent={initialExtent}
    >
      <MapToolbar mode={mode} onModeChange={setMode} />

      {places.some((place) => !place.userAdded) && (
        <div className="pointer-events-none absolute left-16 top-3 z-10 flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-slate-950/85 px-3 py-2 text-[10px] text-slate-200 shadow-lg backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/10" />
          <span className="font-semibold uppercase tracking-[0.12em] text-emerald-100/90">
            Science locations
          </span>
          <span className="hidden text-slate-500 sm:inline">
            · click a marker for details
          </span>
        </div>
      )}

      {hint && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 bottom-12 z-10 mx-auto w-fit max-w-[70%] rounded-md bg-orange-500/90 px-3 py-1 text-center text-xs font-medium text-white shadow"
        >
          {hint}
        </div>
      )}

      {tileError && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto w-fit rounded-md bg-red-900/80 px-3 py-1 text-xs text-red-100 ring-1 ring-red-400/30"
        >
          Some Mars tiles failed to load
        </div>
      )}

      <MapSidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        baseId={baseId}
        onBaseChange={setBaseId}
        overlayState={overlayState}
        onOverlayChange={(id, patch) =>
          setOverlayState((prev) => ({
            ...prev,
            [id]: { ...prev[id], ...patch },
          }))
        }
        places={places}
        selectedPlace={selectedPlace}
        onSelectPlace={selectPlace}
        onRemovePlace={removePlace}
        routes={routes}
        onRemoveRoute={(id) =>
          setRoutes((prev) => prev.filter((r) => r.id !== id))
        }
        onClearRoutes={() => setRoutes([])}
        startPlaceId={startPlaceId}
        destinationPlaceIds={destinationPlaceIds}
        onStartPlaceChange={setStartPlaceId}
        onDestinationPlaceIdsChange={setDestinationPlaceIds}
        directRoute={directRoute}
        alternativeRoutes={alternativeRoutes}
        shortestRoute={shortestRoute}
      />
    </MapComponent>
  );
}
