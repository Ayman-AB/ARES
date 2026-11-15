"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MARS_DEFAULT_BASE_ID, MARS_LAYER_DEFS } from "../../config/mars-map";
import { createMarsTrekLayer } from "./marsTrekLayer";

type TileLayerT = ReturnType<typeof createMarsTrekLayer>;

export type OverlayState = Record<string, { visible: boolean; opacity: number }>;

export interface MarsLayerControls {
  /** Every NASA tile layer (bases + overlays), stable for the component's lifetime. */
  tileLayers: TileLayerT[];
  baseId: string;
  setBaseId: (id: string) => void;
  baseOpacity: number;
  setBaseOpacity: (opacity: number) => void;
  overlayState: OverlayState;
  setOverlay: (id: string, patch: Partial<OverlayState[string]>) => void;
  /** True while the active base layer is failing to load tiles. */
  tileError: boolean;
}

const initialOverlayState = (): OverlayState =>
  Object.fromEntries(
    MARS_LAYER_DEFS.filter((d) => d.role === "overlay").map((d) => [
      d.id,
      { visible: false, opacity: d.defaultOpacity },
    ]),
  );

/**
 * Owns the NASA Trek tile layers and the switcher state that drives them.
 * Shared by the region explorer and the Jezero mission planner.
 */
export function useMarsLayers(initialBaseId: string = MARS_DEFAULT_BASE_ID): MarsLayerControls {
  const [baseId, setBaseId] = useState(initialBaseId);
  const [baseOpacity, setBaseOpacity] = useState(1);
  const [overlayState, setOverlayState] = useState<OverlayState>(initialOverlayState);
  const [errorLayerId, setErrorLayerId] = useState<string | null>(null);

  // Create once on the client; disposed on unmount (and on Strict Mode remount).
  const [tileLayers, setTileLayers] = useState<TileLayerT[]>([]);
  useEffect(() => {
    const layers = MARS_LAYER_DEFS.map((def, i) =>
      createMarsTrekLayer(def, {
        visible: false,
        zIndex: i,
        ...(def.role === "base"
          ? {
              onTileError: () => setErrorLayerId(def.id),
              onTileLoad: () => setErrorLayerId((cur) => (cur === def.id ? null : cur)),
            }
          : {}),
      }),
    );
    // Layer sources are client-side resources and must be created after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTileLayers(layers);
    return () => layers.forEach((l) => l.dispose());
  }, []);

  const byId = useMemo(
    () => Object.fromEntries(tileLayers.map((l) => [String(l.get("id")), l])),
    [tileLayers],
  );

  useEffect(() => {
    for (const def of MARS_LAYER_DEFS) {
      const layer = byId[def.id];
      if (!layer) continue;
      if (def.role === "base") {
        layer.setVisible(def.id === baseId);
        layer.setOpacity(baseOpacity);
      } else {
        const s = overlayState[def.id];
        layer.setVisible(s.visible);
        layer.setOpacity(s.opacity);
      }
    }
  }, [byId, baseId, baseOpacity, overlayState]);

  const setOverlay = useCallback(
    (id: string, patch: Partial<OverlayState[string]>) =>
      setOverlayState((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        const mutuallyExclusiveLayer =
          id === "ctx-jezero"
            ? "hirise-jezero"
            : id === "hirise-jezero"
              ? "ctx-jezero"
              : null;

        if (patch.visible && mutuallyExclusiveLayer) {
          next[mutuallyExclusiveLayer] = {
            ...next[mutuallyExclusiveLayer],
            visible: false,
          };
        }

        return next;
      }),
    [],
  );

  return {
    tileLayers,
    baseId,
    setBaseId,
    baseOpacity,
    setBaseOpacity,
    overlayState,
    setOverlay,
    tileError: errorLayerId !== null && errorLayerId === baseId,
  };
}
