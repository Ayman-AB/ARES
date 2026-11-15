"use client";

import { useId } from "react";

import { MARS_LAYER_DEFS, type MarsLayerDef } from "../../config/mars-map";
import type { OverlayState } from "./useMarsLayers";

export interface LayerSwitcherProps {
  baseId: string;
  onBaseChange: (id: string) => void;
  baseOpacity: number;
  onBaseOpacityChange: (opacity: number) => void;
  overlayState: OverlayState;
  onOverlayChange: (id: string, patch: Partial<OverlayState[string]>) => void;
  regionBoundaryVisible?: boolean;
  onRegionBoundaryChange?: (visible: boolean) => void;
  jezeroGeologyVisible?: boolean;
  onJezeroGeologyChange?: (visible: boolean) => void;
  placesVisible?: boolean;
  onPlacesVisibilityChange?: (visible: boolean) => void;
  routesVisible?: boolean;
  onRoutesVisibilityChange?: (visible: boolean) => void;
}

const sectionTitle = "text-xs font-semibold tracking-wide text-slate-100";
const baseDefs = MARS_LAYER_DEFS.filter((d) => d.role === "base");
const overlayDefs = MARS_LAYER_DEFS.filter((d) => d.role === "overlay");

function LayerFacts({ layer }: { layer: MarsLayerDef }) {
  const typeTone = layer.dataType === "Geologic units"
    ? "bg-teal-300"
    : /thermal|albedo/i.test(layer.dataType)
      ? "bg-violet-300"
      : /elevation|relief/i.test(layer.dataType)
        ? "bg-orange-300"
        : "bg-sky-300";

  return (
    <>
      <span className="mt-1.5 flex flex-wrap gap-1">
        {[
          { label: layer.dataType, tone: typeTone },
          { label: layer.resolution, tone: "" },
          {
            label: layer.extent ? "Jezero footprint" : "Global coverage",
            tone: layer.extent ? "bg-amber-300" : "bg-emerald-300",
          },
        ].map(({ label, tone }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded border border-white/[0.07] bg-black/10 px-1.5 py-0.5 text-[8px] leading-3 text-slate-400"
            >
              {tone && <span aria-hidden="true" className={`h-1 w-1 rounded-full ${tone}`} />}
              {label}
            </span>
          ))}
      </span>
      <span className="mt-1 block text-[9px] text-slate-600">Source · {layer.source}</span>
    </>
  );
}

