import LineString from "ol/geom/LineString";
import { getLength } from "ol/sphere";

import { MARS_RADIUS_M } from "../config/mars-map";

export type LonLat = [number, number];

export interface RouteInfo {
  id: string;
  name: string;
  coordinates: LonLat[];
  km: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance on a Mars-radius sphere (km). */
export function greatCircleKm([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * (MARS_RADIUS_M / 1000) * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Geodesic length of an OpenLayers LineString on the Mars sphere (metres).
 *
 * Note: `lineString.getLength()` on its own returns *planar* length in the
 * projection's units — degrees for IAU:49900 — so it would ignore the
 * cos(latitude) shrinking of longitude and use Earth-less units. `ol/sphere`
 * `getLength` walks the same geometry as great-circle segments; coordinates
 * are already lon/lat so we pass EPSG:4326 (no reprojection) and Mars' radius.
 */
export function lineStringLengthM(line: LineString): number {
  return getLength(line, { projection: "EPSG:4326", radius: MARS_RADIUS_M });
}

/** Sum of great-circle legs between consecutive vertices (km). */
export function pathLengthKm(coords: LonLat[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += greatCircleKm(coords[i - 1], coords[i]);
  return total;
}

export function formatLonLat(lon: number, lat: number, digits = 2): string {
  return `${Math.abs(lat).toFixed(digits)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(digits)}° ${lon >= 0 ? "E" : "W"}`;
}

/** `[lon, lat]` with fixed precision, handy for logs and copy-to-clipboard. */
export function formatLonLatArray([lon, lat]: LonLat, digits = 5): string {
  return `[${lon.toFixed(digits)}, ${lat.toFixed(digits)}]`;
}

export function formatKm(km: number): string {
  return km >= 100 ? `${Math.round(km).toLocaleString()} km` : `${km.toFixed(1)} km`;
}

export interface AlternativeRoutePlace {
  id: string;
  name: string;
  lon: number;
  lat: number;
}

/**
 * Generate up to three alternative routes by swapping
 * pairs of destinations in the original itinerary.
 */
export function generateAlternativeRoutes(
  start: AlternativeRoutePlace,
  destinations: AlternativeRoutePlace[],
  maxAlternatives = 3,
): RouteInfo[] {
  if (destinations.length < 2 || maxAlternatives <= 0) {
    return [];
  }

  const candidates: RouteInfo[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < destinations.length; i++) {
    for (let j = i + 1; j < destinations.length; j++) {
      const reordered = [...destinations];

      // Exchange the positions of two destinations.
      [reordered[i], reordered[j]] = [
        reordered[j],
        reordered[i],
      ];

      const orderKey = reordered.map((place) => place.id).join("|");

      if (seen.has(orderKey)) continue;
      seen.add(orderKey);

      const coordinates: LonLat[] = [
        [start.lon, start.lat],
        ...reordered.map(
          (place): LonLat => [place.lon, place.lat],
        ),
      ];

      candidates.push({
        id: `alternative-${orderKey}`,
        name: "Alternative route",
        coordinates,
        km: pathLengthKm(coordinates),
      });
    }
  }

  return candidates
    .sort((a, b) => a.km - b.km)
    .slice(0, maxAlternatives)
    .map((route, index) => ({
      ...route,
      name: `Alternative ${index + 1}`,
    }));
}
