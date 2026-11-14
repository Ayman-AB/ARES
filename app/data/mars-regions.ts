export interface MarsRegionSelection {
  id: string | number;
  title: string;
  center: [number, number];
}

type Position = [number, number] | [number, number, ...number[]];
type LinearRing = Position[];
type PolygonCoordinates = LinearRing[];

export interface MarsRegion {
  id: string | number;
  title: string;
  center: [number, number];
  extent: [number, number, number, number];
  polygons: PolygonCoordinates[];
}

const MARS_REGIONS_QUERY_URL =
  "https://trek.nasa.gov/mars/trekarcgis/rest/services/mars_regions/MapServer/0/query";

function getMarsRegionsUrl(where: string) {
  const query = new URLSearchParams({
    where,
    outFields: "FID,title",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
  });
  return `${MARS_REGIONS_QUERY_URL}?${query}`;
}

export const MARS_REGIONS_GEOJSON_URL = getMarsRegionsUrl("1=1");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePosition(value: unknown): Position {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    !value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))
  ) {
    throw new Error("NASA returned an invalid Mars region coordinate.");
  }
  return value as Position;
}

function parsePolygon(value: unknown): PolygonCoordinates {
  if (!Array.isArray(value)) {
    throw new Error("NASA returned invalid Mars region polygon data.");
  }
  return value.map((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) {
      throw new Error("NASA returned an invalid Mars region boundary.");
    }
    return ring.map(parsePosition);
  });
}

function parsePolygons(geometry: unknown): PolygonCoordinates[] {
  if (!isRecord(geometry) || !Array.isArray(geometry.coordinates)) {
    throw new Error("NASA returned a Mars region without polygon coordinates.");
  }
  if (geometry.type === "Polygon") {
    return [parsePolygon(geometry.coordinates)];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map(parsePolygon);
  }
  throw new Error("NASA returned an unsupported Mars region geometry.");
}

function extentForPolygons(polygons: PolygonCoordinates[]): [number, number, number, number] {
  const extent: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  polygons.forEach((polygon) =>
    polygon.forEach((ring) =>
      ring.forEach(([longitude, latitude]) => {
        extent[0] = Math.min(extent[0], longitude);
        extent[1] = Math.min(extent[1], latitude);
        extent[2] = Math.max(extent[2], longitude);
        extent[3] = Math.max(extent[3], latitude);
      }),
    ),
  );
  if (!extent.every(Number.isFinite)) {
    throw new Error("NASA returned a Mars region without a usable boundary.");
  }
  return extent;
}

function parseMarsRegions(payload: unknown): MarsRegion[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) {
    throw new Error("NASA returned invalid Mars region data.");
  }
  if (payload.features.length === 0) {
    throw new Error("NASA returned no Mars regions.");
  }

  return payload.features.map((feature, index) => {
    if (!isRecord(feature) || !isRecord(feature.properties)) {
      throw new Error(`NASA returned invalid data for Mars region ${index + 1}.`);
    }
    const id = feature.id ?? feature.properties.FID;
    const { title } = feature.properties;
    if (
      (typeof id !== "string" && typeof id !== "number") ||
      typeof title !== "string"
    ) {
      throw new Error(`NASA returned incomplete details for Mars region ${index + 1}.`);
    }

    const polygons = parsePolygons(feature.geometry);
    const extent = extentForPolygons(polygons);
    return {
      id,
      title,
      extent,
      center: [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2],
      polygons,
    };
  });
}

async function fetchRegionCollection(url: string): Promise<MarsRegion[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`NASA Mars region request failed (${response.status}).`);
  }
  return parseMarsRegions(await response.json());
}

export function fetchMarsRegions() {
  return fetchRegionCollection(MARS_REGIONS_GEOJSON_URL);
}

export async function fetchMarsRegionById(id: string) {
  const featureId = Number(id);
  if (!Number.isSafeInteger(featureId) || featureId < 0) {
    throw new Error("That Mars region address is not valid.");
  }
  const regions = await fetchRegionCollection(getMarsRegionsUrl(`FID=${featureId}`));
  const region = regions.find((candidate) => String(candidate.id) === String(featureId));
  if (!region) {
    throw new Error("That Mars region could not be found in NASA's data.");
  }
  return region;
}

function longitudeNear(longitude: number, reference: number) {
  let adjusted = longitude;
  while (adjusted - reference > 180) adjusted -= 360;
  while (adjusted - reference < -180) adjusted += 360;
  return adjusted;
}

function isInsideRing(longitude: number, latitude: number, ring: LinearRing) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [rawLonA, latA] = ring[i];
    const [rawLonB, latB] = ring[j];
    const lonA = longitudeNear(rawLonA, longitude);
    const lonB = longitudeNear(rawLonB, longitude);
    if (
      (latA > latitude) !== (latB > latitude) &&
      longitude < ((lonB - lonA) * (latitude - latA)) / (latB - latA) + lonA
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export function findMarsRegionAt(regions: MarsRegion[], longitude: number, latitude: number) {
  return regions.find((region) => isMarsLocationInRegion(region, longitude, latitude));
}

export function isMarsLocationInRegion(
  region: MarsRegion,
  longitude: number,
  latitude: number,
) {
  return region.polygons.some(
    (polygon) =>
      isInsideRing(longitude, latitude, polygon[0]) &&
      !polygon.slice(1).some((hole) => isInsideRing(longitude, latitude, hole)),
  );
}
