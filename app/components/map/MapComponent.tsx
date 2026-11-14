"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Map from "ol/Map";
import View from "ol/View";
import BaseLayer from "ol/layer/Base";
import { defaults as defaultControls } from "ol/control/defaults";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import "ol/ol.css";

import {
  MARS_DEFAULT_BASE_ID,
  MARS_EXTENT,
  MARS_LAYER_DEFS,
  MARS_PROJECTION,
  MARS_TILE_GRID,
  MARS_TREK_WMTS,
  MARS_VIEW_DEFAULTS,
} from "../../config/mars-map";
import { createMarsTrekLayer } from "./marsTrekLayer";

export interface MapComponentProps {
  className?: string;
  /** Layers to display (stable array). Omit to show the default Mars Trek base layer. */
  layers?: BaseLayer[];
  /** Called once the map exists so features (markers, routes) can attach to it. */
  onMapReady?: (map: Map) => void;
  /** Imagery credit shown bottom-right. */
  attribution?: string;
  /** Absolutely-positioned UI rendered on top of the map. */
  children?: ReactNode;
}

export default function MapComponent({
  className = "",
  layers,
  onMapReady,
  attribution = MARS_TREK_WMTS.attribution,
  children,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const [tileError, setTileError] = useState(false);
  const [status, setStatus] = useState({
    zoom: MARS_VIEW_DEFAULTS.zoom,
    lon: MARS_VIEW_DEFAULTS.center[0],
    lat: MARS_VIEW_DEFAULTS.center[1],
  });

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  // Create and destroy the map
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new View({
      projection: MARS_PROJECTION,
      resolutions: MARS_TILE_GRID.resolutions, // zoom N === TileMatrix N
      center: MARS_VIEW_DEFAULTS.center,
      zoom: MARS_VIEW_DEFAULTS.zoom,
      minZoom: MARS_VIEW_DEFAULTS.minZoom,
      maxZoom: MARS_VIEW_DEFAULTS.maxZoom,
      extent: MARS_EXTENT,
    });

    const map = new Map({
      target: containerRef.current,
      layers: [],
      view,
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }),
      interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false }),
    });

    const updateStatus = () => {
      const c = view.getCenter();
      setStatus({ zoom: view.getZoom() ?? 0, lon: c?.[0] ?? 0, lat: c?.[1] ?? 0 });
    };
    map.on("moveend", updateStatus);

    mapRef.current = map;
    onMapReadyRef.current?.(map);

    return () => {
      map.un("moveend", updateStatus);
      map.setTarget(undefined);
      map.dispose();
      mapRef.current = null;
    };
  }, []);

  // Sync layers (default = Mars Trek base layer, created and disposed here)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const collection = map.getLayers();
    const owned = layers === undefined;
    const defaultDef = MARS_LAYER_DEFS.find((d) => d.id === MARS_DEFAULT_BASE_ID);
    const active: BaseLayer[] = owned
      ? defaultDef
        ? [
            createMarsTrekLayer(defaultDef, {
              onTileError: () => setTileError(true),
              onTileLoad: () => setTileError(false),
            }),
          ]
        : []
      : layers;

    collection.clear();
    active.forEach((layer) => collection.push(layer));

    return () => {
      collection.clear();
      if (owned) active.forEach((layer) => layer.dispose());
    };
  }, [layers]);

  const zoomBy = (delta: number) => {
    const view = mapRef.current?.getView();
    if (!view) return;
    const current = view.getZoom() ?? MARS_VIEW_DEFAULTS.zoom;
    view.animate({ zoom: current + delta, duration: 250 });
  };

  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-md bg-slate-900/90 text-xl font-semibold text-white shadow ring-1 ring-white/20 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-95";

  return (
    <div
      className={`relative h-[60vh] min-h-[320px] w-full overflow-hidden rounded-lg bg-slate-950 ring-1 ring-white/10 md:h-[75vh] ${className}`}
    >
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Interactive Mars map"
      />

      {/* Zoom controls */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in" className={buttonClass}>
          +
        </button>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out" className={buttonClass}>
          −
        </button>
      </div>

      {/* Status readout */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-slate-900/80 px-2 py-1 font-mono text-xs text-slate-200 ring-1 ring-white/10">
        zoom {status.zoom.toFixed(1)} · lon {status.lon.toFixed(2)}° · lat {status.lat.toFixed(2)}°
      </div>

      {/* Imagery credit */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[55%] rounded-md bg-slate-900/80 px-2 py-1 text-right text-[10px] leading-tight text-slate-300 ring-1 ring-white/10">
        {attribution}
      </div>

      {/* Tile loading problem (default layer only) */}
      {tileError && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto w-fit rounded-md bg-red-900/80 px-3 py-1 text-xs text-red-100 ring-1 ring-red-400/30"
        >
          Some Mars tiles failed to load
        </div>
      )}

      {children}
    </div>
  );
}