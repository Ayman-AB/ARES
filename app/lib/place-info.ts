"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import seed from "../data/place-info.json";

export type PlaceInfo = {
  name?: string;
  about: string;
  geology: string;
  importance: string;
};

type Store = Record<string, PlaceInfo | null>;

const seedData = seed as Record<string, PlaceInfo>;
const KEY = "marswalkers-place-info";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

const getServerSnapshot = () => "{}";

function parse(raw: string): Store {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
  listeners.forEach((l) => l());
}

export function usePlaceInfo() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // file data + browser edits (null = deleted)
  const all = useMemo(() => {
    const merged: Record<string, PlaceInfo> = { ...seedData };
    for (const [id, v] of Object.entries(parse(raw))) {
      if (v === null) delete merged[id];
      else merged[id] = v;
    }
    return merged;
  }, [raw]);

  const save = useCallback((id: string, info: PlaceInfo) => {
    const cur = parse(getSnapshot());
    cur[id] = info;
    write(cur);
  }, []);

  const remove = useCallback((id: string) => {
    const cur = parse(getSnapshot());
    cur[id] = null;
    write(cur);
  }, []);

  // replace everything with an imported file
  const replaceAll = useCallback((data: Record<string, PlaceInfo>) => {
    const store: Store = { ...data };
    for (const id of Object.keys(seedData)) if (!(id in data)) store[id] = null;
    write(store);
  }, []);

  // drop browser edits and show the project file again
  const resetLocal = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    listeners.forEach((l) => l());
  }, []);

  return { all, save, remove, replaceAll, resetLocal };
}