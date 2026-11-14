import { addProjection } from "ol/proj";
import Projection from "ol/proj/Projection";

/** IAU Mars 2000 mean radius (m). */
export const MARS_RADIUS_M = 3396190;

/** Global extent in degrees: [minLon, minLat, maxLon, maxLat]. */
export const MARS_EXTENT: [number, number, number, number] = [-180, -90, 180, 90];

/**
 * Mars 2000 geographic CRS (lon/lat in degrees on a Mars sphere).
 * Matches the Trek tile matrix set (service lists it as EPSG::104905).
 * metersPerUnit uses the MARS radius so scale calculations are not Earth-based.
 */
export const MARS_PROJECTION = new Projection({
  code: "IAU:49900",
  units: "degrees",
  extent: MARS_EXTENT,
  worldExtent: MARS_EXTENT,
  global: true,
  metersPerUnit: (2 * Math.PI * MARS_RADIUS_M) / 360,
});
addProjection(MARS_PROJECTION);

/** Tile grid of Trek's `default028mm` matrix set (global equirectangular products). */
const TILE_SIZE = 256;
const LEVELS = 10; // matrices 0..9
const LEVEL_0_RESOLUTION = 360 / (2 * TILE_SIZE); // deg/px: 2x1 tiles at level 0

export const MARS_TILE_GRID = {
  origin: [-180, 90] as [number, number], // top-left corner
  tileSize: TILE_SIZE,
  resolutions: Array.from({ length: LEVELS }, (_, z) => LEVEL_0_RESOLUTION / 2 ** z),
  matrixIds: Array.from({ length: LEVELS }, (_, z) => String(z)),
  sizes: Array.from(
    { length: LEVELS },
    (_, z): [number, number] => [2 ** (z + 1), 2 ** z], // [cols, rows]
  ),
};

/** Zoom index N === WMTS TileMatrix N. */
export const MARS_VIEW_DEFAULTS = {
  center: [0, 0] as [number, number],
  zoom: 1,
  minZoom: 0,
  maxZoom: LEVELS - 1,
};

const WMTS_BASE_URL = (
  process.env.NEXT_PUBLIC_MARS_WMTS_BASE_URL ?? "https://api.nasa.gov/mars-wmts/catalog"
).replace(/\/$/, "");

/** NASA Mars Trek WMTS (RESTful): Viking Color Mosaic, global, 232 m/px. */
export const MARS_TREK_WMTS = {
  url: `${WMTS_BASE_URL}/{Layer}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg`,
  layer: "Mars_Viking_MDIM21_ClrMosaic_global_232m",
  style: "default",
  matrixSet: "default028mm",
  attribution: "Imagery: NASA/JPL Mars Trek · USGS Astrogeology (Viking MDIM 2.1)",
};