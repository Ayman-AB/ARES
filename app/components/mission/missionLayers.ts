import Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from "ol/style";

import type { JezeroSite, Mission } from "../../data/jezero-missions";
import { HAZARD_ZONES, hazardZoneRings, type HazardKind } from "../../lib/jezero-terrain";
import type { LonLat } from "../../lib/mars-geo";
import type { RouteSegment, Severity } from "../../lib/mission-sim";

export const SEVERITY_HEX: Record<Severity, string> = {
  0: "#4ade80",
  1: "#fbbf24",
  2: "#f87171",
};

const casing = new Stroke({ color: "rgba(2,6,23,0.85)", width: 7 });
const routeStyles: Record<Severity, Style[]> = {
  0: [new Style({ stroke: casing }), new Style({ stroke: new Stroke({ color: SEVERITY_HEX[0], width: 3.5 }) })],
  1: [new Style({ stroke: casing }), new Style({ stroke: new Stroke({ color: SEVERITY_HEX[1], width: 3.5 }) })],
  2: [
    new Style({ stroke: casing }),
    new Style({ stroke: new Stroke({ color: SEVERITY_HEX[2], width: 3.5, lineDash: [8, 6] }) }),
  ],
};

/** EVA route polyline, coloured per sampled segment by slope / hazard severity. */
export function createRouteLayer() {
  return new VectorLayer({
    source: new VectorSource(),
    zIndex: 40,
    style: (f) => routeStyles[(f.get("severity") ?? 0) as Severity],
    properties: { id: "mission-route" },
  });
}

export function setRouteSegments(layer: VectorLayer<VectorSource>, segments: RouteSegment[]) {
  const source = layer.getSource()!;
  source.clear(true);
  source.addFeatures(
    segments.map((s) => new Feature({ geometry: new LineString(s.coords), severity: s.severity })),
  );
}

