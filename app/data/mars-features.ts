export type MarsPlaceKind =
  | "volcano"
  | "canyon"
  | "basin"
  | "crater"
  | "landing-site"
  | "custom";

export const MARKER_STYLES: Record<
  MarsPlaceKind,
  { label: string; hex: string; dot: string }
> = {
  volcano: { label: "Volcano", hex: "#ef4444", dot: "bg-red-500" },
  canyon: { label: "Canyon", hex: "#f59e0b", dot: "bg-amber-500" },
  basin: { label: "Basin", hex: "#3b82f6", dot: "bg-blue-500" },
  crater: { label: "Crater", hex: "#a855f7", dot: "bg-purple-500" },
  "landing-site": { label: "Landing site", hex: "#22c55e", dot: "bg-green-500" },
  custom: { label: "My marker", hex: "#e2e8f0", dot: "bg-slate-200" },
};

export interface MarsPlace {
  id: string;
  name: string;
  kind: MarsPlaceKind;
  lon: number;
  lat: number;
  description?: string;
  userAdded?: boolean;
}

export const MARS_PLACES: MarsPlace[] = [
  { id: "olympus-mons", name: "Olympus Mons", kind: "volcano", lon: -133.8, lat: 18.65, description: "Largest known volcano in the solar system." },
  { id: "elysium-mons", name: "Elysium Mons", kind: "volcano", lon: 147.21, lat: 25.02, description: "Shield volcano in the Elysium volcanic province." },
  { id: "arsia-mons", name: "Arsia Mons", kind: "volcano", lon: -120.1, lat: -8.35, description: "One of the three Tharsis Montes shield volcanoes." },
  { id: "valles-marineris", name: "Valles Marineris", kind: "canyon", lon: -59, lat: -14, description: "Canyon system along the equator, thousands of km long." },
  { id: "hellas-planitia", name: "Hellas Planitia", kind: "basin", lon: 70.5, lat: -42.4, description: "Among the largest impact basins in the solar system." },
  { id: "gale-crater", name: "Gale Crater", kind: "crater", lon: 137.8, lat: -5.4, description: "Explored by NASA's Curiosity rover since 2012." },
  { id: "jezero-crater", name: "Jezero Crater", kind: "crater", lon: 77.58, lat: 18.38, description: "Ancient river delta; explored by Perseverance since 2021." },
  { id: "viking-2", name: "Viking 2 landing site", kind: "landing-site", lon: -134.26, lat: 47.97, description: "Viking 2 lander touched down here in 1976." },
  { id: "insight", name: "InSight landing site", kind: "landing-site", lon: 135.62, lat: 4.5, description: "InSight lander (2018) studied the Martian interior." },
];