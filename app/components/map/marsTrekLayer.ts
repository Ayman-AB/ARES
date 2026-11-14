import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";

import {
  MARS_PROJECTION,
  MARS_TILE_GRID,
  MARS_TREK_WMTS,
} from "../../config/mars-map";

interface MarsTrekLayerHandlers {
  onTileError?: () => void;
  onTileLoad?: () => void;
}

export function createMarsTrekLayer(handlers: MarsTrekLayerHandlers = {}) {
  const source = new WMTS({
    url: MARS_TREK_WMTS.url,
    requestEncoding: "REST",
    layer: MARS_TREK_WMTS.layer,
    style: MARS_TREK_WMTS.style,
    matrixSet: MARS_TREK_WMTS.matrixSet,
    projection: MARS_PROJECTION,
    tileGrid: new WMTSTileGrid({
      origin: MARS_TILE_GRID.origin,
      resolutions: MARS_TILE_GRID.resolutions,
      matrixIds: MARS_TILE_GRID.matrixIds,
      sizes: MARS_TILE_GRID.sizes,
      tileSize: MARS_TILE_GRID.tileSize,
    }),
    wrapX: false,
  });

  if (handlers.onTileError) source.on("tileloaderror", handlers.onTileError);
  if (handlers.onTileLoad) source.on("tileloadend", handlers.onTileLoad);

  return new TileLayer({ source, properties: { id: "mars-trek-base" } });
}