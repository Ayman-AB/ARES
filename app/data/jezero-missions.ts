import type { LonLat } from "../lib/mars-geo";

/**
 * Jezero Crater planning data.
 *
 * Positions are approximate (±~200 m), read off public Perseverance traverse
 * maps for demo purposes. Octavia E. Butler is the published landing point;
 * "Base Camp" sites are hypothetical crewed-outpost locations.
 */

export type SiteKind = "lander" | "science";

export interface JezeroSite {
  id: string;
  name: string;
  kind: SiteKind;
  lon: number;
  lat: number;
  /** Geologic unit / context, one short line. */
  unit: string;
  summary: string;
  /** What we'd do there. */
  tasks?: string[];
  hypothetical?: boolean;
}

export const LANDER_SITES: JezeroSite[] = [
  {
    id: "oeb",
    name: "Octavia E. Butler Landing",
    kind: "lander",
    lon: 77.4508,
    lat: 18.4447,
    unit: "Crater floor (Máaz formation)",
    summary: "Perseverance touchdown point, 18 Feb 2021. Flat, rock-strewn floor east of the delta.",
  },
  {
    id: "camp-alpha",
    name: "Base Camp Alpha",
    kind: "lander",
    lon: 77.478,
    lat: 18.468,
    unit: "Crater floor, smooth plains",
    summary: "Hypothetical crewed lander on low-slope floor north-east of the landing site.",
    hypothetical: true,
  },
  {
    id: "camp-bravo",
    name: "Base Camp Bravo",
    kind: "lander",
    lon: 77.43,
    lat: 18.51,
    unit: "Northern floor near the delta's north lobe",
    summary: "Hypothetical outpost closer to Neretva Vallis and the northern delta margin.",
    hypothetical: true,
  },
];

export const SCIENCE_SITES: JezeroSite[] = [
  {
    id: "artuby",
    name: "Artuby Ridge",
    kind: "science",
    lon: 77.448,
    lat: 18.432,
    unit: "Máaz formation (layered igneous floor)",
    summary: "Ridge exposing the layered, basaltic-andesitic lavas or cumulates that pave the crater floor.",
    tasks: ["Abrasion patch + PIXL chemistry", "Mastcam-Z stratigraphic panorama"],
  },
  {
    id: "seitah",
    name: "Séítah",
    kind: "science",
    lon: 77.432,
    lat: 18.424,
    unit: "Séítah formation (olivine cumulate)",
    summary: "Olivine-rich igneous rock altered by water; sampled as 'Bellegarde'. Surrounded by sand ridges.",
    tasks: ["Core olivine cumulate", "Map aqueous alteration rinds"],
  },
  {
    id: "three-forks",
    name: "Three Forks Depot",
    kind: "science",
    lon: 77.413,
    lat: 18.451,
    unit: "Delta-front apron",
    summary: "First Mars sample depot: 10 sealed tubes left on the surface for possible return.",
    tasks: ["Inspect depot tube layout", "Photogrammetry for retrieval planning"],
  },
  {
    id: "enchanted-lake",
    name: "Enchanted Lake",
    kind: "science",
    lon: 77.409,
    lat: 18.457,
    unit: "Lower delta-front sediments",
    summary: "Fine-grained, thinly bedded rocks at the base of the delta: lake-bottom mudstones.",
    tasks: ["Search for grain-size sorting", "SHERLOC organics scan"],
  },
  {
    id: "hawksbill-gap",
    name: "Hawksbill Gap",
    kind: "science",
    lon: 77.403,
    lat: 18.464,
    unit: "Delta-front scarp",
    summary: "Route up the ~40 m delta front exposing a full stack of river and lake sediments.",
    tasks: ["Measure section up the scarp", "Collect sandstone core"],
  },
  {
    id: "wildcat-ridge",
    name: "Wildcat Ridge",
    kind: "science",
    lon: 77.399,
    lat: 18.468,
    unit: "Delta front, sulfate-bearing mudstone",
    summary: "Fine mudstone from an evaporating lake: highest organic signal found during the delta campaign.",
    tasks: ["Re-image sample site", "Map sulfate veins"],
  },
  {
    id: "belva",
    name: "Belva Crater",
    kind: "science",
    lon: 77.375,
    lat: 18.487,
    unit: "Upper delta (fan top)",
    summary: "~900 m impact crater whose walls act as a natural road-cut through the upper delta beds.",
    tasks: ["Rim-top stereo of crater wall bedding", "Boulder survey"],
  },
  {
    id: "bright-angel",
    name: "Bright Angel (Cheyava Falls)",
    kind: "science",
    lon: 77.352,
    lat: 18.528,
    unit: "Margin of Neretva Vallis",
    summary: "Light-toned outcrop where 'Cheyava Falls' showed leopard-spot reaction fronts: a potential biosignature.",
    tasks: ["Context imaging of leopard spots", "Search for sister outcrops"],
  },
  {
    id: "neretva",
    name: "Neretva Vallis Inlet",
    kind: "science",
    lon: 77.3,
    lat: 18.548,
    unit: "Inlet channel",
    summary: "Ancient river channel that fed Jezero lake: boulders here sample the upstream watershed.",
    tasks: ["Boulder-train lithology census", "Channel cross-section profile"],
  },
  {
    id: "western-rim",
    name: "Western Rim (Lookout Hill)",
    kind: "science",
    lon: 77.235,
    lat: 18.49,
    unit: "Crater rim, megabreccia",
    summary: "Uplifted ancient crust and impact breccia: the oldest rocks reachable from Jezero.",
    tasks: ["Sample megabreccia blocks", "360° panorama of the crater"],
  },
];

