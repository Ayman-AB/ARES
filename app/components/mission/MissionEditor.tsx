"use client";

import { useState } from "react";

import {
  LANDER_SITES,
  SCIENCE_SITES,
  landerPoint,
  type Mission,
  type ProfileId,
  type Waypoint,
} from "../../data/jezero-missions";
import { formatLonLat } from "../../lib/mars-geo";
import { MISSION_PROFILES } from "../../lib/mission-sim";

export type PlannerTool = "pan" | "waypoint" | "lander";

const label = "mb-1 block text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500";
const input =
  "w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:border-orange-300/50 focus:outline-none focus:ring-1 focus:ring-orange-300/40";
const smallBtn =
  "flex h-6 w-6 items-center justify-center rounded text-[11px] text-slate-400 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300";

// --- Library -----------------------------------------------------------------
interface MissionLibraryProps {
  presets: Mission[];
  customs: Mission[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}

export function MissionLibrary({
  presets,
  customs,
  activeId,
  onSelect,
  onNew,
  onDuplicate,
  onEdit,
  onDelete,
  onExport,
}: MissionLibraryProps) {
  const active = [...presets, ...customs].find((m) => m.id === activeId);
  const item = (m: Mission) => (
    <li key={m.id}>
      <button
        type="button"
        onClick={() => onSelect(m.id)}
        aria-pressed={m.id === activeId}
        className={`w-full rounded-xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
          m.id === activeId
            ? "border-orange-300/30 bg-gradient-to-r from-orange-300/[0.1] to-transparent"
            : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-slate-100">{m.name}</span>
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-slate-400">
            {MISSION_PROFILES[m.profileId].short}
          </span>
        </span>
        <span className="mt-1 block truncate text-[10px] text-slate-500">
          {m.lander.name} → {m.waypoints.length} waypoint{m.waypoints.length === 1 ? "" : "s"}
          {m.returnToLander ? " ↩" : ""}
        </span>
      </button>
    </li>
  );

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onNew}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-300/30 bg-orange-400/15 px-3 py-2.5 text-xs font-semibold text-orange-100 transition hover:bg-orange-400/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        <span className="text-base leading-none">＋</span> Create new mission
      </button>

      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Preset missions
        </h4>
        <ul className="space-y-1.5">{presets.map(item)}</ul>
      </section>

      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          My missions
        </h4>
        {customs.length ? (
          <ul className="space-y-1.5">{customs.map(item)}</ul>
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-slate-500">
            Saved in this browser. Create one or duplicate a preset.
          </p>
        )}
      </section>

      {active && (
        <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
          {active.preset ? (
            <button type="button" onClick={onDuplicate} className={libBtn}>
              Duplicate &amp; edit
            </button>
          ) : (
            <>
              <button type="button" onClick={onEdit} className={libBtn}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(active.id)}
                className={`${libBtn} text-red-200 hover:bg-red-400/10`}
              >
                Delete
              </button>
            </>
          )}
          <button type="button" onClick={onExport} className={libBtn}>
            Export GeoJSON
          </button>
        </div>
      )}
    </div>
  );
}

const libBtn =
  "rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300";

// --- Editor ------------------------------------------------------------------
interface MissionEditorProps {
  draft: Mission;
  isNew: boolean;
  onChange: (patch: Partial<Mission>) => void;
  onSave: () => void;
  onCancel: () => void;
  tool: PlannerTool;
  onToolChange: (tool: PlannerTool) => void;
  selectedWaypointId: string | null;
  onSelectWaypoint: (id: string) => void;
}

export function MissionEditor({
  draft,
  isNew,
  onChange,
  onSave,
  onCancel,
  tool,
  onToolChange,
  selectedWaypointId,
  onSelectWaypoint,
}: MissionEditorProps) {
  const [siteToAdd, setSiteToAdd] = useState("");
  const wps = draft.waypoints;
  const setWps = (waypoints: Waypoint[]) => onChange({ waypoints });
  const move = (i: number, d: -1 | 1) => {
    const next = [...wps];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setWps(next);
  };
  const landerValue = draft.lander.siteId ?? "__custom";
  const canSave = draft.name.trim().length > 0 && wps.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-orange-200/70">
          {isNew ? "New mission" : "Editing mission"}
        </p>
      </div>

      <div>
        <label htmlFor="m-name" className={label}>
          Mission name
        </label>
        <input
          id="m-name"
          className={input}
          value={draft.name}
          placeholder="e.g. Delta-top biosignature sortie"
          onChange={(e) => onChange({ name: e.target.value })}
          autoFocus={isNew}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="m-lander" className={label}>
            Start / lander
          </label>
          <select
            id="m-lander"
            className={input}
            value={landerValue}
            onChange={(e) => {
              if (e.target.value === "__pick") onToolChange("lander");
              else if (e.target.value !== "__custom") onChange({ lander: landerPoint(e.target.value) });
            }}
          >
            {LANDER_SITES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.hypothetical ? " (hyp.)" : ""}
              </option>
            ))}
            {landerValue === "__custom" && <option value="__custom">{draft.lander.name}</option>}
            <option value="__pick">Pick on map…</option>
          </select>
        </div>
        <div>
          <label htmlFor="m-profile" className={label}>
            Vehicle
          </label>
          <select
            id="m-profile"
            className={input}
            value={draft.profileId}
            onChange={(e) => onChange({ profileId: e.target.value as ProfileId })}
          >
            {Object.values(MISSION_PROFILES).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map tools */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1" role="group" aria-label="Map tool">
        {(
          [
            ["pan", "Pan"],
            ["waypoint", "+ Waypoint"],
            ["lander", "Set lander"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tool === id}
            onClick={() => onToolChange(id)}
            className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
              tool === id ? "bg-orange-400 text-slate-950" : "text-slate-300 hover:bg-white/[0.06]"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-[10px] leading-4 text-slate-500">
        {tool === "waypoint"
          ? "Click the map to drop waypoints. Clicking near a teal science site snaps to it. Drag markers to adjust."
          : tool === "lander"
            ? "Click the map to place the lander, or click a blue lander site."
            : "Drag waypoint markers to move them; switch to “+ Waypoint” to add more."}
      </p>

      {/* Waypoints */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={label}>Destination waypoints ({wps.length})</span>
        </div>
        {wps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-slate-500">
            No waypoints yet: click the map or add a science site below.
          </p>
        ) : (
          <ol className="space-y-1">
            {wps.map((w, i) => (
              <li
                key={w.id}
                className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 ${
                  w.id === selectedWaypointId ? "border-orange-300/30 bg-orange-300/[0.06]" : "border-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectWaypoint(w.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-orange-300/60 font-mono text-[10px] font-bold text-orange-200"
                  aria-label={`Locate waypoint ${i + 1}`}
                >
                  {i + 1}
                </button>
                <span className="min-w-0 flex-1">
                  <input
                    aria-label={`Waypoint ${i + 1} name`}
                    value={w.name}
                    onChange={(e) =>
                      setWps(wps.map((x) => (x.id === w.id ? { ...x, name: e.target.value } : x)))
                    }
                    className="w-full bg-transparent text-xs text-slate-100 focus:outline-none"
                  />
                  <span className="block font-mono text-[9px] text-slate-500">
                    {formatLonLat(w.lon, w.lat, 4)}
                  </span>
                </span>
                <button type="button" className={smallBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  ↑
                </button>
                <button type="button" className={smallBtn} disabled={i === wps.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  ↓
                </button>
                <button
                  type="button"
                  className={`${smallBtn} hover:text-red-200`}
                  onClick={() => setWps(wps.filter((x) => x.id !== w.id))}
                  aria-label={`Remove ${w.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-2 flex gap-1.5">
          <select
            aria-label="Science site to add"
            className={input}
            value={siteToAdd}
            onChange={(e) => setSiteToAdd(e.target.value)}
          >
            <option value="">Add a science site…</option>
            {SCIENCE_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!siteToAdd}
            onClick={() => {
              const s = SCIENCE_SITES.find((x) => x.id === siteToAdd);
              if (!s) return;
              setWps([
                ...wps,
                { id: `wp-${s.id}-${Date.now().toString(36)}`, name: s.name, lon: s.lon, lat: s.lat, siteId: s.id },
              ]);
              setSiteToAdd("");
            }}
            className="shrink-0 rounded-lg border border-white/10 px-3 text-[11px] font-medium text-slate-200 transition hover:bg-white/[0.06] disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={draft.returnToLander}
            onChange={(e) => onChange({ returnToLander: e.target.checked })}
            className="h-3.5 w-3.5 accent-orange-400"
          />
          Return to lander at the end (loop)
        </label>
      </div>

      <div>
        <label htmlFor="m-obj" className={label}>
          Scientific objectives (one per line)
        </label>
        <textarea
          id="m-obj"
          rows={3}
          className={`${input} resize-y`}
          value={draft.objectives.join("\n")}
          placeholder="Characterise delta-top sandstones…"
          onChange={(e) => onChange({ objectives: e.target.value.split("\n") })}
        />
      </div>
      <div>
        <label htmlFor="m-bg" className={label}>
          Background (optional)
        </label>
        <textarea
          id="m-bg"
          rows={2}
          className={`${input} resize-y`}
          value={draft.background}
          onChange={(e) => onChange({ background: e.target.value })}
        />
      </div>

      <div className="flex gap-2 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 rounded-lg bg-orange-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Save mission
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          Cancel
        </button>
      </div>
      {!canSave && (
        <p className="-mt-2 text-[10px] text-slate-500">Needs a name and at least one waypoint.</p>
      )}
    </div>
  );
}
