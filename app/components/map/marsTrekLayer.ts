import TileLayer from "ol/layer/Tile";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";

import {
  MARS_PROJECTION,
  MARS_TREK_WMTS,
  discoverMarsTrekLayerConfig,
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

/** Capabilities lookups are shared between every layer instance (and Strict Mode remounts). */
const discoveryCache = new Map<string, ReturnType<typeof discoverMarsTrekLayerConfig>>();

function createSource(
  def: MarsLayerDef,
  url: string,
  maxLevel: number,
  options: MarsTrekLayerOptions,
  style: string = MARS_TREK_WMTS.style,
  matrixSet: string = MARS_TREK_WMTS.matrixSet,
) {
  const source = new WMTS({
    url,
    requestEncoding: "REST",
    layer: def.product,
    style,
    matrixSet,
    projection: MARS_PROJECTION,
    tileGrid: new WMTSTileGrid(getMarsTileGrid(maxLevel)),
    wrapX: false,
    transition: 150,
  });
  if (options.onTileError) source.on("tileloaderror", options.onTileError);
  if (options.onTileLoad) source.on("tileloadend", options.onTileLoad);
  return source;
}

/**
 * NASA Trek WMTS layer in IAU:49900. Layers flagged `discover` start with the
 * conventional REST URL and swap to the template advertised by their
 * WMTSCapabilities.xml as soon as it is fetched (correct host, extension, depth).
 */
export function createMarsTrekLayer(def: MarsLayerDef, options: MarsTrekLayerOptions = {}) {
  const layer = new TileLayer({
    source: createSource(def, marsTrekTileUrl(def), def.maxLevel, options),
    visible: options.visible ?? true,
    opacity: options.opacity ?? def.defaultOpacity,
    zIndex: options.zIndex ?? 0,
    preload: 1,
    properties: { id: def.id },
  });

  if (def.discover) {
    let pending = discoveryCache.get(def.product);
    if (!pending) {
      pending = discoverMarsTrekLayerConfig(def.product);
      discoveryCache.set(def.product, pending);
      pending.catch(() => discoveryCache.delete(def.product)); // allow a retry on next mount
    }
    pending
      .then((cfg) => {
        // Layer.dispose() nulls the source, so a missing source means "unmounted".
        if (!layer.getSource()) return;
        const maxLevel = Math.max(0, cfg.tileMatrixLabels.length - 1);
        const old = layer.getSource();
        layer.setSource(
          createSource(def, cfg.tileUrlTemplate, maxLevel, options, cfg.style, cfg.tileMatrixSetID),
        );
        old?.dispose();
      })
      .catch((err: unknown) => {
        console.warn(`[mars] capabilities for ${def.product} unavailable, using default URL`, err);
      });
  }

  return layer;
}
