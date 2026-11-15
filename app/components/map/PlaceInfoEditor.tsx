"use client";

import { useState } from "react";
import { usePlaceInfo, type PlaceInfo } from "../../lib/place-info";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const input =
  "w-full rounded bg-slate-800 px-2 py-1 text-xs text-white ring-1 ring-white/10 focus:outline-none focus:ring-orange-400";
const btn =
  "rounded px-2 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

export default function PlaceInfoEditor({
  placeId,
  originalName,
}: {
  placeId: string;
  originalName: string;
}) {
  const { all, save, remove } = usePlaceInfo();
  const info = all[placeId] ?? null;
  const [draft, setDraft] = useState<PlaceInfo | null>(null);

  const set = (k: keyof PlaceInfo, v: string) => {
    if (draft) setDraft({ ...draft, [k]: v });
  };

  return (
    <div className="mt-2">
      {info ? (
        <>
          <p className="text-xs font-semibold text-orange-300">About</p>
          <p className="text-xs text-slate-300">{info.about || "—"}</p>
          <p className="mt-2 text-xs font-semibold text-orange-300">Geology</p>
          <p className="text-xs text-slate-300">{info.geology || "—"}</p>
          <p className="mt-2 text-xs font-semibold text-orange-300">Scientific importance</p>
          <p className="text-xs text-slate-300">{info.importance || "—"}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={`${btn} bg-blue-600 hover:bg-blue-500`}
              onClick={() => setDraft({ ...info, name: info.name ?? originalName })}
            >
              Modify
            </button>
            <button
              type="button"
              className={`${btn} bg-red-600/80 hover:bg-red-600`}
              onClick={() => {
                if (window.confirm("Delete this information and restore the original name?")) remove(placeId);
              }}
            >
              Delete info
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setDraft({ name: originalName, about: "", geology: "", importance: "" })}
          className={`${btn} bg-orange-500 text-white hover:bg-orange-400`}
        >
          + Add information / rename
        </button>
      )}
      {draft && (
        <Dialog open onOpenChange={(open) => !open && setDraft(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {info ? "Edit place information" : "Add place information"}
              </DialogTitle>
              <DialogDescription>
                Add or update the information associated with this named place.
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-3">
            <label className="block text-xs text-slate-400">
              Name
              <input className={input} value={draft.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </label>
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
            <DialogFooter className="border-t border-white/10 pt-3">
              <DialogClose asChild>
                <button type="button" className={`${btn} bg-white/10 hover:bg-white/20`}>
                  Cancel
                </button>
              </DialogClose>
              <button
                type="button"
                className={`${btn} bg-green-600 hover:bg-green-500`}
                onClick={() => {
                  save(placeId, { ...draft, name: draft.name?.trim() || originalName });
                  setDraft(null);
                }}
              >
                Save
              </button>
            </DialogFooter>
          </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}