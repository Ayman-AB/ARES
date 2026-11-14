import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";

import {
  MARS_PROJECTION,
  MARS_TREK_WMTS,
  getMarsTileGrid,
  marsTrekTileUrl,
  type MarsLayerDef,
} from "../../config/mars-map";

interface MarsTrekLayerOptions {
  visible?: boolean;
  opacity?: number;
  zIndex?: number;
  onTileError?: () => void;
  onTileLoad?: () => void;
}

export function createMarsTrekLayer(def: MarsLayerDef, options: MarsTrekLayerOptions = {}) {
  const source = new WMTS({
    url: marsTrekTileUrl(def),
    requestEncoding: "REST",
    layer: def.product,
    style: MARS_TREK_WMTS.style,
    matrixSet: MARS_TREK_WMTS.matrixSet,
    projection: MARS_PROJECTION,
    tileGrid: new WMTSTileGrid(getMarsTileGrid(def.maxLevel)),
    wrapX: false,
  });

  if (options.onTileError) source.on("tileloaderror", options.onTileError);
  if (options.onTileLoad) source.on("tileloadend", options.onTileLoad);

  return new TileLayer({
    source,
    visible: options.visible ?? true,
    opacity: options.opacity ?? def.defaultOpacity,
    zIndex: options.zIndex ?? 0,
    properties: { id: def.id },
  });
}