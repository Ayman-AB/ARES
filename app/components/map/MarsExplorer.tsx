
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type OLMap from "ol/Map";
import type BaseLayer from "ol/layer/Base";
import type LineString from "ol/geom/LineString";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom";
import Draw from "ol/interaction/Draw";
import { containsCoordinate } from "ol/extent";
import { unByKey } from "ol/Observable";

import { MARS_EXTENT } from "../../config/mars-map";
import { MARS_PLACES, type MarsPlace } from "../../data/mars-features";
import { isMarsLocationInRegion, type MarsRegion } from "../../data/mars-regions";
import { fetchMarsGeologyFeatures } from "../../data/mars-geology";
import { lineStringLengthM, type LonLat, type RouteInfo } from "../../lib/mars-geo";

import MapComponent from "./MapComponent";
import MapSidePanel from "./MapSidePanel";
import MapToolbar, { type MapMode } from "./MapToolbar";
import { useMarsLayers, type OverlayState } from "./useMarsLayers";
import {
  createMarkerLayer,
  createRouteLayer,
  createMarsRegionLayer,
  createMarsGeologyLayer,
  getMarsGeologyLegendItems,
  placeToFeature,
  routeStyle,
  routeToFeature,
} from "./marsVectorLayers";
import MapLegend from "./MapLegend";

const NO_LAYERS: BaseLayer[] = [];

type MarkerLayerT = ReturnType<typeof createMarkerLayer>;
type RouteLayerT = ReturnType<typeof createRouteLayer>;
type GeologyLayerT = ReturnType<typeof createMarsGeologyLayer>;

interface MarsExplorerProps {
  region: MarsRegion;
  initialCenter: [number, number];
  initialZoom: number;
  initialExtent: [number, number, number, number];
}