// --- Waypoints + lander -----------------------------------------------------
const landerStyleCache = new Map<boolean, Style>();
function landerStyle(selected: boolean) {
  let s = landerStyleCache.get(selected);
  if (!s) {
    s = new Style({
      image: new RegularShape({
        points: 3,
        radius: selected ? 13 : 11,
        fill: new Fill({ color: "#38bdf8" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
      text: new Text({
        text: "L",
        offsetY: 2,
        font: "700 10px ui-monospace, monospace",
        fill: new Fill({ color: "#0c4a6e" }),
      }),
      zIndex: 10,
    });
    landerStyleCache.set(selected, s);
  }
  return s;
}

function waypointStyle(feature: FeatureLike, selectedId: string | null, resolution: number) {
  if (feature.get("role") === "lander") {
    return [
      landerStyle(feature.getId() === selectedId),
      new Style({
        text: new Text({
          text: String(feature.get("name")),
          offsetY: -22,
          font: "600 11px system-ui, sans-serif",
          fill: new Fill({ color: "#e0f2fe" }),
          stroke: new Stroke({ color: "rgba(2,6,23,0.9)", width: 3 }),
        }),
      }),
    ];
  }
  const selected = feature.getId() === selectedId;
  const showName = resolution < 0.0004 || selected; // ≈ zoom ≥ 11
  const styles = [
    new Style({
      image: new CircleStyle({
        radius: selected ? 12 : 10,
        fill: new Fill({ color: selected ? "#fb923c" : "#0f172a" }),
        stroke: new Stroke({ color: selected ? "#ffffff" : "#fb923c", width: 2.5 }),
      }),
      text: new Text({
        text: String(feature.get("index")),
        font: "700 11px ui-monospace, monospace",
        fill: new Fill({ color: selected ? "#0f172a" : "#fed7aa" }),
      }),
      zIndex: selected ? 9 : 5,
    }),
  ];
  if (showName) {
    styles.push(
      new Style({
        text: new Text({
          text: String(feature.get("name")),
          textAlign: "left",
          offsetX: 16,
          font: "600 11px system-ui, sans-serif",
          fill: new Fill({ color: "#ffedd5" }),
          stroke: new Stroke({ color: "rgba(2,6,23,0.9)", width: 3 }),
        }),
        zIndex: selected ? 9 : 5,
      }),
    );
  }
  return styles;
}

export function createWaypointLayer(getSelectedId: () => string | null) {
  return new VectorLayer({
    source: new VectorSource(),
    zIndex: 50,
    style: (f, res) => waypointStyle(f, getSelectedId(), res),
    properties: { id: "mission-waypoints" },
  });
}

export const LANDER_FEATURE_ID = "lander";

export function setMissionPoints(layer: VectorLayer<VectorSource>, mission: Mission | null) {
  const source = layer.getSource()!;
  source.clear(true);
  if (!mission) return;
  const lander = new Feature({
    geometry: new Point([mission.lander.lon, mission.lander.lat]),
    role: "lander",
    name: mission.lander.name,
  });
  lander.setId(LANDER_FEATURE_ID);
  const wps = mission.waypoints.map((w, i) => {
    const f = new Feature({ geometry: new Point([w.lon, w.lat]), role: "waypoint", index: i + 1, name: w.name });
    f.setId(w.id);
    return f;
  });
  source.addFeatures([lander, ...wps]);
}

// --- Science sites -----------------------------------------------------------
const siteStyle = (f: FeatureLike, res: number) => {
  const lander = f.get("kind") === "lander";
  return new Style({
    image: new RegularShape({
      points: 4,
      radius: 6,
      angle: lander ? Math.PI / 4 : 0,
      fill: new Fill({ color: lander ? "rgba(56,189,248,0.35)" : "rgba(45,212,191,0.85)" }),
      stroke: new Stroke({ color: lander ? "#7dd3fc" : "#042f2e", width: 1.5 }),
    }),
    text:
      res < 0.0008 // ≈ zoom ≥ 10
        ? new Text({
            text: String(f.get("name")),
            offsetY: 14,
            font: "500 10px system-ui, sans-serif",
            fill: new Fill({ color: lander ? "#bae6fd" : "#99f6e4" }),
            stroke: new Stroke({ color: "rgba(2,6,23,0.85)", width: 3 }),
          })
        : undefined,
  });
};

export function createSiteLayer(sites: JezeroSite[]) {
  const features = sites.map((s) => {
    const f = new Feature({ geometry: new Point([s.lon, s.lat]), name: s.name, kind: s.kind });
    f.setId(`site:${s.id}`);
    return f;
  });
  return new VectorLayer({
    source: new VectorSource({ features }),
    zIndex: 35,
    style: siteStyle,
    declutter: true,
    properties: { id: "mission-sites" },
  });
}

// --- Hazard zones -------------------------------------------------------------
const HAZARD_RGB: Record<HazardKind, string> = {
  sand: "250,204,21",
  scarp: "251,146,60",
  wall: "248,113,113",
  crater: "244,63,94",
  boulders: "167,139,250",
};

export function createHazardLayer() {
  const features = HAZARD_ZONES.map((z) => {
    const f = new Feature({
      geometry: new Polygon(hazardZoneRings(z)),
      name: z.name,
      kind: z.kind,
    });
    f.setId(`hazard:${z.id}`);
    return f;
  });
  return new VectorLayer({
    source: new VectorSource({ features }),
    zIndex: 30,
    opacity: 0.9,
    style: (f, res) => {
      const rgb = HAZARD_RGB[f.get("kind") as HazardKind];
      return new Style({
        fill: new Fill({ color: `rgba(${rgb},0.14)` }),
        stroke: new Stroke({ color: `rgba(${rgb},0.85)`, width: 1.5, lineDash: [6, 5] }),
        text:
          res < 0.0012
            ? new Text({
                text: `⚠ ${f.get("name")}`,
                font: "600 10px system-ui, sans-serif",
                fill: new Fill({ color: `rgb(${rgb})` }),
                stroke: new Stroke({ color: "rgba(2,6,23,0.9)", width: 3 }),
                overflow: true,
              })
            : undefined,
      });
    },
    properties: { id: "mission-hazards" },
  });
}

// --- Hover probe (elevation profile ↔ map) -----------------------------------
export function createProbeLayer() {
  return new VectorLayer({
    source: new VectorSource(),
    zIndex: 60,
    style: new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color: "rgba(255,255,255,0.25)" }),
        stroke: new Stroke({ color: "#ffffff", width: 2 }),
      }),
    }),
  });
}

export function setProbe(layer: VectorLayer<VectorSource>, at: LonLat | null) {
  const source = layer.getSource()!;
  source.clear(true);
  if (at) source.addFeature(new Feature({ geometry: new Point(at) }));
}
