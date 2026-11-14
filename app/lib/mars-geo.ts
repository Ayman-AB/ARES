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

/** Sum of great-circle legs between consecutive vertices (km). */
export function pathLengthKm(coords: LonLat[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += greatCircleKm(coords[i - 1], coords[i]);
  return total;
}

export function formatLonLat(lon: number, lat: number): string {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
}

export function formatKm(km: number): string {
  return km >= 100 ? `${Math.round(km).toLocaleString()} km` : `${km.toFixed(1)} km`;
}