import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import Polygon from "ol/geom/Polygon";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";

import { MARKER_STYLES, type MarsPlace } from "../../data/mars-features";
import type { MarsRegion } from "../../data/mars-regions";
import type { RouteInfo } from "../../lib/mars-geo";

/** Also used as the sketch style while drawing. */
export const routeStyle = [
  new Style({ stroke: new Stroke({ color: "rgba(15,23,42,0.85)", width: 6 }) }),
  new Style({
    stroke: new Stroke({ color: "#fb923c", width: 3 }),
    image: new CircleStyle({
      radius: 4,
      fill: new Fill({ color: "#fb923c" }),
      stroke: new Stroke({ color: "#ffffff", width: 1.5 }),
    }),
  }),
];
// Style of the current route planner itinerary.
const directRouteStyle = new Style({
  stroke: new Stroke({
    color: "#22c55e",
    width: 4,
  }),
});

// Style of suggested alternative itineraries.
const alternativeRouteStyle = new Style({
  stroke: new Stroke({
    color: "#38bdf8",
    width: 4,
    lineDash: [10, 8],
  }),
});

export function createRouteLayer() {
  return new VectorLayer({ source: new VectorSource(), style: routeStyle, zIndex: 20 });
}

export function createMarsRegionLayer(region: MarsRegion) {
  const features = region.polygons.map(
    (polygon) =>
      new Feature({
        geometry: new Polygon(
          polygon.map((ring) => ring.map(([longitude, latitude]) => [longitude, latitude])),
        ),
        title: region.title,
      }),
  );
  return new VectorLayer({
    source: new VectorSource({ features }),
    properties: { id: "region-boundary" },
    style: new Style({
      fill: new Fill({ color: "rgba(251,146,60,0.12)" }),
      stroke: new Stroke({ color: "#fb923c", width: 2 }),
    }),
    zIndex: 25,
  });
}

export function createMarkerLayer(getSelectedId: () => string | null) {
  return new VectorLayer({
    source: new VectorSource(),
    zIndex: 30,
    style: (feature) => {
      const kind = (feature.get("kind") ?? "custom") as MarsPlace["kind"];
      const selected = feature.getId() === getSelectedId();
      return new Style({
        image: new CircleStyle({
          radius: selected ? 9 : 6,
          fill: new Fill({ color: MARKER_STYLES[kind].hex }),
          stroke: new Stroke({
            color: selected ? "#ffffff" : "rgba(15,23,42,0.9)",
            width: selected ? 3 : 2,
          }),
        }),
        text: new Text({
          text: String(feature.get("name") ?? ""),
          offsetY: -16,
          font: "600 12px system-ui, sans-serif",
          fill: new Fill({ color: "#f8fafc" }),
          stroke: new Stroke({ color: "rgba(15,23,42,0.9)", width: 3 }),
        }),
      });
    },
  });
}

export function placeToFeature(place: MarsPlace) {
  const feature = new Feature({
    geometry: new Point([place.lon, place.lat]),
    name: place.name,
    kind: place.kind,
  });
  feature.setId(place.id);
  return feature;
}

export function routeToFeature(route: RouteInfo) {
  const feature = new Feature({
    geometry: new LineString(route.coordinates),
  });

  feature.setId(route.id);

  // Apply a different style depending on the route type.
  if (route.id === "selected-multi-destination-route") {
    feature.setStyle(directRouteStyle);
  } else if (route.id.startsWith("alternative-")) {
    feature.setStyle(alternativeRouteStyle);
  }

  return feature;
}

/**
 * Creates the geological units layer from real ArcGIS features.
 * Each geological unit receives a consistent color.
 */
export function createMarsGeologyLayer(features: Feature[]) {
  return new VectorLayer({
    source: new VectorSource({ features }),
    properties: { id: "jezero-geology" },

    style: (feature) => {
      const color = getMarsGeologyColor(feature as Feature);

      return new Style({
        fill: new Fill({
          color: `${color}55`,
        }),
        stroke: new Stroke({
          color,
          width: 1.5,
        }),
      });
    },

    zIndex: 15,
    visible: false,
  });
}

const GEOLOGY_COLORS = [
  "#e76f51",
  "#e9c46a",
  "#2a9d8f",
  "#457b9d",
  "#9b5de5",
  "#f4a261",
  "#8ab17d",
  "#d65db1",
  "#577590",
  "#43aa8b",
  "#f94144",
  "#f9c74f",
  "#277da1",
  "#90be6d",
];

export interface MarsGeologyLegendItem {
  unit: string;
  symbol: string;
  name: string;
  color: string;
}

export function getMarsGeologyColor(feature: Feature): string {
  const unit = String(feature.get("unit") ?? "").trim();
  const unitNumber = Number(unit);
  if (unit !== "" && Number.isInteger(unitNumber) && unitNumber >= 0) {
    return GEOLOGY_COLORS[unitNumber % GEOLOGY_COLORS.length];
  }

  const identifier = String(feature.get("symbol") ?? feature.getId() ?? "unknown");
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GEOLOGY_COLORS[Math.abs(hash) % GEOLOGY_COLORS.length];
}

export function getMarsGeologyLegendItems(features: Feature[]): MarsGeologyLegendItem[] {
  const items = new Map<string, MarsGeologyLegendItem>();

  for (const feature of features) {
    const unit = String(feature.get("unit") ?? "").trim();
    const symbol = String(feature.get("symbol") ?? "").trim();
    const name = String(feature.get("name") ?? "").trim();
    const key = unit || symbol || String(feature.getId() ?? "");
    if (!key || items.has(key)) continue;
    items.set(key, {
      unit,
      symbol,
      name,
      color: getMarsGeologyColor(feature),
    });
  }

  return Array.from(items.values()).sort((a, b) => {
    const aUnit = Number(a.unit);
    const bUnit = Number(b.unit);
    return Number.isFinite(aUnit) && Number.isFinite(bUnit)
      ? aUnit - bUnit
      : a.unit.localeCompare(b.unit);
  });
}
