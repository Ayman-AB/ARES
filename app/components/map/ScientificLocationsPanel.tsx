"use client";

import { useEffect, useState } from "react";
import {
  scientificLocations,
  type ScientificLocation,
} from "../../data/scientific-locations";

const STORAGE_KEY = "marswalkers-scientific-locations";

function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
}

const input =
  "w-full rounded bg-slate-800 px-2 py-1 text-xs text-white ring-1 ring-white/10 focus:outline-none focus:ring-orange-400";
const btn = "rounded px-2 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

export default function ScientificLocationsPanel() {
  const [items, setItems] = useState<ScientificLocation[]>(scientificLocations);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [draft, setDraft] = useState<ScientificLocation | null>(null);

  // load saved edits
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // save edits
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, loaded]);

  const selected = items.find((l) => l.id === selectedId) ?? null;
  const photo = selected?.photos[photoIndex];

  function select(id: string) {
    setSelectedId(id);
    setPhotoIndex(0);
    setDraft(null);
  }

  function remove(id: string) {
    const loc = items.find((l) => l.id === id);
    if (!loc || !window.confirm(`Delete "${loc.name}"?`)) return;
    setItems(items.filter((l) => l.id !== id));
    setSelectedId(null);
    setDraft(null);
  }

  function startAdd() {
    setSelectedId(null);
    setDraft({
      id: `custom-${Date.now()}`,
      name: "",
      lat: 18.44,
      lon: 77.45,
      type: "",
      about: "",
      geology: "",
      importance: "",
      photos: [],
    });
  }

  function saveDraft() {
    if (!draft || !draft.name.trim()) {
      window.alert("Please enter a name.");
      return;
    }
    const exists = items.some((l) => l.id === draft.id);
    setItems(exists ? items.map((l) => (l.id === draft.id ? draft : l)) : [...items, draft]);
    setSelectedId(draft.id);
    setDraft(null);
  }

  function reset() {
    if (!window.confirm("Restore the original locations? Your edits will be lost.")) return;
    setItems(scientificLocations);
    setSelectedId(null);
    setDraft(null);
  }

  const field = (label: string, key: keyof ScientificLocation, multiline = false) => (
    <label className="block text-xs text-slate-400">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          className={input}
          value={String(draft?.[key] ?? "")}
          onChange={(e) => setDraft({ ...draft!, [key]: e.target.value })}
        />
      ) : (
        <input
          className={input}
          value={String(draft?.[key] ?? "")}
          onChange={(e) => setDraft({ ...draft!, [key]: e.target.value })}
        />
      )}
    </label>
  );

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Scientific locations
        </h4>
        <button type="button" onClick={startAdd} className={`${btn} bg-orange-500 text-white hover:bg-orange-400`}>
          + Add
        </button>
      </div>

      <ul className="max-h-40 space-y-0.5 overflow-y-auto">
        {items.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => select(l.id)}
              className={`w-full rounded px-2 py-1 text-left hover:bg-white/10 ${
                selectedId === l.id ? "bg-white/10" : ""
              }`}
            >
              <span className="block truncate">{l.name}</span>
              <span className="block text-xs text-slate-400">{l.type}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* Information card */}
      {selected && !draft && (
        <div className="mt-2 rounded-md bg-white/5 p-2 ring-1 ring-white/10">
          <p className="font-semibold">{selected.name}</p>
          <p className="text-xs text-slate-400">
            {selected.type} · {formatCoords(selected.lat, selected.lon)}
          </p>

          <p className="mt-2 text-xs font-semibold text-orange-300">About</p>
          <p className="text-xs text-slate-300">{selected.about}</p>
          <p className="mt-2 text-xs font-semibold text-orange-300">Geology</p>
          <p className="text-xs text-slate-300">{selected.geology}</p>
          <p className="mt-2 text-xs font-semibold text-orange-300">Scientific importance</p>
          <p className="text-xs text-slate-300">{selected.importance}</p>

          {photo ? (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.caption} className="w-full rounded" />
              <p className="mt-1 text-[11px] text-slate-400">
                {photo.caption} · {photo.credit}
              </p>
              {selected.photos.length > 1 && (
                <div className="mt-1 flex gap-1">
                  {selected.photos.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoIndex(i)}
                      className={`${btn} ${i === photoIndex ? "bg-orange-500" : "bg-white/10"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No photo yet for this location.</p>
          )}

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setDraft({ ...selected })} className={`${btn} bg-blue-600 hover:bg-blue-500`}>
              Modify
            </button>
            <button type="button" onClick={() => remove(selected.id)} className={`${btn} bg-red-600/80 hover:bg-red-600`}>
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Edit / add form */}
      {draft && (
        <div className="mt-2 space-y-2 rounded-md bg-white/5 p-2 ring-1 ring-white/10">
          <p className="text-xs font-semibold text-orange-300">
            {items.some((l) => l.id === draft.id) ? "Modify location" : "New location"}
          </p>
          {field("Name", "name")}
          {field("Type", "type")}
          <div className="flex gap-2">
            <label className="block flex-1 text-xs text-slate-400">
              Latitude (°N)
              <input
                type="number"
                step="any"
                className={input}
                value={draft.lat}
                onChange={(e) => setDraft({ ...draft, lat: Number(e.target.value) })}
              />
            </label>
            <label className="block flex-1 text-xs text-slate-400">
              Longitude (°E)
              <input
                type="number"
                step="any"
                className={input}
                value={draft.lon}
                onChange={(e) => setDraft({ ...draft, lon: Number(e.target.value) })}
              />
            </label>
          </div>
          {field("About", "about", true)}
          {field("Geology", "geology", true)}
          {field("Scientific importance", "importance", true)}
          <div className="flex gap-2">
            <button type="button" onClick={saveDraft} className={`${btn} bg-green-600 hover:bg-green-500`}>
              Save
            </button>
            <button type="button" onClick={() => setDraft(null)} className={`${btn} bg-white/10 hover:bg-white/20`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={reset} className="mt-2 text-xs text-slate-400 underline hover:text-white">
        Reset to original locations
      </button>
    </section>
  );
}