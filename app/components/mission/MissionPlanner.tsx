"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type OLMap from "ol/Map";
import type BaseLayer from "ol/layer/Base";
import type Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import type Point from "ol/geom/Point";
import Translate from "ol/interaction/Translate";
import { boundingExtent, containsCoordinate } from "ol/extent";
import { unByKey } from "ol/Observable";
import type Collection from "ol/Collection";

import { MARS_EXTENT } from "../../config/mars-map";
import {
  ALL_SITES,
  LANDER_SITES,
  MISSION_STORAGE_KEY,
  PRESET_MISSIONS,
  landerPoint,
  missionPath,
  siteById,
  type JezeroSite,
  type Mission,
  type ProfileId,
} from "../../data/jezero-missions";
import { elevationAt, slopeAt } from "../../lib/jezero-terrain";
import {
  formatLonLat,
  formatLonLatArray,
  lineStringLengthM,
  type LonLat,
} from "../../lib/mars-geo";
import { MISSION_PROFILES, analyzeRoute } from "../../lib/mission-sim";
import LayerSwitcher from "../map/LayerSwitcher";
import MapComponent from "../map/MapComponent";
import MapLegend, { type MapLegendGroup } from "../map/MapLegend";
import { focusLayerCoverage } from "../map/focusLayerCoverage";
import { useMarsLayers } from "../map/useMarsLayers";
import MissionDashboard from "./MissionDashboard";
import { MissionEditor, MissionLibrary, type PlannerTool } from "./MissionEditor";
import {
  LANDER_FEATURE_ID,
  HAZARD_RGB,
  SEVERITY_HEX,
  createHazardLayer,
  createProbeLayer,
  createRouteLayer,
  createSiteLayer,
  createWaypointLayer,
  setMissionPoints,
  setProbe,
  setRouteSegments,
} from "./missionLayers";

type Tab = "overview" | "mission" | "layers";

interface ClickEntry {
  id: number;
  lon: number;
  lat: number;
  action: string;
}

interface VectorLayers {
  route: ReturnType<typeof createRouteLayer>;
  waypoints: ReturnType<typeof createWaypointLayer>;
  sites: ReturnType<typeof createSiteLayer>;
  hazards: ReturnType<typeof createHazardLayer>;
  probe: ReturnType<typeof createProbeLayer>;
}

const NO_LAYERS: BaseLayer[] = [];
const uid = () => Math.random().toString(36).slice(2, 9);
const routeLength = (coords: LonLat[]) => lineStringLengthM(new LineString(coords));

const describeCursor = (lon: number, lat: number) =>
  `elev ${Math.round(elevationAt(lon, lat)).toLocaleString()} m · ${slopeAt(lon, lat).toFixed(0)}° (sim)`;

function loadCustomMissions(): Mission[] {
  try {
    const raw = window.localStorage.getItem(MISSION_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Mission[]).filter((m) => m && m.id && m.lander) : [];
  } catch {
    return [];
  }
}

