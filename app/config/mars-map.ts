import { addProjection } from "ol/proj";
import Projection from "ol/proj/Projection";

/** IAU Mars 2000 mean radius (m). */
export const MARS_RADIUS_M = 3396190;

/** Global extent in degrees: [minLon, minLat, maxLon, maxLat]. */
export const MARS_EXTENT: [number, number, number, number] = [-180, -90, 180, 90];

/** Mars 2000 geographic CRS (lon/lat in degrees, east positive). */
export const MARS_PROJECTION = new Projection({
  code: "IAU:49900",
  units: "degrees",
  extent: MARS_EXTENT,
  worldExtent: MARS_EXTENT,
  global: true,
  metersPerUnit: (2 * Math.PI * MARS_RADIUS_M) / 360,
});
addProjection(MARS_PROJECTION);

/** Trek `default028mm` grid: 2x1 tiles at level 0, doubling each level. */
const TILE_SIZE = 256;
const LEVEL_0_RESOLUTION = 360 / (2 * TILE_SIZE); // deg/px
/**
 * Deepest zoom the view allows. Level 17 supports the Jezero HiRISE mosaic;
 * lower-resolution layers upscale their deepest available tiles.
 */
export const MARS_VIEW_MAX_LEVEL = 17;

/** Grid limited to `maxLevel`; deeper view zooms upscale the last level. */
export function getMarsTileGrid(
  maxLevel: number = MARS_VIEW_MAX_LEVEL,
  extent?: [number, number, number, number],
  matrixIds?: string[],
) {
  const count = Math.min(maxLevel, MARS_VIEW_MAX_LEVEL) + 1;
  return {
    origin: [-180, 90] as [number, number],
    tileSize: TILE_SIZE,
    resolutions: Array.from({ length: count }, (_, z) => LEVEL_0_RESOLUTION / 2 ** z),
    matrixIds: matrixIds?.slice(0, count) ?? Array.from({ length: count }, (_, z) => String(z)),
    sizes: Array.from({ length: count }, (_, z): [number, number] => [2 ** (z + 1), 2 ** z]),
    ...(extent ? { extent } : {}),
  };
}

/** Full grid: used by the View so zoom N === TileMatrix N. */
export const MARS_TILE_GRID = getMarsTileGrid();

/** Jezero Crater (IAU/USGS Gazetteer centre). */
export const JEZERO_CENTER: [number, number] = [77.58, 18.38];
/** Western fan delta + Perseverance landing area: where the missions happen. */
export const JEZERO_OPS_CENTER: [number, number] = [77.4, 18.46];
/** [minLon, minLat, maxLon, maxLat] framing the whole ~45 km crater. */
export const JEZERO_EXTENT: [number, number, number, number] = [77.1, 18.0, 78.05, 18.78];

export const MARS_VIEW_DEFAULTS = {
  center: JEZERO_OPS_CENTER,
  zoom: 9,
  minZoom: 0,
  maxZoom: MARS_VIEW_MAX_LEVEL,
};

export const MARS_VIKING_LAYER_ID = "Mars_Viking_MDIM21_ClrMosaic_global_232m";
const WMTS_BASE_URL = "https://trek.nasa.gov/tiles/Mars/EQ";

export const MARS_TREK_WMTS = {
  baseUrl: WMTS_BASE_URL,
  style: "default",
  matrixSet: "default028mm",
  format: "image/jpeg",
  layerId: MARS_VIKING_LAYER_ID,
  attribution: "Imagery: NASA/JPL Mars Trek · USGS Astrogeology",
  capabilitiesUrl: `${WMTS_BASE_URL}/${MARS_VIKING_LAYER_ID}/1.0.0/WMTSCapabilities.xml`,
};

function getChildrenByLocalName(parent: Element, localName: string) {
  return Array.from(parent.getElementsByTagNameNS("*", localName));
}

export async function discoverMarsTrekLayerConfig(layerId: string = MARS_VIKING_LAYER_ID) {
  const response = await fetch(
    `${WMTS_BASE_URL}/${layerId}/1.0.0/WMTSCapabilities.xml`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`NASA Mars Trek GetCapabilities failed (${response.status})`);
  }

  const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (xml.querySelector("parsererror")) {
    throw new Error("NASA Mars Trek returned invalid WMTS capabilities XML");
  }

  const layer = getChildrenByLocalName(xml.documentElement, "Layer").find(
    (node) => getChildrenByLocalName(node, "Identifier")[0]?.textContent?.trim() === layerId,
  );
  if (!layer) {
    throw new Error(`NASA Mars Trek WMTS layer "${layerId}" was not found`);
  }

  const styleNodes = getChildrenByLocalName(layer, "Style");
  const styleNode = styleNodes.find((node) => node.getAttribute("isDefault") === "true") ??
    styleNodes[0];
  const style = styleNode
    ? getChildrenByLocalName(styleNode, "Identifier")[0]?.textContent?.trim()
    : undefined;
  const format = getChildrenByLocalName(layer, "Format")[0]?.textContent?.trim();
  const tileMatrixSetID = getChildrenByLocalName(layer, "TileMatrixSet")[0]?.textContent?.trim();
  const resource = getChildrenByLocalName(layer, "ResourceURL").find(
    (node) => node.getAttribute("resourceType") === "tile",
  );
  const tileMatrixSet = getChildrenByLocalName(xml.documentElement, "TileMatrixSet").find(
    (node) =>
      getChildrenByLocalName(node, "Identifier")[0]?.textContent?.trim() === tileMatrixSetID &&
      getChildrenByLocalName(node, "TileMatrix").length > 0,
  );
  const tileMatrixLabels = tileMatrixSet
    ? getChildrenByLocalName(tileMatrixSet, "TileMatrix").map(
        (node) => getChildrenByLocalName(node, "Identifier")[0]?.textContent?.trim() ?? "",
      )
    : [];
  const tileUrlTemplate = resource?.getAttribute("template");

  if (!style || !format || !tileMatrixSetID || !tileUrlTemplate || tileMatrixLabels.length === 0) {
    throw new Error(`NASA Mars Trek WMTS capabilities are incomplete for "${layerId}"`);
  }

  return {
    layer: layerId,
    style,
    format,
    tileMatrixSetID,
    tileMatrixLabels,
    tileUrlTemplate,
  };
}

