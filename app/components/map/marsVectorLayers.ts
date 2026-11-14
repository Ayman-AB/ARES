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
  const feature = new Feature({ geometry: new LineString(route.coordinates) });
  feature.setId(route.id);
  return feature;
}