/**
 * Simulated Jezero terrain — frontend-only stand-in for a DEM.
 *
 * No elevation service is connected yet, so slope and hazard checks run on an
 * analytic model tuned to Jezero's real shape: a ~45 km crater with a floor
 * near −2,600 m, a steep inner wall, the western fan delta (~80 m front scarp),
 * the Séítah sand-ridge field and Belva crater. Swap `elevationAt` for a CTX
 * DTM sampler later and everything downstream keeps working.
 */
import type { LonLat } from "./mars-geo";

const MARS_RADIUS_KM = 3396.19;
export const KM_PER_DEG_LAT = (2 * Math.PI * MARS_RADIUS_KM) / 360; // ≈ 59.27
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Local east/north offset (km) of `p` from `origin` — accurate at crater scale. */
export function offsetKm([lon, lat]: LonLat, [lon0, lat0]: LonLat): [number, number] {
  const kmPerDegLon = KM_PER_DEG_LAT * Math.cos(toRad((lat + lat0) / 2));
  return [(lon - lon0) * kmPerDegLon, (lat - lat0) * KM_PER_DEG_LAT];
}

/** Inverse of `offsetKm`. */
export function fromOffsetKm([east, north]: [number, number], [lon0, lat0]: LonLat): LonLat {
  const lat = lat0 + north / KM_PER_DEG_LAT;
  return [lon0 + east / (KM_PER_DEG_LAT * Math.cos(toRad((lat + lat0) / 2))), lat];
}

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// --- Model geometry ---------------------------------------------------------
const CRATER = { center: [77.58, 18.38] as LonLat, radiusKm: 22.5, floorM: -2620, rimReliefM: 650 };
const DELTA = { center: [77.31, 18.48] as LonLat, frontKm: 5.75, rampKm: 0.35, heightM: 80 };
const SEITAH = { center: [77.425, 18.418] as LonLat, radiusKm: 1.0, ampM: 6, wavelengthKm: 0.09 };
const BELVA = { center: [77.366, 18.492] as LonLat, radiusKm: 0.45, depthM: 100 };

/** Simulated elevation (m, MOLA-style datum). */
export function elevationAt(lon: number, lat: number): number {
  const p: LonLat = [lon, lat];

  // Crater bowl: flat floor, steepening inner wall, rim decaying to the plains.
  const [cx, cy] = offsetKm(p, CRATER.center);
  const r = Math.hypot(cx, cy) / CRATER.radiusKm;
  const rimTop = CRATER.floorM + CRATER.rimReliefM;
  let z =
    r < 1
      ? CRATER.floorM + CRATER.rimReliefM * r ** 12
      : -2300 + (rimTop + 2300) * Math.exp(-((r - 1) * CRATER.radiusKm) / 4);

  // Western fan delta: plateau with a sharp eastern front, gently rising west.
  const [dx, dy] = offsetKm(p, DELTA.center);
  const d = Math.hypot(dx, dy);
  const onDelta = 1 - smoothstep(DELTA.frontKm - DELTA.rampKm / 2, DELTA.frontKm + DELTA.rampKm / 2, d);
  z += onDelta * (DELTA.heightM + Math.max(0, -dx) * 6);

  // Séítah: NE–SW sand ridges fading out at the edge of the field.
  const [sx, sy] = offsetKm(p, SEITAH.center);
  const sr = Math.hypot(sx, sy);
  if (sr < SEITAH.radiusKm) {
    const along = sx * Math.cos(toRad(30)) + sy * Math.sin(toRad(30));
    const fade = 1 - smoothstep(SEITAH.radiusKm * 0.7, SEITAH.radiusKm, sr);
    z += SEITAH.ampM * fade * Math.sin((2 * Math.PI * along) / SEITAH.wavelengthKm);
  }

  // Belva crater: parabolic bowl with a small raised rim.
  const [bx, by] = offsetKm(p, BELVA.center);
  const br = Math.hypot(bx, by) / BELVA.radiusKm;
  z += br < 1 ? -BELVA.depthM * (1 - br * br) : 0;
  z += 15 * Math.exp(-((((br - 1) * BELVA.radiusKm) / 0.12) ** 2));

  // Low-amplitude roughness so flat ground is not perfectly flat.
  const [ex, ny] = offsetKm(p, CRATER.center);
  z +=
    2.5 * Math.sin(ex / 0.41 + 1.3) * Math.cos(ny / 0.53) +
    1.5 * Math.sin((ex + ny) / 0.23) +
    4 * Math.sin(ex / 1.7) * Math.sin(ny / 1.3 + 0.7);

  return z;
}