export interface MarsLayerDef {
  id: string;
  title: string;
  subtitle: string;
  /** Trek product name (path segment of the WMTS URL). */
  product: string;
  extension: "jpg" | "png";
  /** Deepest tile matrix advertised by the WMTS service. */
  maxLevel: number;
  /** Optional WMTS tile URL template for services outside the Mars Trek tile path. */
  tileUrlTemplate?: string;
  /** Optional product coverage extent in Mars longitude/latitude degrees. */
  extent?: [number, number, number, number];
  role: "base" | "overlay";
  defaultOpacity: number;
  /**
   * Resolve the real tile URL template / depth from WMTSCapabilities.xml at
   * runtime (used for products whose path or depth we don't hard-code).
   */
  discover?: boolean;
}

export const MARS_DEFAULT_BASE_ID = "viking-color";

export const MARS_LAYER_DEFS: MarsLayerDef[] = [
  {
    id: "ctx-mosaic",
    title: "CTX global mosaic",
    subtitle: "MRO Context Camera, ~5 m/px (Caltech Murray Lab)",
    product: "CTX_beta01_uncontrolled_5m_Caltech",
    extension: "png",
    maxLevel: 13,
    role: "base",
    defaultOpacity: 1,
    discover: true,
  },
  {
    id: "viking-color",
    title: "Viking color mosaic",
    subtitle: "Global, 232 m/px",
    product: "Mars_Viking_MDIM21_ClrMosaic_global_232m",
    extension: "jpg",
    maxLevel: 7,
    role: "base",
    defaultOpacity: 1,
  },
  {
    id: "themis-ir-day",
    title: "THEMIS IR day mosaic",
    subtitle: "Thermal infrared, 100 m/px",
    product: "Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly",
    extension: "png",
    maxLevel: 8,
    role: "base",
    defaultOpacity: 1,
  },
  {
    id: "global-geology",
    title: "Global geology",
    subtitle: "Geologic units · global",
    product: "SIM3292_Global_Geology",
    extension: "png",
    maxLevel: 11,
    role: "overlay",
    defaultOpacity: 0.6,
    tileUrlTemplate:
      "https://trek.nasa.gov/mars/trekarcgis/rest/services/SIM3292_Global_Geology/MapServer/WMTS/tile/1.0.0/SIM3292_Global_Geology/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  },
  {
    id: "mola-shade",
    title: "MOLA color hillshade",
    subtitle: "Relief, 463 m/px",
    product: "Mars_MGS_MOLA_ClrShade_merge_global_463m",
    extension: "jpg",
    maxLevel: 7,
    role: "overlay",
    defaultOpacity: 0.6,
  },
  {
    id: "mola-dem",
    title: "MOLA elevation (grayscale)",
    subtitle: "Altimetry, 463 m/px",
    product: "Mars_MGS_MOLA_DEM_mosaic_global_463m_8",
    extension: "png",
    maxLevel: 5,
    role: "overlay",
    defaultOpacity: 0.3,
  },
  {
    id: "tes-albedo",
    title: "TES albedo",
    subtitle: "Surface brightness, 7.4 km/px",
    product: "Mars_MGS_TES_Albedo_mosaic_global_7410m",
    extension: "png",
    maxLevel: 1,
    role: "overlay",
    defaultOpacity: 0.5,
  },
  {
    id: "ctx-jezero",
    title: "CTX landing-site mosaic",
    subtitle: "6 m/px · Jezero coverage only",
    product: "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0",
    extension: "png",
    maxLevel: 13,
    extent: [77.1604655, 18.2110274, 77.6991776, 18.7211945],
    role: "overlay",
    defaultOpacity: 0.9,
  },
  {
    id: "hirise-jezero",
    title: "HiRISE landing-site mosaic",
    subtitle: "25 cm/px · Jezero coverage only",
    product: "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd",
    extension: "png",
    maxLevel: 17,
    extent: [77.2229331, 18.3067994, 77.583964, 18.669315],
    role: "overlay",
    defaultOpacity: 1,
  },
];

export function marsTrekTileUrl(def: MarsLayerDef) {
  if (def.tileUrlTemplate) return def.tileUrlTemplate;
  return `${MARS_TREK_WMTS.baseUrl}/${def.product}/1.0.0//{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.${def.extension}`;
}