export const ALL_SITES: JezeroSite[] = [...LANDER_SITES, ...SCIENCE_SITES];
export const siteById = (id: string | undefined) => ALL_SITES.find((s) => s.id === id);

export interface Waypoint {
  id: string;
  name: string;
  lon: number;
  lat: number;
  /** Linked science site, if the waypoint was snapped to one. */
  siteId?: string;
}

export interface LanderPoint {
  /** Lander site id, or undefined for a point picked on the map. */
  siteId?: string;
  name: string;
  lon: number;
  lat: number;
}

export type ProfileId = "eva" | "rover";

export interface Mission {
  id: string;
  name: string;
  preset: boolean;
  profileId: ProfileId;
  lander: LanderPoint;
  waypoints: Waypoint[];
  /** Close the loop back to the lander. */
  returnToLander: boolean;
  /** One-paragraph scientific background. */
  background: string;
  objectives: string[];
}

export const landerPoint = (siteId: string): LanderPoint => {
  const s = LANDER_SITES.find((l) => l.id === siteId) ?? LANDER_SITES[0];
  return { siteId: s.id, name: s.name, lon: s.lon, lat: s.lat };
};

export const waypointFromSite = (siteId: string, index: number): Waypoint => {
  const s = siteById(siteId);
  if (!s) throw new Error(`Unknown Jezero site "${siteId}"`);
  return { id: `wp-${siteId}-${index}`, name: s.name, lon: s.lon, lat: s.lat, siteId };
};

const sites = (ids: string[]) => ids.map(waypointFromSite);

export const PRESET_MISSIONS: Mission[] = [
  {
    id: "delta-traverse",
    name: "Jezero Delta Traverse",
    preset: true,
    profileId: "rover",
    lander: landerPoint("oeb"),
    waypoints: sites(["three-forks", "enchanted-lake", "hawksbill-gap", "wildcat-ridge", "belva"]),
    returnToLander: false,
    background:
      "About 3.5 billion years ago a river cut through Jezero's western rim and built a fan-shaped delta into a crater lake. Deltas bury fine sediment quickly, which is exactly how organic matter and microbial textures are preserved on Earth. This traverse climbs from the lake-floor apron, up the delta-front scarp, to the fan top, reading the rock record from deep-water muds to river sands.",
    objectives: [
      "Characterise the delta stratigraphy from lake-bottom mudstones to fluvial sandstones.",
      "Search for organic molecules and potential biosignatures in fine-grained, sulfate-rich layers.",
      "Document the Three Forks sample depot for future retrieval.",
      "Use Belva crater's walls as a natural cross-section of the upper delta.",
    ],
  },
  {
    id: "floor-seitah",
    name: "Crater Floor & Séítah Survey",
    preset: true,
    profileId: "eva",
    lander: landerPoint("oeb"),
    waypoints: sites(["artuby", "seitah"]),
    returnToLander: true,
    background:
      "Jezero's floor is not lake mud but igneous rock: the Máaz lavas on top and the olivine-rich Séítah cumulate below. Both were later altered by water, so they record when the lake existed and what its chemistry was. Séítah is ringed by sand ridges that Perseverance had to drive around, which makes it a good test of EVA hazard planning.",
    objectives: [
      "Determine the igneous origin and age context of the crater floor units.",
      "Quantify aqueous alteration (carbonates, salts) in olivine-rich rock.",
      "Rehearse a short loop EVA inside the walk-back limit, avoiding the Séítah sand ridges.",
    ],
  },
  {
    id: "rim-ascent",
    name: "Neretva Vallis & Rim Ascent",
    preset: true,
    profileId: "rover",
    lander: landerPoint("camp-bravo"),
    waypoints: sites(["bright-angel", "neretva", "western-rim"]),
    returnToLander: false,
    background:
      "North of the delta, the Neretva Vallis inlet channel carried water and boulders from the watershed beyond the rim. Its margin hosts Bright Angel, where the 'Cheyava Falls' rock showed reaction-front textures that are among the strongest potential biosignatures yet found on Mars. The traverse ends on the western rim, where impact megabreccia exposes crust older than the crater itself.",
    objectives: [
      "Re-examine the Bright Angel outcrop and look for related light-toned rocks.",
      "Census boulder lithologies to sample the upstream watershed.",
      "Reach the rim to sample pre-Jezero crust and image the full crater.",
    ],
  },
];

export const MISSION_STORAGE_KEY = "ares.jezero.missions.v1";

/** Waypoint positions in route order (lander first; optional return leg). */
export function missionPath(m: Pick<Mission, "lander" | "waypoints" | "returnToLander">): LonLat[] {
  const start: LonLat = [m.lander.lon, m.lander.lat];
  const path: LonLat[] = [start, ...m.waypoints.map((w): LonLat => [w.lon, w.lat])];
  if (m.returnToLander && m.waypoints.length > 0) path.push(start);
  return path;
}