/** Base-imagery radio group + overlay toggles with opacity blending. */
export default function LayerSwitcher({
  baseId,
  onBaseChange,
  baseOpacity,
  onBaseOpacityChange,
  overlayState,
  onOverlayChange,
  regionBoundaryVisible,
  onRegionBoundaryChange,
  jezeroGeologyVisible,
  onJezeroGeologyChange,
  placesVisible,
  onPlacesVisibilityChange,
  routesVisible,
  onRoutesVisibilityChange,
}: LayerSwitcherProps) {
  const groupId = useId();
  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-orange-300/80">01</span>
          <h4 className={sectionTitle}>Surface imagery</h4>
          <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-slate-600">
            Source
          </span>
        </div>
        <div className="space-y-1">
          {baseDefs.map((d) => (
            <label
              key={d.id}
              className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-orange-300/70 ${
                baseId === d.id
                  ? "border-orange-300/20 bg-gradient-to-r from-orange-300/[0.08] to-transparent"
                  : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.025]"
              }`}
            >
              <input
                type="radio"
                name={`mars-base-layer-${groupId}`}
                checked={baseId === d.id}
                onChange={() => onBaseChange(d.id)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                  baseId === d.id
                    ? "border-orange-300 bg-orange-300/10"
                    : "border-slate-600 group-hover:border-slate-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-orange-300 transition ${
                    baseId === d.id ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-slate-100">{d.title}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
                  {d.subtitle}
                </span>
                <LayerFacts layer={d} />
              </span>
              {baseId === d.id && (
                <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-orange-200/80">
                  Active
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="mt-2.5 px-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Base opacity
            </span>
            <span className="font-mono text-[10px] text-orange-200/90">
              {Math.round(baseOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(baseOpacity * 100)}
            onChange={(e) => onBaseOpacityChange(Number(e.target.value) / 100)}
            aria-label="Base imagery opacity"
            className="h-1 w-full cursor-pointer accent-orange-300"
          />
        </div>
      </section>

      <section>
        <div className="mb-2.5 flex items-center gap-2.5">
          <span className="font-mono text-[10px] text-orange-300/80">02</span>
          <h4 className={sectionTitle}>Science overlays</h4>
          <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-slate-600">
            Blend
          </span>
        </div>
        <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {overlayDefs.map((d) => {
            const state = overlayState[d.id];
            return (
              <div key={d.id} className="py-2.5 first:pt-3 last:pb-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] transition ${
                      state.visible
                        ? "border-orange-300/20 bg-orange-300/[0.08] text-orange-200"
                        : "border-white/[0.06] bg-white/[0.025] text-slate-500"
                    }`}
                  >
                    ◈
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-slate-200">{d.title}</span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
                      {d.subtitle}
                    </span>
                    <LayerFacts layer={d} />
                  </span>
                  <span className="relative h-5 w-9 shrink-0">
                    <input
                      type="checkbox"
                      checked={state.visible}
                      onChange={(e) => onOverlayChange(d.id, { visible: e.target.checked })}
                      aria-label={`Show ${d.title} overlay`}
                      className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 rounded-full border transition peer-focus-visible:ring-2 peer-focus-visible:ring-orange-300/70 ${
                        state.visible
                          ? "border-orange-300/30 bg-orange-300/20"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
                          state.visible
                            ? "left-[17px] bg-orange-200 shadow-[0_0_8px_rgba(253,186,116,0.5)]"
                            : "left-0.5 bg-slate-500"
                        }`}
                      />
                    </span>
                  </span>
                </label>
                {state.visible && (
                  <div className="ml-10 mt-2.5">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                        Opacity
                      </span>
                      <span className="font-mono text-[10px] text-orange-200/90">
                        {Math.round(state.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(state.opacity * 100)}
                      onChange={(e) =>
                        onOverlayChange(d.id, { opacity: Number(e.target.value) / 100 })
                      }
                      aria-label={`${d.title} opacity`}
                      className="h-1 w-full cursor-pointer accent-orange-300"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[9px] leading-4 text-slate-600">
          Tags summarize data type, scale, coverage, and source—not a shared numeric legend. Tile
          colors retain source symbology. MOLA elevation is an opaque grayscale overlay; CTX and
          HiRISE cover Jezero only and focus the map at their deepest available tile level when enabled.
        </p>
      </section>

      {(onRegionBoundaryChange ||
        onJezeroGeologyChange ||
        onPlacesVisibilityChange ||
        onRoutesVisibilityChange) && (
        <section>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-orange-300/80">03</span>
            <h4 className={sectionTitle}>Map features</h4>
            <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-slate-600">
              Vector
            </span>
          </div>
          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {onRegionBoundaryChange && (
              <label className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={regionBoundaryVisible ?? false}
                  onChange={(event) => onRegionBoundaryChange(event.target.checked)}
                  className="h-4 w-4 accent-orange-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-slate-200">
                    Region boundary
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    Orange outline and shaded area
                  </span>
                </span>
              </label>
            )}
            {onJezeroGeologyChange && (
              <label className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={jezeroGeologyVisible ?? false}
                  onChange={(event) => onJezeroGeologyChange(event.target.checked)}
                  className="h-4 w-4 accent-teal-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-slate-200">
                    Jezero mapped geology
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    Colored geologic units · Jezero only
                  </span>
                </span>
              </label>
            )}
            {onPlacesVisibilityChange && (
              <label className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={placesVisible ?? false}
                  onChange={(event) => onPlacesVisibilityChange(event.target.checked)}
                  className="h-4 w-4 accent-sky-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-slate-200">
                    Place markers
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    Named sites and saved points
                  </span>
                </span>
              </label>
            )}
            {onRoutesVisibilityChange && (
              <label className="flex cursor-pointer items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={routesVisible ?? false}
                  onChange={(event) => onRoutesVisibilityChange(event.target.checked)}
                  className="h-4 w-4 accent-emerald-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-slate-200">
                    Route lines
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    Measured and planned itineraries
                  </span>
                </span>
              </label>
            )}
          </div>
          <p className="mt-2 text-[9px] leading-4 text-slate-600">
            These controls hide map features independently; the selected surface imagery remains visible.
          </p>
        </section>
      )}
    </div>
  );
}
