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
const LEVELS = 10; // matrices 0..9
const LEVEL_0_RESOLUTION = 360 / (2 * TILE_SIZE); // deg/px

/** Grid limited to `maxLevel`; deeper view zooms upscale the last level. */
export function getMarsTileGrid(maxLevel: number = LEVELS - 1) {
  const count = Math.min(maxLevel, LEVELS - 1) + 1;
  return {
    origin: [-180, 90] as [number, number],
    tileSize: TILE_SIZE,
    resolutions: Array.from({ length: count }, (_, z) => LEVEL_0_RESOLUTION / 2 ** z),
    matrixIds: Array.from({ length: count }, (_, z) => String(z)),
    sizes: Array.from({ length: count }, (_, z): [number, number] => [2 ** (z + 1), 2 ** z]),
  };
}

/** Full grid: used by the View so zoom N === TileMatrix N. */
export const MARS_TILE_GRID = getMarsTileGrid();

export const MARS_VIEW_DEFAULTS = {
  center: [0, 0] as [number, number],
  zoom: 1,
  minZoom: 0,
  maxZoom: LEVELS - 1,
};

const WMTS_BASE_URL = (
  process.env.NEXT_PUBLIC_MARS_WMTS_BASE_URL ?? "https://api.nasa.gov/mars-wmts/catalog"
).replace(/\/$/, "");

export const MARS_TREK_WMTS = {
  baseUrl: WMTS_BASE_URL,
  style: "default",
  matrixSet: "default028mm",
  attribution: "Imagery: NASA/JPL Mars Trek · USGS Astrogeology",
};

export interface MarsLayerDef {
  id: string;
  title: string;
  subtitle: string;
  /** Trek product name (path segment of the WMTS URL). */
  product: string;
  extension: "jpg" | "png";
  /** Deepest native tile level. Estimate; lower it if you see 404s. */
  maxLevel: number;
  role: "base" | "overlay";
  defaultOpacity: number;
}

export const MARS_DEFAULT_BASE_ID = "viking-color";

export const MARS_LAYER_DEFS: MarsLayerDef[] = [
  {
    id: "viking-color",
    title: "Viking color mosaic",
    subtitle: "Global, 232 m/px",
    product: "Mars_Viking_MDIM21_ClrMosaic_global_232m",
    extension: "jpg",
    maxLevel: 9,
    role: "base",
    defaultOpacity: 1,
  },
  {
    id: "themis-ir-day",
    title: "THEMIS IR day mosaic",
    subtitle: "Thermal infrared, 100 m/px",
    product: "Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly",
    extension: "jpg",
    maxLevel: 9,
    role: "base",
    defaultOpacity: 1,
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
    maxLevel: 7,
    role: "overlay",
    defaultOpacity: 0.6,
  },
  {
    id: "tes-albedo",
    title: "TES albedo",
    subtitle: "Surface brightness, 7.4 km/px",
    product: "Mars_MGS_TES_Albedo_mosaic_global_7410m",
    extension: "png",
    maxLevel: 3,
    role: "overlay",
    defaultOpacity: 0.5,
  },
];

export function marsTrekTileUrl(def: MarsLayerDef) {
  return `${MARS_TREK_WMTS.baseUrl}/${def.product}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.${def.extension}`;
}