const HINTS: Record<MapMode, string | null> = {
  pan: null,
  marker: "Click the map to drop a marker",
  route: "Click to add points, double-click to finish",
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export default function MarsExplorer({
  region,
  initialCenter,
  initialZoom,
  initialExtent,
}: MarsExplorerProps) {
  const [map, setMap] = useState<OLMap | null>(null);
  const [layers, setLayers] = useState<BaseLayer[]>(NO_LAYERS);
  const [mode, setMode] = useState<MapMode>("pan");
  const layerControls = useMarsLayers();
  const { tileLayers, tileError } = layerControls;
  const [panelOpen, setPanelOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
  );
  const visibleDefaultPlaces = useMemo(
    () =>
      region
        ? MARS_PLACES.filter((place) =>
            isMarsLocationInRegion(region, place.lon, place.lat),
          )
        : MARS_PLACES,
    [region],
  );
  const [places, setPlaces] = useState<MarsPlace[]>(() => visibleDefaultPlaces);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [geologyLoading, setGeologyLoading] = useState(true);
  const [geologyError, setGeologyError] = useState<string | null>(null);
  const [geologyLegendItems, setGeologyLegendItems] = useState<
    ReturnType<typeof getMarsGeologyLegendItems>
  >([]);
  const markerLayerRef = useRef<MarkerLayerT | null>(null);
  const routeLayerRef = useRef<RouteLayerT | null>(null);

  const selectedRef = useRef<string | null>(null);
  const counters = useRef({ marker: 0, route: 0 });

  // Vector layers are owned here; NASA tile layers come from useMarsLayers.
  useEffect(() => {
    if (tileLayers.length === 0) return;
    const regionLayer = region ? createMarsRegionLayer(region) : null;
    const routeLayer = createRouteLayer();
    const markerLayer = createMarkerLayer(() => selectedRef.current);

    routeLayerRef.current = routeLayer;
    markerLayerRef.current = markerLayer;
    setLayers([...tileLayers, ...(regionLayer ? [regionLayer] : []), routeLayer, markerLayer]);

    return () => {
      regionLayer?.dispose();
      routeLayer.dispose();
      markerLayer.dispose();
      routeLayerRef.current = null;
      markerLayerRef.current = null;
    };
  }, [region, tileLayers]);

  // Load the Jezero geology layer once the NASA tile layers are ready.
  useEffect(() => {
    if (tileLayers.length === 0) return;

    let cancelled = false;
    let geologyLayer: GeologyLayerT | null = null;

    async function loadGeology() {
      try {
        const features = await fetchMarsGeologyFeatures();

        if (cancelled) return;

        if (features.length === 0) {
          throw new Error("No geological formations were found.");
        }

        setGeologyLegendItems(getMarsGeologyLegendItems(features));
        geologyLayer = createMarsGeologyLayer(features);
        setLayers((previous) =>
          previous.includes(geologyLayer!) ? previous : [...previous, geologyLayer!],
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Geology loading error:", error);
        setGeologyError(
          error instanceof Error
            ? error.message
            : "Unable to load geological formations.",
        );
      } finally {
        if (!cancelled) {
          setGeologyLoading(false);
        }
      }
    }

    loadGeology();

    return () => {
      cancelled = true;
      geologyLayer?.dispose();
    };
  }, [tileLayers]);

  // --------------------------------------------------
  // 4. Markers -> vector source
  // --------------------------------------------------

  useEffect(() => {
    const source = markerLayerRef.current?.getSource();

    if (!source) return;

    source.clear();
    source.addFeatures(places.map(placeToFeature));
  }, [layers, places]);

  // --------------------------------------------------
  // 5. Routes -> vector source
  // --------------------------------------------------

  useEffect(() => {
    const source = routeLayerRef.current?.getSource();

    if (!source) return;

    source.clear();
    source.addFeatures(routes.map(routeToFeature));
  }, [layers, routes]);

  // --------------------------------------------------
  // 6. Marker selection highlight
  // --------------------------------------------------

  useEffect(() => {
    selectedRef.current = selectedId;
    markerLayerRef.current?.changed();
  }, [layers, selectedId]);

  // --------------------------------------------------
  // 7. Tool mode: cursor, route drawing, double-click zoom
  // --------------------------------------------------

  useEffect(() => {
    if (!map) return;

    const viewport = map.getViewport();

    if (!viewport) return;

    const dblZoom = map
      .getInteractions()
      .getArray()
      .find(
        (interaction) => interaction instanceof DoubleClickZoom,
      );

    viewport.classList.toggle("cursor-crosshair", mode !== "pan");
    dblZoom?.setActive(mode !== "route");

    let draw: Draw | null = null;
    let onKey: ((event: KeyboardEvent) => void) | null = null;

    if (mode === "route") {
      const activeDraw = new Draw({
        type: "LineString",
        style: routeStyle,
      });

      draw = activeDraw;
      activeDraw.on("drawend", (e) => {
        const geometry = e.feature.getGeometry() as LineString;
        const raw = geometry.getCoordinates();
        const coordinates = raw.map(
          ([lon, lat]): LonLat => [
            clamp(lon, -180, 180),
            clamp(lat, -90, 90),
          ],
        );

        const n = ++counters.current.route;

        setRoutes((prev) => [
          ...prev,
          { id: `route-${n}`, name: `Route ${n}`, coordinates, km: lineStringLengthM(geometry) / 1000 },
        ]);
      });

      map.addInteraction(activeDraw);

      onKey = (event: KeyboardEvent) => {
        if (event.target instanceof HTMLInputElement) return;

        if (event.key === "Escape") {
          activeDraw.abortDrawing();
        } else if (event.key === "Backspace") {
          event.preventDefault();
          activeDraw.removeLastPoint();
        }
      };

      window.addEventListener("keydown", onKey);
    }

    return () => {
      if (draw) map.removeInteraction(draw);

      if (onKey) {
        window.removeEventListener("keydown", onKey);
      }

      dblZoom?.setActive(true);
      viewport.classList.remove("cursor-crosshair");
    };
  }, [map, mode]);

  // --------------------------------------------------
  // 8. Map click: add markers or select existing markers
  // --------------------------------------------------

  useEffect(() => {
    if (!map || mode === "route") return;

    const key = map.on("singleclick", (event) => {
      if (mode === "marker") {
        if (!containsCoordinate(MARS_EXTENT, event.coordinate)) {
          return;
        }

        const n = ++counters.current.marker;

        const place: MarsPlace = {
          id: `custom-${n}`,
          name: `Marker ${n}`,
          kind: "custom",
          lon: event.coordinate[0],
          lat: event.coordinate[1],
          userAdded: true,
        };

        setPlaces((prev) => [...prev, place]);
        setSelectedId(place.id);

        return;
      }

      const hit = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature,
        {
          layerFilter: (layer) =>
            layer === markerLayerRef.current,
          hitTolerance: 6,
        },
      );

      setSelectedId(hit ? String(hit.getId()) : null);
    });

    return () => unByKey(key);
  }, [map, mode, layers]);

  // --------------------------------------------------
  // 9. Fly to coordinates
  // --------------------------------------------------

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

  // --------------------------------------------------
  // 10. Select a place
  // --------------------------------------------------

  const selectPlace = (id: string) => {
    setSelectedId(id);

    const place = places.find((item) => item.id === id);

    if (place) {
      flyTo(place.lon, place.lat);
    }
  };

  // --------------------------------------------------
  // 11. Remove a place
  // --------------------------------------------------

  const removePlace = (id: string) => {
    setPlaces((prev) =>
      prev.filter((place) => place.id !== id),
    );

    setSelectedId((current) =>
      current === id ? null : current,
    );
  };

  const changeOverlay = (id: string, patch: Partial<OverlayState[string]>) => {
    layerControls.setOverlay(id, patch);
  };

  const hint = HINTS[mode];

  const selectedPlace =
    places.find((place) => place.id === selectedId) ?? null;

  // --------------------------------------------------
  // 12. Render the map
  // --------------------------------------------------

  return (
    <MapComponent
      layers={layers}
      onMapReady={setMap}
      initialCenter={initialCenter}
      initialZoom={initialZoom}
      initialExtent={initialExtent}
    >
      <MapToolbar
        mode={mode}
        onModeChange={setMode}
      />

      <MapLegend
        baseId={layerControls.baseId}
        overlayState={layerControls.overlayState}
        geologyItems={geologyLegendItems}
        geologyLoading={geologyLoading}
        geologyError={geologyError}
        showJezeroGeology
      />

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
        baseId={layerControls.baseId}
        onBaseChange={layerControls.setBaseId}
        baseOpacity={layerControls.baseOpacity}
        onBaseOpacityChange={layerControls.setBaseOpacity}
        overlayState={layerControls.overlayState}
        onOverlayChange={changeOverlay}
        places={places}
        selectedPlace={selectedPlace}
        onSelectPlace={selectPlace}
        onRemovePlace={removePlace}
        routes={routes}
        onRemoveRoute={(id) =>
          setRoutes((prev) =>
            prev.filter((route) => route.id !== id),
          )
        }
        onClearRoutes={() => setRoutes([])}
      />
    </MapComponent>
  );
}
