"use client";

import { useEffect, useState } from "react";
import {
  scientificLocations,
  type ScientificLocation,
} from "../../data/scientific-locations";
import { GEOLOGICAL_FORMATIONS } from "../../data/geologicalData";
import { MARS_GEOLOGY_SERVICE_URL } from "../../data/mars-geology";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const STORAGE_KEY = "marswalkers-scientific-locations";

function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
}

const input =
  "w-full rounded bg-slate-800 px-2 py-1 text-xs text-white ring-1 ring-white/10 focus:outline-none focus:ring-orange-400";
const btn = "rounded px-2 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

export default function ScientificLocationsPanel({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  const [items, setItems] = useState<ScientificLocation[]>(scientificLocations);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [draft, setDraft] = useState<ScientificLocation | null>(null);

  // load saved edits
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Browser storage is only available after mount; hydrate saved edits here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(JSON.parse(raw));
      }
    } catch (error) {
      console.error("Unable to load saved scientific locations.", error);
    }
    setLoaded(true);
  }, []);

  // save edits
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Unable to save scientific locations.", error);
    }
  }, [items, loaded]);

  const selected = items.find((l) => l.id === selectedId) ?? null;
  const photo = selected?.photos[photoIndex];
  const researchDetails = selected
    ? GEOLOGICAL_FORMATIONS.find((formation) => formation.id === selected.id) ?? null
    : null;
  const editing = draft ? items.some((l) => l.id === draft.id) : false;

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
      <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-teal-300/10 bg-teal-300/[0.035] px-2.5 py-2">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-teal-100/80">
            Map evidence
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
            Jezero geological unit polygons · ArcGIS feature service
          </p>
        </div>
        <a
          href={MARS_GEOLOGY_SERVICE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[9px] font-medium text-teal-200 underline decoration-teal-200/30 underline-offset-2 hover:text-teal-100"
        >
          View source ↗
        </a>
      </div>

      <ul
        className={`${
          expanded ? "max-h-56" : "max-h-40"
        } space-y-0.5 overflow-y-auto`}
      >
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
      {selected && (
        <div className="mt-2 rounded-md bg-white/5 p-2 ring-1 ring-white/10">
          <p className="font-semibold">{selected.name}</p>
          <p className="text-xs text-slate-400">
            {selected.type} · {formatCoords(selected.lat, selected.lon)}
          </p>

          <p className="mt-2 text-xs font-semibold text-orange-300">About</p>
          <p className="text-xs text-slate-300">{selected.about}</p>
          <p className="mt-2 text-xs font-semibold text-orange-300">Geology</p>
          <p className="text-xs text-slate-300">{selected.geology}</p>
          <div className="mt-3 rounded-xl border border-orange-300/10 bg-orange-300/[0.035] p-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-orange-200/80">
              Scientific importance
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-200">
              {researchDetails?.scientificImportance ?? selected.importance}
            </p>
          </div>
          {researchDetails && selected.importance !== researchDetails.scientificImportance && (
            <p className="mt-2 text-xs text-slate-400">
              Site-specific note: {selected.importance}
            </p>
          )}

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

          {researchDetails && (
            <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
              <div
                className="relative overflow-hidden rounded-xl border border-white/[0.08] p-3"
                style={{
                  background: `linear-gradient(115deg, ${researchDetails.color}20, transparent 70%)`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 top-0 w-0.5"
                  style={{ backgroundColor: researchDetails.color }}
                />
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: researchDetails.color }}
                  />
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-orange-200/70">
                      Formation profile
                    </p>
                    <p className="text-xs font-semibold text-slate-100">{researchDetails.category}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-5 text-slate-300">{researchDetails.description}</p>

              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  Observed composition
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {researchDetails.composition.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-200"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: researchDetails.color }}
                      />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  Geological characteristics
                </p>
                <div className={`grid grid-cols-1 gap-1.5 ${expanded ? "sm:grid-cols-2" : ""}`}>
                  {researchDetails.characteristics.map((item, index) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 border-l border-white/10 py-1 pl-2.5"
                    >
                      <span className="font-mono text-[9px] text-orange-200/60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] leading-4 text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  Mapped members
                </p>
                <div className="flex flex-wrap gap-1">
                  {researchDetails.mappedUnits.map((unit) => (
                    <span
                      key={unit}
                      className="rounded border border-white/[0.08] px-1.5 py-1 text-[9px] leading-3 text-slate-300"
                    >
                      {unit}
                    </span>
                  ))}
                </div>
                <p className="mb-1 mt-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  Rover instruments
                </p>
                <div className="flex flex-wrap gap-1">
                  {researchDetails.instruments.map((instrument) => (
                    <span
                      key={instrument}
                      className="rounded-full bg-orange-300/10 px-2 py-1 text-[9px] font-medium text-orange-100/80"
                    >
                      {instrument}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  Interpretation
                </p>
                <p className="text-[10px] leading-5 text-slate-300">
                  {researchDetails.interpretationNote}
                </p>
              </div>

              <div className="border-t border-white/[0.07] pt-3">
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  Data origin
                </p>
                <p className="text-[10px] leading-4 text-slate-400">{researchDetails.dataOrigin}</p>
                <a
                  href={researchDetails.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-[10px] font-medium text-orange-200 underline decoration-orange-200/30 underline-offset-4 hover:text-orange-100"
                >
                  {researchDetails.sourceName} ↗
                </a>
              </div>
            </div>
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
        <Dialog open onOpenChange={(open) => !open && setDraft(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Modify scientific location" : "Add scientific location"}
              </DialogTitle>
              <DialogDescription>
                Update the location details shown in the scientific locations panel.
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-3">
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
            <DialogFooter className="border-t border-white/10 pt-3">
              <DialogClose asChild>
                <button type="button" className={`${btn} bg-white/10 hover:bg-white/20`}>
                Cancel
                </button>
              </DialogClose>
              <button
                type="button"
                onClick={saveDraft}
                className={`${btn} bg-green-600 hover:bg-green-500`}
              >
                Save
              </button>
            </DialogFooter>
          </div>
          </DialogContent>
        </Dialog>
      )}

      <button type="button" onClick={reset} className="mt-2 text-xs text-slate-400 underline hover:text-white">
        Reset to original locations
      </button>
    </section>
  );
}