/** Terrain slope magnitude (degrees) at a point, by central differences. */
export function slopeAt(lon: number, lat: number, stepKm = 0.008): number {
  const p: LonLat = [lon, lat];
  const e = fromOffsetKm([stepKm, 0], p);
  const w = fromOffsetKm([-stepKm, 0], p);
  const n = fromOffsetKm([0, stepKm], p);
  const s = fromOffsetKm([0, -stepKm], p);
  const dzdx = (elevationAt(e[0], e[1]) - elevationAt(w[0], w[1])) / (2 * stepKm * 1000);
  const dzdy = (elevationAt(n[0], n[1]) - elevationAt(s[0], s[1])) / (2 * stepKm * 1000);
  return toDeg(Math.atan(Math.hypot(dzdx, dzdy)));
}

// --- Mapped hazard zones (drawn on the map and checked along routes) --------
export type HazardKind = "sand" | "scarp" | "wall" | "crater" | "boulders";

export interface HazardZone {
  id: string;
  name: string;
  kind: HazardKind;
  center: LonLat;
  /** Annulus radii in km (inner 0 = disc). */
  innerKm: number;
  outerKm: number;
  /** Optional sector, degrees clockwise from north. */
  fromBearing?: number;
  toBearing?: number;
  note: string;
  /** Which vehicle profiles treat this as no-go rather than caution. */
  noGoFor: ("eva" | "rover")[];
}

export const HAZARD_ZONES: HazardZone[] = [
  {
    id: "seitah-ridges",
    name: "Séítah sand ridges",
    kind: "sand",
    center: SEITAH.center,
    innerKm: 0,
    outerKm: SEITAH.radiusKm,
    note: "Soft sand between bedrock ridges: wheel-sinkage risk. Perseverance drove around it.",
    noGoFor: ["rover"],
  },
  {
    id: "delta-front",
    name: "Delta-front scarp",
    kind: "scarp",
    center: DELTA.center,
    innerKm: DELTA.frontKm - 0.35,
    outerKm: DELTA.frontKm + 0.2,
    fromBearing: 20,
    toBearing: 200,
    note: "≈80 m escarpment, local slopes near 20°. Use mapped gaps (e.g. Hawksbill Gap).",
    noGoFor: [],
  },
  {
    id: "crater-wall",
    name: "Jezero inner wall",
    kind: "wall",
    center: CRATER.center,
    innerKm: CRATER.radiusKm - 3,
    outerKm: CRATER.radiusKm + 0.8,
    note: "Rim wall steepens toward the crest; loose talus and rockfall risk.",
    noGoFor: [],
  },
  {
    id: "belva-interior",
    name: "Belva crater interior",
    kind: "crater",
    center: BELVA.center,
    innerKm: 0,
    outerKm: BELVA.radiusKm,
    note: "≈100 m deep bowl with ~20°+ walls: view from the rim, do not enter.",
    noGoFor: ["eva", "rover"],
  },
  {
    id: "neretva-boulders",
    name: "Neretva boulder train",
    kind: "boulders",
    center: [77.3, 18.548],
    innerKm: 0,
    outerKm: 0.8,
    note: "Dense metre-scale boulders deposited by the inlet river.",
    noGoFor: ["rover"],
  },
];

function bearingDeg(east: number, north: number) {
  return (toDeg(Math.atan2(east, north)) + 360) % 360;
}

function inSector(b: number, from: number, to: number) {
  return from <= to ? b >= from && b <= to : b >= from || b <= to;
}

export function hazardsAt(lon: number, lat: number): HazardZone[] {
  return HAZARD_ZONES.filter((z) => {
    const [e, n] = offsetKm([lon, lat], z.center);
    const r = Math.hypot(e, n);
    if (r < z.innerKm || r > z.outerKm) return false;
    if (z.fromBearing === undefined || z.toBearing === undefined) return true;
    return inSector(bearingDeg(e, n), z.fromBearing, z.toBearing);
  });
}

/** Rings (outer [+ inner hole]) in lon/lat for drawing a zone as a polygon. */
export function hazardZoneRings(z: HazardZone, steps = 72): LonLat[][] {
  const from = z.fromBearing ?? 0;
  const span = z.fromBearing === undefined ? 360 : ((z.toBearing! - from + 360) % 360) || 360;
  const arc = (rKm: number, reverse = false) => {
    const pts: LonLat[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = reverse ? steps - i : i;
      const b = toRad(from + (span * t) / steps);
      pts.push(fromOffsetKm([rKm * Math.sin(b), rKm * Math.cos(b)], z.center));
    }
    return pts;
  };
  if (z.fromBearing !== undefined) {
    // Sector annulus as a single closed ring.
    const ring = [...arc(z.outerKm), ...arc(z.innerKm, true)];
    ring.push(ring[0]);
    return [ring];
  }
  const outer = arc(z.outerKm);
  return z.innerKm > 0 ? [outer, arc(z.innerKm, true)] : [outer];
}