function downloadGeoJSON(mission: Mission, path: LonLat[], summary: Record<string, unknown>) {
  const fc = {
    type: "FeatureCollection",
    // Non-Earth body: coordinates are IAU Mars 2000 planetocentric lon/lat, east-positive.
    crs: { type: "name", properties: { name: "IAU:49900" } },
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: path },
        properties: { kind: "route", name: mission.name, profile: mission.profileId, ...summary },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [mission.lander.lon, mission.lander.lat] },
        properties: { kind: "lander", name: mission.lander.name },
      },
      ...mission.waypoints.map((w, i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [w.lon, w.lat] },
        properties: { kind: "waypoint", order: i + 1, name: w.name, siteId: w.siteId ?? null },
      })),
    ],
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${mission.name.replace(/[^\w-]+/g, "_") || "mission"}.geojson`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MissionPlanner() {
  const layerControls = useMarsLayers("ctx-mosaic");
  const { tileLayers, tileError } = layerControls;
  const { setOverlay } = layerControls;
  const [map, setMap] = useState<OLMap | null>(null);
  const [vec, setVec] = useState<VectorLayers | null>(null);

  // --- Mission state -----------------------------------------------------------
  const [customs, setCustoms] = useState<Mission[]>([]);
  const storageReady = useRef(false);
  const [activeId, setActiveId] = useState(PRESET_MISSIONS[0].id);
  const [draft, setDraft] = useState<Mission | null>(null);
  const [draftIsNew, setDraftIsNew] = useState(false);
  const [profileOverride, setProfileOverride] = useState<ProfileId | null>(null);
  const [tool, setTool] = useState<PlannerTool>("pan");
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedWp, setSelectedWp] = useState<string | null>(null);
  const [siteInfo, setSiteInfo] = useState<JezeroSite | null>(null);
  const [showHazards, setShowHazards] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const [clickLog, setClickLog] = useState<ClickEntry[]>([]);
  const clickSeq = useRef(0);

  useEffect(() => {
    // Custom missions are hydrated from browser-only localStorage after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustoms(loadCustomMissions());
    storageReady.current = true;
  }, []);
  useEffect(() => {
    if (!storageReady.current) return;
    try {
      window.localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(customs));
    } catch {
      /* storage unavailable (private mode / quota): missions stay in memory */
    }
  }, [customs]);

  const saved = useMemo(
    () => [...PRESET_MISSIONS, ...customs].find((m) => m.id === activeId) ?? PRESET_MISSIONS[0],
    [customs, activeId],
  );
  const mission = draft ?? saved;
  const profileId: ProfileId = draft ? draft.profileId : (profileOverride ?? saved.profileId);
  const profile = MISSION_PROFILES[profileId];

  // --- Client-side route analysis -------------------------------------------------
  const path = useMemo(() => missionPath(mission), [mission]);
  const analysis = useMemo(() => {
    const names = [mission.lander.name, ...mission.waypoints.map((w) => w.name)];
    if (mission.returnToLander && mission.waypoints.length) names.push(mission.lander.name);
    return analyzeRoute(path, profile, { names, lengthM: routeLength });
  }, [mission, path, profile]);

  // --- Vector layers (created once on the client) ---------------------------------
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    const v: VectorLayers = {
      route: createRouteLayer(),
      waypoints: createWaypointLayer(() => selectedRef.current),
      sites: createSiteLayer(ALL_SITES),
      hazards: createHazardLayer(),
      probe: createProbeLayer(),
    };
    setVec(v);
    return () => Object.values(v).forEach((l) => l.dispose());
  }, []);

  const layers = useMemo(
    () =>
      vec && tileLayers.length
        ? [...tileLayers, vec.hazards, vec.sites, vec.route, vec.waypoints, vec.probe]
        : NO_LAYERS,
    [vec, tileLayers],
  );

  useEffect(() => {
    if (vec) setRouteSegments(vec.route, analysis.segments);
  }, [vec, analysis.segments]);

  useEffect(() => {
    if (vec) setMissionPoints(vec.waypoints, mission);
  }, [vec, mission]);

  useEffect(() => {
    selectedRef.current = selectedWp;
    vec?.waypoints.changed();
  }, [vec, selectedWp]);

  useEffect(() => {
    vec?.hazards.setVisible(showHazards);
    vec?.sites.setVisible(showSites);
  }, [vec, showHazards, showSites]);

  // --- Camera ---------------------------------------------------------------------
  const flyTo = useCallback(
    (at: LonLat, minZoom = 12) => {
      const view = map?.getView();
      if (!view) return;
      view.animate({ center: at, zoom: Math.max(view.getZoom() ?? 0, minZoom), duration: 550 });
    },
    [map],
  );
  const changeOverlay = useCallback(
    (id: string, patch: Parameters<typeof setOverlay>[1]) => {
      setOverlay(id, patch);
      if (patch.visible) focusLayerCoverage(map, id);
    },
    [map, setOverlay],
  );

  // Frame the whole route whenever a different mission is opened.
  const fitKey = draft ? `draft:${draft.id}` : activeId;
  const pathRef = useRef(path);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  useEffect(() => {
    if (!map) return;
    const pts = pathRef.current;
    const extent = boundingExtent(pts.length > 1 ? pts : [pts[0], [pts[0][0] + 0.04, pts[0][1] + 0.04]]);
    map.getView().fit(extent, { padding: [70, 70, 90, 70], maxZoom: 12.5, duration: 600 });
  }, [map, fitKey]);

  // --- Interactions ---------------------------------------------------------------
  const editing = draft !== null;
  const draftRef = useRef(draft);
  const toolRef = useRef(tool);
  useEffect(() => {
    draftRef.current = draft;
    toolRef.current = tool;
  }, [draft, tool]);

  const logClick = useCallback((lon: number, lat: number, action: string) => {
    const id = ++clickSeq.current;
    console.info(`[jezero] click ${formatLonLatArray([lon, lat])} → ${action}`);
    setClickLog((prev) => [{ id, lon, lat, action }, ...prev].slice(0, 6));
  }, []);

  // Map clicks: inspect, drop waypoints, or place the lander.
  useEffect(() => {
    if (!map || !vec) return;
    const key = map.on("singleclick", (e) => {
      if (!containsCoordinate(MARS_EXTENT, e.coordinate)) return;
      const [lon, lat] = e.coordinate;
      const hitOn = (layer: BaseLayer) =>
        map.forEachFeatureAtPixel(e.pixel, (f) => f as Feature<Point>, {
          layerFilter: (l) => l === layer,
          hitTolerance: 8,
        });
      const wpHit = hitOn(vec.waypoints);
      const siteHit = vec.sites.getVisible() ? hitOn(vec.sites) : undefined;
      const site = siteHit ? siteById(String(siteHit.getId()).replace("site:", "")) : undefined;
      const current = draftRef.current;
      const t = toolRef.current;

      if (current && t === "lander") {
        const lander =
          site?.kind === "lander"
            ? landerPoint(site.id)
            : { name: "Custom lander", lon, lat };
        setDraft({ ...current, lander });
        setTool("waypoint");
        logClick(lander.lon, lander.lat, `lander → ${lander.name}`);
        return;
      }

      if (current && t === "waypoint" && !wpHit) {
        const n = current.waypoints.length + 1;
        const wp =
          site && site.kind === "science"
            ? { id: `wp-${uid()}`, name: site.name, lon: site.lon, lat: site.lat, siteId: site.id }
            : { id: `wp-${uid()}`, name: `WP ${n}`, lon, lat };
        setDraft({ ...current, waypoints: [...current.waypoints, wp] });
        setSelectedWp(wp.id);
        logClick(wp.lon, wp.lat, `waypoint ${n} added${wp.siteId ? ` (${wp.name})` : ""}`);
        return;
      }

      // Inspect
      if (wpHit) {
        const id = String(wpHit.getId());
        setSelectedWp(id === LANDER_FEATURE_ID ? null : id);
        setSiteInfo(null);
      } else {
        setSelectedWp(null);
        setSiteInfo(site ?? null);
      }
      logClick(lon, lat, wpHit ? `selected ${wpHit.get("name")}` : site ? `site ${site.name}` : "inspect");
    });
    return () => unByKey(key);
  }, [map, vec, logClick]);

  // Drag waypoints / lander while editing.
  useEffect(() => {
    if (!map || !vec || !editing) return;
    const translate = new Translate({ layers: [vec.waypoints], hitTolerance: 6 });
    translate.on("translateend", (e) => {
      const [x0, y0] = e.startCoordinate;
      const [x1, y1] = e.coordinate;
      if (x0 === x1 && y0 === y1) return; // plain click, not a drag
      const features = (e.features as Collection<Feature<Point>>).getArray();
      const current = draftRef.current;
      if (!current) return;
      let next = current;
      for (const f of features) {
        const [lon, lat] = f.getGeometry()!.getCoordinates();
        const id = String(f.getId());
        if (id === LANDER_FEATURE_ID) {
          next = { ...next, lander: { name: "Custom lander", lon, lat } };
        } else {
          next = {
            ...next,
            waypoints: next.waypoints.map((w) =>
              w.id === id ? { ...w, lon, lat, siteId: undefined } : w,
            ),
          };
        }
        logClick(lon, lat, `moved ${f.get("name")}`);
      }
      setDraft(next);
    });
    map.addInteraction(translate);
    return () => {
      map.removeInteraction(translate);
    };
  }, [map, vec, editing, logClick]);

  // Cursor feedback + Esc to leave a tool.
  useEffect(() => {
    if (!map || !vec) return;
    const viewport = map.getViewport();
    if (!viewport) return;
    viewport.classList.toggle("cursor-crosshair", tool !== "pan");
    const key = map.on("pointermove", (e) => {
      if (e.dragging) return;
      const overWp =
        editing && map.hasFeatureAtPixel(e.pixel, { layerFilter: (l) => l === vec.waypoints, hitTolerance: 6 });
      viewport.style.cursor = overWp ? "grab" : "";
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) setTool("pan");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unByKey(key);
      window.removeEventListener("keydown", onKey);
      viewport.classList.remove("cursor-crosshair");
      viewport.style.cursor = "";
    };
  }, [map, vec, tool, editing]);

  // --- Mission actions --------------------------------------------------------------
  const startDraft = (m: Mission, isNew: boolean) => {
    setDraft(m);
    setDraftIsNew(isNew);
    setTab("mission");
    setSelectedWp(null);
    setTool(m.waypoints.length ? "pan" : "waypoint");
  };

  const newMission = () =>
    startDraft(
      {
        id: `custom-${uid()}`,
        name: "",
        preset: false,
        profileId: "eva",
        lander: landerPoint(LANDER_SITES[0].id),
        waypoints: [],
        returnToLander: true,
        background: "",
        objectives: [],
      },
      true,
    );

  const duplicate = () =>
    startDraft(
      {
        ...saved,
        id: `custom-${uid()}`,
        name: `${saved.name} (copy)`,
        preset: false,
        profileId,
        waypoints: saved.waypoints.map((w) => ({ ...w, id: `wp-${uid()}` })),
        objectives: [...saved.objectives],
      },
      true,
    );

  const saveDraft = () => {
    if (!draft) return;
    const clean: Mission = {
      ...draft,
      name: draft.name.trim(),
      objectives: draft.objectives.map((o) => o.trim()).filter(Boolean),
      background: draft.background.trim(),
    };
    setCustoms((prev) =>
      prev.some((m) => m.id === clean.id) ? prev.map((m) => (m.id === clean.id ? clean : m)) : [...prev, clean],
    );
    setActiveId(clean.id);
    setProfileOverride(null);
    setDraft(null);
    setTool("pan");
    setTab("overview");
  };

  const cancelDraft = () => {
    setDraft(null);
    setTool("pan");
    setSelectedWp(null);
  };

  const selectMission = (id: string) => {
    setActiveId(id);
    setProfileOverride(null);
    setSelectedWp(null);
    setSiteInfo(null);
  };

  const selectWaypoint = (id: string) => {
    setSelectedWp(id);
    const w = mission.waypoints.find((x) => x.id === id);
    if (w) flyTo([w.lon, w.lat]);
  };

  const exportMission = () =>
    downloadGeoJSON(mission, path, {
      distance_km: +analysis.totalKm.toFixed(3),
      duration_h: +analysis.totalHours.toFixed(2),
      energy_kwh: +analysis.energyKWh.toFixed(3),
      battery_pct: +analysis.batteryPct.toFixed(1),
      max_slope_deg: +analysis.maxSlopeDeg.toFixed(1),
      warnings: analysis.warnings.map((w) => w.title),
    });

  const hint =
    tool === "waypoint" ? "Click to drop a waypoint · Esc to stop" : tool === "lander" ? "Click to place the lander · Esc to cancel" : null;

  const mapLegendGroups = useMemo<MapLegendGroup[]>(() => {
    const groups: MapLegendGroup[] = [
      {
        title: "Route screening",
        description: "Modeled terrain severity only; not a safety clearance.",
        items: [
          { label: "Within modeled limits", color: SEVERITY_HEX[0], shape: "line" },
          { label: "Caution threshold", color: SEVERITY_HEX[1], shape: "line" },
          { label: "No-go threshold", color: SEVERITY_HEX[2], shape: "line", dashed: true },
        ],
      },
      {
        title: "Mission markers",
        items: [
          { label: "Waypoint", color: "#fb923c", shape: "circle" },
          { label: "Lander", color: "#38bdf8", shape: "triangle" },
          ...(showSites
            ? [
                { label: "Science site", color: "#2dd4bf", shape: "diamond" as const },
                { label: "Lander site", color: "#38bdf8", shape: "diamond" as const },
              ]
            : []),
        ],
      },
    ];

    if (showHazards) {
      groups.push({
        title: "Approximate hazard zones",
        description: "Synthetic planning overlays, not remotely sensed obstacle data.",
        items: [
          { label: "Sand", color: `rgb(${HAZARD_RGB.sand})`, shape: "area" },
          { label: "Scarp", color: `rgb(${HAZARD_RGB.scarp})`, shape: "area" },
          { label: "Wall", color: `rgb(${HAZARD_RGB.wall})`, shape: "area" },
          { label: "Crater", color: `rgb(${HAZARD_RGB.crater})`, shape: "area" },
          { label: "Boulders", color: `rgb(${HAZARD_RGB.boulders})`, shape: "area" },
        ],
      });
    }

    return groups;
  }, [showHazards, showSites]);

  // --- Render ------------------------------------------------------------------------
  const tabBtn = (id: Tab, text: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
        tab === id ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-200"
      }`}
    >
      {text}
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Map column */}
      <div className="min-w-0 space-y-3">
        <MapComponent
          layers={layers}
          onMapReady={setMap}
          describeCoordinate={describeCursor}
          heightClassName="h-[62vh] min-h-[380px] lg:h-[calc(100vh-11rem)]"
        >
          <MapLegend
            baseId={layerControls.baseId}
            overlayState={layerControls.overlayState}
            placement="right"
            legendGroups={mapLegendGroups}
          />

          {/* Mission chip */}
          <div className="pointer-events-none absolute left-14 top-3 z-10 max-w-[calc(100%-8rem)] rounded-lg border border-white/10 bg-slate-950/85 px-3 py-2 shadow-lg backdrop-blur-md">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-200/70">
              {editing ? (draftIsNew ? "Planning new mission" : "Editing") : "Active mission"}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">
              {mission.name || "Untitled mission"}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-slate-400">
              {analysis.totalKm.toFixed(2)} km · {profile.short} ·{" "}
              {analysis.warnings.length ? `${analysis.warnings.length} alert${analysis.warnings.length > 1 ? "s" : ""}` : "no alerts"}
            </p>
          </div>

          {hint && (
            <div
              role="status"
              className="pointer-events-none absolute inset-x-0 bottom-20 z-10 mx-auto w-fit rounded-md bg-orange-500/90 px-3 py-1 text-xs font-medium text-white shadow"
            >
              {hint}
            </div>
          )}

          {tileError && (
            <div
              role="status"
              className="pointer-events-none absolute inset-x-0 top-20 z-10 mx-auto w-fit rounded-md bg-red-900/85 px-3 py-1 text-xs text-red-100 ring-1 ring-red-400/30"
            >
              Some imagery tiles failed to load: try another base layer
            </div>
          )}

          {/* Site info card */}
          {siteInfo && (
            <div className="absolute bottom-20 left-3 z-20 w-72 rounded-xl border border-teal-300/20 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-teal-200/70">
                    {siteInfo.kind === "lander" ? "Lander site" : "Science site"}
                    {siteInfo.hypothetical ? " · hypothetical" : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{siteInfo.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSiteInfo(null)}
                  aria-label="Close site details"
                  className="text-lg leading-none text-slate-500 hover:text-white"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 font-mono text-[10px] text-slate-500">
                {formatLonLat(siteInfo.lon, siteInfo.lat, 4)} · {siteInfo.unit}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-300">{siteInfo.summary}</p>
              {editing && siteInfo.kind === "science" && (
                <button
                  type="button"
                  onClick={() => {
                    const s = siteInfo;
                    setDraft((d) =>
                      d && { ...d, waypoints: [...d.waypoints, { id: `wp-${uid()}`, name: s.name, lon: s.lon, lat: s.lat, siteId: s.id }] },
                    );
                    setSiteInfo(null);
                  }}
                  className="mt-2.5 rounded-md bg-teal-400/15 px-2.5 py-1 text-[11px] font-medium text-teal-100 hover:bg-teal-400/25"
                >
                  + Add as waypoint
                </button>
              )}
            </div>
          )}
        </MapComponent>

        {/* Click log */}
        <div className="rounded-xl border border-white/[0.07] bg-[#0b1119] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Map click log <span className="font-normal normal-case tracking-normal text-slate-600">[lon, lat]</span>
            </h3>
            {clickLog.length > 0 && (
              <button
                type="button"
                onClick={() => setClickLog([])}
                className="text-[10px] text-slate-500 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
          {clickLog.length === 0 ? (
            <p className="mt-1.5 text-[11px] text-slate-600">Click anywhere on the map to log coordinates.</p>
          ) : (
            <ul className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {clickLog.map((c) => (
                <li key={c.id} className="flex items-center gap-2 font-mono text-[11px]">
                  <button
                    type="button"
                    title="Copy coordinates"
                    onClick={() => navigator.clipboard?.writeText(formatLonLatArray([c.lon, c.lat])).catch(() => {})}
                    className="text-slate-200 hover:text-orange-200"
                  >
                    {formatLonLatArray([c.lon, c.lat])}
                  </button>
                  <span className="truncate text-[10px] text-slate-500">{c.action}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <aside
        aria-label="Mission overview"
        className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080d14] text-slate-100 lg:h-[calc(100vh-11rem)] lg:min-h-[380px]"
      >
        <div className="border-b border-white/[0.07] bg-[#101923] px-4 pb-3 pt-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-orange-200/65">
            ARES / Jezero mission control
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-white">
            {mission.name || "Untitled mission"}
          </h2>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex rounded-lg border border-white/10 p-0.5" role="group" aria-label="Vehicle profile">
              {(Object.keys(MISSION_PROFILES) as ProfileId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={profileId === id}
                  onClick={() => (draft ? setDraft({ ...draft, profileId: id }) : setProfileOverride(id))}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                    profileId === id ? "bg-orange-400 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {MISSION_PROFILES[id].short}
                </button>
              ))}
            </div>
            <span className="truncate text-[10px] text-slate-500">
              {profile.label}
              {!draft && profileOverride && profileOverride !== saved.profileId ? " · what-if" : ""}
            </span>
          </div>
          <div role="tablist" className="mt-3 flex gap-1 rounded-xl bg-black/25 p-1">
            {tabBtn("overview", "Overview")}
            {tabBtn("mission", editing ? "Editor" : "Missions")}
            {tabBtn("layers", "Layers")}
          </div>
        </div>

        <div
          key={tab}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
          style={{ overflowAnchor: "none" }}
        >
          {tab === "overview" && (
            <MissionDashboard
              mission={mission}
              analysis={analysis}
              profile={profile}
              onFlyTo={(at) => flyTo(at)}
              onProbe={(at) => vec && setProbe(vec.probe, at)}
              selectedWaypointId={selectedWp}
              onSelectWaypoint={selectWaypoint}
            />
          )}

          {tab === "mission" &&
            (draft ? (
              <MissionEditor
                draft={draft}
                isNew={draftIsNew}
                onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
                onSave={saveDraft}
                onCancel={cancelDraft}
                tool={tool}
                onToolChange={setTool}
                selectedWaypointId={selectedWp}
                onSelectWaypoint={selectWaypoint}
              />
            ) : (
              <MissionLibrary
                presets={PRESET_MISSIONS}
                customs={customs}
                activeId={activeId}
                onSelect={selectMission}
                onNew={newMission}
                onDuplicate={duplicate}
                onEdit={() => startDraft(structuredClone(saved), false)}
                onDelete={(id) => {
                  setCustoms((prev) => prev.filter((m) => m.id !== id));
                  if (id === activeId) selectMission(PRESET_MISSIONS[0].id);
                }}
                onExport={exportMission}
              />
            ))}

          {tab === "layers" && (
            <div className="space-y-5">
              <LayerSwitcher
                baseId={layerControls.baseId}
                onBaseChange={layerControls.setBaseId}
                baseOpacity={layerControls.baseOpacity}
                onBaseOpacityChange={layerControls.setBaseOpacity}
                overlayState={layerControls.overlayState}
                onOverlayChange={changeOverlay}
              />
              <section>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="font-mono text-[10px] text-orange-300/80">03</span>
                  <h4 className="text-xs font-semibold tracking-wide text-slate-100">Planning layers</h4>
                </div>
                {(
                  [
                    ["Hazard zones", "Sand, scarps, crater walls, boulders", showHazards, setShowHazards],
                    ["Science & lander sites", "Teal = science · blue = lander", showSites, setShowSites],
                  ] as const
                ).map(([title, sub, on, set]) => (
                  <label key={title} className="flex cursor-pointer items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => set(e.target.checked)}
                      className="h-3.5 w-3.5 accent-orange-400"
                    />
                    <span>
                      <span className="block text-xs font-medium text-slate-200">{title}</span>
                      <span className="block text-[10px] text-slate-500">{sub}</span>
                    </span>
                  </label>
                ))}
                <p className="mt-2 text-[10px] leading-4 text-slate-600">
                  Slopes and elevations come from a simulated Jezero terrain model (no DEM service is
                  connected yet). Hazard outlines are approximate.
                </p>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
