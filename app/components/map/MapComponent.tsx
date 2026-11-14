"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Map from "ol/Map";
import View from "ol/View";
import BaseLayer from "ol/layer/Base";
import type { Extent } from "ol/extent";
import { containsCoordinate } from "ol/extent";
import { defaults as defaultControls } from "ol/control/defaults";
import { defaults as defaultInteractions } from "ol/interaction/defaults";
import { unByKey } from "ol/Observable";
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
import { formatLonLat } from "../../lib/mars-geo";
import { createMarsTrekLayer } from "./marsTrekLayer";

export interface MapComponentProps {
  className?: string;
  /** Height utilities for the map frame. */
  heightClassName?: string;
  /** Read once when the map is created. */
  initialCenter?: [number, number];
  /** Read once when the map is created. */
  initialZoom?: number;
  /** Read once when the map is created; wins over center/zoom. */
  initialExtent?: Extent;
  /** Layers to display (stable array). Omit to show the default Mars Trek base layer. */
  layers?: BaseLayer[];
  /** Called once the map exists so features (markers, routes) can attach to it. */
  onMapReady?: (map: Map) => void;
  /** Imagery credit shown bottom-right. */
  attribution?: string;
  /** Extra text for the cursor HUD, e.g. a simulated elevation at that point. */
  describeCoordinate?: (lon: number, lat: number) => string | null;
  /** Absolutely-positioned UI rendered on top of the map. */
  children?: ReactNode;
}

interface CursorState {
  lon: number;
  lat: number;
  extra: string | null;
}

export default function MapComponent({
  className = "",
  heightClassName = "h-[60vh] min-h-[320px] md:h-[75vh]",
  initialCenter = MARS_VIEW_DEFAULTS.center,
  initialZoom = MARS_VIEW_DEFAULTS.zoom,
  initialExtent,
  layers,
  onMapReady,
  attribution = MARS_TREK_WMTS.attribution,
  describeCoordinate,
  children,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const describeRef = useRef(describeCoordinate);
  const initialRef = useRef({ initialCenter, initialZoom, initialExtent });
  const [tileError, setTileError] = useState(false);
  const [cursor, setCursor] = useState<CursorState | null>(null);
  const [status, setStatus] = useState({
    zoom: initialZoom,
    metersPerPixel: (MARS_TILE_GRID.resolutions[0] / 2 ** initialZoom) * MARS_PROJECTION.getMetersPerUnit()!,
  });

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
    describeRef.current = describeCoordinate;
  }, [onMapReady, describeCoordinate]);

  // Create and destroy the map (once per mount)
  useEffect(() => {
    if (!containerRef.current) return;
    const { initialCenter: center, initialZoom: zoom, initialExtent: extent } = initialRef.current;

    const view = new View({
      projection: MARS_PROJECTION,
      resolutions: MARS_TILE_GRID.resolutions, // zoom N === TileMatrix N
      center,
      zoom,
      minZoom: MARS_VIEW_DEFAULTS.minZoom,
      maxZoom: MARS_VIEW_DEFAULTS.maxZoom,
      extent: MARS_EXTENT,
      constrainOnlyCenter: true,
      constrainResolution: false, // fractional zoom → smooth wheel / pinch
      enableRotation: false,
    });

    const map = new Map({
      target: containerRef.current,
      layers: [],
      view,
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }),
      interactions: defaultInteractions({
        altShiftDragRotate: false,
        pinchRotate: false,
        zoomDuration: 220,
      }),
      moveTolerance: 2,
    });

    if (extent) {
      const fit = () => {
        const size = map.getSize();
        if (size) view.fit(extent, { size, padding: [40, 40, 40, 40], maxZoom: 11 });
      };
      if (map.getSize()) fit();
      else map.once("change:size", fit);
    }

    const mpu = MARS_PROJECTION.getMetersPerUnit() ?? 1;
    const updateStatus = () => {
      setStatus({ zoom: view.getZoom() ?? 0, metersPerPixel: (view.getResolution() ?? 0) * mpu });
    };
    map.on("moveend", updateStatus);

    // Live cursor coordinates, throttled to one React update per animation frame.
    let frame = 0;
    let lastPixel: number[] | null = null;
    const flush = () => {
      frame = 0;
      if (!lastPixel) return;
      const coord = map.getCoordinateFromPixel(lastPixel);
      if (!coord || !containsCoordinate(MARS_EXTENT, coord)) {
        setCursor(null);
        return;
      }
      const [lon, lat] = coord;
      setCursor({ lon, lat, extra: describeRef.current?.(lon, lat) ?? null });
    };
    const pointerKey = map.on("pointermove", (e) => {
      if (e.dragging) return;
      lastPixel = e.pixel;
      if (!frame) frame = requestAnimationFrame(flush);
    });
    const onLeave = () => {
      lastPixel = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      setCursor(null);
    };
    const viewport = map.getViewport();
    viewport.addEventListener("pointerleave", onLeave);

    mapRef.current = map;
    onMapReadyRef.current?.(map);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener("pointerleave", onLeave);
      unByKey(pointerKey);
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
    view.animate({ zoom: Math.round(current) + delta, duration: 250 });
  };

  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-md bg-slate-900/90 text-xl font-semibold text-white shadow ring-1 ring-white/20 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-95";

  const mpp = status.metersPerPixel;
  const scaleLabel = mpp >= 1000 ? `${(mpp / 1000).toFixed(1)} km/px` : `${Math.round(mpp)} m/px`;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg bg-slate-950 ring-1 ring-white/10 ${heightClassName} ${className}`}
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

      {/* Cursor + view HUD */}
      <div
        aria-live="off"
        className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1 font-mono text-[11px] text-slate-200"
      >
        <div className="flex items-center gap-2 rounded-md bg-slate-900/85 px-2 py-1 ring-1 ring-white/10 backdrop-blur">
          <span
            className={`h-1.5 w-1.5 rounded-full ${cursor ? "bg-emerald-400" : "bg-slate-600"}`}
          />
          <span className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Cursor</span>
          <span className="min-w-[13.5rem] tabular-nums">
            {cursor ? formatLonLat(cursor.lon, cursor.lat, 4) : "— move over the map —"}
          </span>
          {cursor?.extra && <span className="text-orange-200/90">· {cursor.extra}</span>}
        </div>
        <div className="w-fit rounded-md bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/10">
          z {status.zoom.toFixed(1)} · {scaleLabel}
        </div>
      </div>

      {/* Imagery credit */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[45%] rounded-md bg-slate-900/80 px-2 py-1 text-right text-[10px] leading-tight text-slate-300 ring-1 ring-white/10">
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
