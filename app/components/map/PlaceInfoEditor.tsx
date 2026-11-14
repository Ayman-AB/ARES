"use client";

import { useEffect, useState } from "react";

type Info = { about: string; geology: string; importance: string };

const KEY = "marswalkers-place-info";
const empty: Info = { about: "", geology: "", importance: "" };

function readAll(): Record<string, Info> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

const input =
  "w-full rounded bg-slate-800 px-2 py-1 text-xs text-white ring-1 ring-white/10 focus:outline-none focus:ring-orange-400";
const btn = "rounded px-2 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

export default function PlaceInfoEditor({ placeId }: { placeId: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [draft, setDraft] = useState<Info | null>(null);

  useEffect(() => {
    setInfo(readAll()[placeId] ?? null);
    setDraft(null);
  }, [placeId]);

  function persist(next: Info | null) {
    const all = readAll();
    if (next) all[placeId] = next;
    else delete all[placeId];
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {}
    setInfo(next);
  }

  if (draft) {
    const set = (k: keyof Info, v: string) => setDraft({ ...draft, [k]: v });
    return (
      <div className="mt-2 space-y-2">
        <label className="block text-xs text-slate-400">
          About this location
          <textarea rows={3} className={input} value={draft.about} onChange={(e) => set("about", e.target.value)} />
        </label>
        <label className="block text-xs text-slate-400">
          Geological characteristics
          <textarea rows={3} className={input} value={draft.geology} onChange={(e) => set("geology", e.target.value)} />
        </label>
        <label className="block text-xs text-slate-400">
          Scientific importance
          <textarea rows={3} className={input} value={draft.importance} onChange={(e) => set("importance", e.target.value)} />
        </label>
        <div className="flex gap-2">
          <button type="button" className={`${btn} bg-green-600 hover:bg-green-500`}
            onClick={() => { persist(draft); setDraft(null); }}>
            Save
          </button>
          <button type="button" className={`${btn} bg-white/10 hover:bg-white/20`} onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <button type="button" onClick={() => setDraft(empty)}
        className={`${btn} mt-2 bg-orange-500 text-white hover:bg-orange-400`}>
        + Add information
      </button>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold text-orange-300">About</p>
      <p className="text-xs text-slate-300">{info.about || "—"}</p>
      <p className="mt-2 text-xs font-semibold text-orange-300">Geology</p>
      <p className="text-xs text-slate-300">{info.geology || "—"}</p>
      <p className="mt-2 text-xs font-semibold text-orange-300">Scientific importance</p>
      <p className="text-xs text-slate-300">{info.importance || "—"}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" className={`${btn} bg-blue-600 hover:bg-blue-500`} onClick={() => setDraft(info)}>
          Modify
        </button>
        <button type="button" className={`${btn} bg-red-600/80 hover:bg-red-600`}
          onClick={() => { if (window.confirm("Delete this information?")) persist(null); }}>
          Delete info
        </button>
      </div>
    </div>
  );
}