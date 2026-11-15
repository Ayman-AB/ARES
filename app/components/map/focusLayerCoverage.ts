import type OLMap from "ol/Map";

import { MARS_LAYER_DEFS } from "../../config/mars-map";

export function focusLayerCoverage(map: OLMap | null, layerId: string) {
  const layer = MARS_LAYER_DEFS.find((candidate) => candidate.id === layerId);
  if (!map || !layer?.extent) return;

  const [minLon, minLat, maxLon, maxLat] = layer.extent;
  const view = map.getView();
  view.animate({
    center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
    zoom: Math.min(layer.maxLevel, view.getMaxZoom() ?? layer.maxLevel),
    duration: 550,
  });
}
