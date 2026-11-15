/**
 * Client-side EVA / traverse planning model.
 *
 * Everything here is a transparent, tunable simulation (no backend): the
 * constants live in `MISSION_PROFILES` so the team can calibrate them.
 */
import { greatCircleKm, type LonLat } from "./mars-geo";
import { elevationAt, hazardsAt, offsetKm, slopeAt, type HazardZone } from "./jezero-terrain";

const MARS_G = 3.721; // m/s²

export interface MissionProfile {
  id: "eva" | "rover";
  label: string;
  short: string;
  /** Speed on flat ground (km/h). */
  flatSpeedKmh: number;
  /** Speed multiplier for a signed along-track grade (rise/run). */
  speedFactor: (grade: number) => number;
  /** Terrain slope thresholds (degrees). */
  cautionSlopeDeg: number;
  noGoSlopeDeg: number;
  /** Energy model. */
  batteryKWh: number;
  hotelW: number;
  whPerKm: number;
  /** Mass that has to be lifted on climbs (kg) and drivetrain efficiency. */
  climbMassKg: number;
  climbEfficiency: number;
  /** Time spent at each science waypoint (min). */
  dwellMin: number;
  /** Hard limit for one sortie (h): suit consumables or a driving sol. */
  sortieLimitH: number;
  /** Max straight-line distance from the lander (km) — walk-back rule. */
  walkbackKm: number;
  /** O₂ use (kg/h) for crewed sorties. */
  o2KgPerH: number;
}

/** Tobler hiking function, normalised to 1 on flat ground. */
const tobler = (grade: number) => Math.exp(-3.5 * Math.abs(grade + 0.05)) / Math.exp(-3.5 * 0.05);

export const MISSION_PROFILES: Record<MissionProfile["id"], MissionProfile> = {
  eva: {
    id: "eva",
    label: "Crewed EVA (on foot)",
    short: "EVA",
    flatSpeedKmh: 2.2,
    speedFactor: (g) => Math.max(0.15, tobler(g)),
    cautionSlopeDeg: 15,
    noGoSlopeDeg: 25,
    batteryKWh: 1.4, // suit PLSS battery
    hotelW: 120, // fans, pump, comms, displays
    whPerKm: 12, // extra cooling from locomotion
    climbMassKg: 200, // astronaut + suit + tools
    climbEfficiency: 0.25, // metabolic → cooling load
    dwellMin: 30,
    sortieLimitH: 8,
    walkbackKm: 5,
    o2KgPerH: 0.08,
  },
  rover: {
    id: "rover",
    label: "Crewed rover (unpressurised, LTV-class)",
    short: "Rover",
    flatSpeedKmh: 8,
    speedFactor: (g) => Math.max(0.25, 1 - Math.abs(g) * 3),
    cautionSlopeDeg: 12,
    noGoSlopeDeg: 20,
    batteryKWh: 30,
    hotelW: 250,
    whPerKm: 120,
    climbMassKg: 1500,
    climbEfficiency: 0.6,
    dwellMin: 45,
    sortieLimitH: 8,
    walkbackKm: 10,
    o2KgPerH: 0.16, // two crew
  },
};

export type Severity = 0 | 1 | 2; // ok · caution · no-go

export interface LegStats {
  index: number;
  fromName: string;
  toName: string;
  km: number;
  /** Cumulative distance at the end of the leg. */
  cumKm: number;
  maxSlopeDeg: number;
  gainM: number;
  lossM: number;
  hours: number;
  severity: Severity;
  hazards: HazardZone[];
}

export interface RouteSegment {
  coords: LonLat[];
  severity: Severity;
}

export interface ProfilePoint {
  km: number;
  at: LonLat;
  elevM: number;
  severity: Severity;
}

export interface MissionWarning {
  id: string;
  severity: 1 | 2;
  kind: "slope" | "hazard" | "range" | "battery" | "duration";
  title: string;
  detail: string;
  /** Where to fly to when the warning is clicked. */
  at?: LonLat;
}

export interface MissionAnalysis {
  totalKm: number;
  travelHours: number;
  dwellHours: number;
  totalHours: number;
  sols: number;
  energyKWh: number;
  batteryPct: number;
  o2Kg: number;
  gainM: number;
  lossM: number;
  maxSlopeDeg: number;
  maxRangeKm: number;
  startElevM: number;
  legs: LegStats[];
  segments: RouteSegment[];
  profile: ProfilePoint[];
  warnings: MissionWarning[];
}

export interface AnalyzeOptions {
  /** Names for each vertex of `path` (lander first). */
  names: string[];
  /** Geodesic length function — the planner passes OpenLayers' `getLength`. */
  lengthM?: (coords: LonLat[]) => number;
  /** Sample spacing along each leg (km). */
  stepKm?: number;
}

const EMPTY: MissionAnalysis = {
  totalKm: 0, travelHours: 0, dwellHours: 0, totalHours: 0, sols: 0, energyKWh: 0,
  batteryPct: 0, o2Kg: 0, gainM: 0, lossM: 0, maxSlopeDeg: 0, maxRangeKm: 0, startElevM: 0,
  legs: [], segments: [], profile: [], warnings: [],
};

const classify = (slope: number, p: MissionProfile, zones: HazardZone[]): Severity => {
  if (slope >= p.noGoSlopeDeg || zones.some((z) => z.noGoFor.includes(p.id))) return 2;
  if (slope >= p.cautionSlopeDeg || zones.length > 0) return 1;
  return 0;
};

/** Sample the route, then roll up distance, time, energy and warnings. */
export function analyzeRoute(
  path: LonLat[],
  profile: MissionProfile,
  { names, lengthM, stepKm = 0.025 }: AnalyzeOptions,
): MissionAnalysis {
  if (path.length < 2) {
    return path.length === 1 ? { ...EMPTY, startElevM: elevationAt(path[0][0], path[0][1]) } : EMPTY;
  }

  const legs: LegStats[] = [];
  const segments: RouteSegment[] = [];
  const profilePts: ProfilePoint[] = [];
  const warnings: MissionWarning[] = [];
  const hazardHits = new Map<string, { zone: HazardZone; at: LonLat; legs: Set<number> }>();
  let travelHours = 0;
  let climbJ = 0;
  let cum = 0;
  let worstSlope = { deg: 0, at: path[0], leg: 0 };
  profilePts.push({ km: 0, at: path[0], elevM: elevationAt(path[0][0], path[0][1]), severity: 0 });

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const legKm = greatCircleKm(a, b);
    const n = Math.max(1, Math.ceil(legKm / stepKm));
    const leg: LegStats = {
      index: i - 1, fromName: names[i - 1] ?? `Point ${i - 1}`, toName: names[i] ?? `Point ${i}`,
      km: legKm, cumKm: 0, maxSlopeDeg: 0, gainM: 0, lossM: 0, hours: 0, severity: 0, hazards: [],
    };
    const legZones = new Map<string, HazardZone>();

    let prev: LonLat = a;
    let prevZ = elevationAt(a[0], a[1]);
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      // Linear interpolation in lon/lat is fine at crater scale (< 0.1% error).
      const p: LonLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const z = elevationAt(p[0], p[1]);
      const dKm = legKm / n;
      const dz = z - prevZ;
      const grade = dz / (dKm * 1000);
      const slope = slopeAt(p[0], p[1]);
      const zones = hazardsAt(p[0], p[1]);
      const sev = classify(slope, profile, zones);

      leg.hours += dKm / (profile.flatSpeedKmh * profile.speedFactor(grade));
      if (dz > 0) {
        leg.gainM += dz;
        climbJ += (profile.climbMassKg * MARS_G * dz) / profile.climbEfficiency;
      } else leg.lossM -= dz;
      if (slope > leg.maxSlopeDeg) leg.maxSlopeDeg = slope;
      if (slope > worstSlope.deg) worstSlope = { deg: slope, at: p, leg: i - 1 };
      if (sev > leg.severity) leg.severity = sev;
      for (const zone of zones) {
        legZones.set(zone.id, zone);
        const hit = hazardHits.get(zone.id) ?? { zone, at: p, legs: new Set<number>() };
        hit.legs.add(i - 1);
        hazardHits.set(zone.id, hit);
      }

      // Merge consecutive samples of equal severity into coloured route segments.
      const last = segments[segments.length - 1];
      if (last && last.severity === sev) last.coords.push(p);
      else segments.push({ coords: last ? [last.coords[last.coords.length - 1], p] : [prev, p], severity: sev });

      cum += dKm;
      if (s % 4 === 0 || s === n) profilePts.push({ km: cum, at: p, elevM: z, severity: sev });
      prev = p;
      prevZ = z;
    }
    leg.cumKm = cum;
    leg.hazards = [...legZones.values()];
    travelHours += leg.hours;
    legs.push(leg);
  }

  // Prefer the caller's geodesic length (OpenLayers), fall back to the sampled sum.
  const totalKm = lengthM ? lengthM(path) / 1000 : cum;

  const isLoop =
    path.length > 2 &&
    path[0][0] === path[path.length - 1][0] &&
    path[0][1] === path[path.length - 1][1];
  const stops = path.length - 1 - (isLoop ? 1 : 0);
  const dwellHours = (stops * profile.dwellMin) / 60;
  const totalHours = travelHours + dwellHours;
  const energyKWh =
    (profile.hotelW * totalHours + profile.whPerKm * totalKm + climbJ / 3600) / 1000;
  const batteryPct = (energyKWh / profile.batteryKWh) * 100;
  const sols = Math.max(1, Math.ceil(totalHours / profile.sortieLimitH));

  // Farthest straight-line distance from the lander along the route (walk-back rule).
  let maxRange = { km: 0, at: path[0], name: names[0] };
  path.forEach((p, i) => {
    const [e, n] = offsetKm(p, path[0]);
    const km = Math.hypot(e, n);
    if (km > maxRange.km) maxRange = { km, at: p, name: names[i] ?? `Point ${i}` };
  });

  // --- Warnings -------------------------------------------------------------
  if (worstSlope.deg >= profile.cautionSlopeDeg) {
    const nogo = worstSlope.deg >= profile.noGoSlopeDeg;
    warnings.push({
      id: "slope",
      severity: nogo ? 2 : 1,
      kind: "slope",
      title: `${nogo ? "No-go" : "Steep"} slope ${worstSlope.deg.toFixed(0)}° on leg ${worstSlope.leg + 1}`,
      detail: `${profile.short} limits: caution ≥ ${profile.cautionSlopeDeg}°, no-go ≥ ${profile.noGoSlopeDeg}°. Consider re-routing around the steepest section.`,
      at: worstSlope.at,
    });
  }
  hazardHits.forEach(({ zone, at, legs: hitLegs }) => {
    const nogo = zone.noGoFor.includes(profile.id);
    warnings.push({
      id: `hazard-${zone.id}`,
      severity: nogo ? 2 : 1,
      kind: "hazard",
      title: `${zone.name} — leg ${[...hitLegs].map((l) => l + 1).join(", ")}`,
      detail: zone.note + (nogo ? ` No-go for ${profile.short}.` : ""),
      at,
    });
  });
  if (maxRange.km > profile.walkbackKm) {
    warnings.push({
      id: "range",
      severity: 2,
      kind: "range",
      title: `${maxRange.name} is ${maxRange.km.toFixed(1)} km from the lander`,
      detail: `Exceeds the ${profile.walkbackKm} km walk-back limit for ${profile.short} sorties.`,
      at: maxRange.at,
    });
  }
  if (batteryPct > 80) {
    warnings.push({
      id: "battery",
      severity: batteryPct > 100 ? 2 : 1,
      kind: "battery",
      title: `Battery use ${batteryPct.toFixed(0)}% of ${profile.batteryKWh} kWh`,
      detail:
        batteryPct > 100
          ? "Route needs a recharge stop or must be split across sorties."
          : "Less than 20% reserve at the end of the route.",
    });
  }
  if (totalHours > profile.sortieLimitH * 0.85) {
    const over = totalHours > profile.sortieLimitH;
    warnings.push({
      id: "duration",
      severity: over && profile.id === "eva" ? 2 : 1,
      kind: "duration",
      title: `${totalHours.toFixed(1)} h total vs ${profile.sortieLimitH} h sortie limit`,
      detail:
        profile.id === "eva"
          ? "Exceeds suit consumables margin — shorten the EVA or drop a stop."
          : `Plan this as a ${sols}-sol traverse.`,
    });
  }
  warnings.sort((x, y) => y.severity - x.severity);

  return {
    totalKm,
    travelHours,
    dwellHours,
    totalHours,
    sols,
    energyKWh,
    batteryPct,
    o2Kg: profile.o2KgPerH * totalHours,
    gainM: legs.reduce((s, l) => s + l.gainM, 0),
    lossM: legs.reduce((s, l) => s + l.lossM, 0),
    maxSlopeDeg: worstSlope.deg,
    maxRangeKm: maxRange.km,
    startElevM: elevationAt(path[0][0], path[0][1]),
    legs,
    segments,
    profile: profilePts,
    warnings,
  };
}

export function formatHours(h: number): string {
  const mins = Math.round(h * 60);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} m`;
}
