"use client";

import { useEffect, useState } from "react";

import { MARS_LAYER_DEFS, type MarsLayerDef } from "../../config/mars-map";
import { MARS_GEOLOGY_SERVICE_URL } from "../../data/mars-geology";
import type { MarsGeologyLegendItem } from "./marsVectorLayers";
import type { OverlayState } from "./useMarsLayers";

interface MapLegendProps {
  baseId: string;
  overlayState: OverlayState;
  geologyItems: MarsGeologyLegendItem[];
  geologyLoading: boolean;
  geologyError: string | null;
}

interface ArcGisLegendEntry {
  label: string;
  imageData: string;
  contentType: string;
}

type GlobalLegendState =
  | { status: "idle" | "loading" }
  | { status: "ready"; entries: ArcGisLegendEntry[] }
  | { status: "error"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseArcGisLegend(payload: unknown): ArcGisLegendEntry[] {
  if (!isRecord(payload) || !Array.isArray(payload.layers)) {
    throw new Error("NASA returned an unexpected map-legend format.");
  }

  const layer = payload.layers.find(
    (candidate) =>
      isRecord(candidate) &&
      Array.isArray(candidate.legend),
  );
  if (!isRecord(layer) || !Array.isArray(layer.legend)) {
    throw new Error("The NASA legend service did not include map symbols.");
  }

  const entries = layer.legend.flatMap((candidate): ArcGisLegendEntry[] => {
    if (!isRecord(candidate)) return [];
    const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
    const imageData = typeof candidate.imageData === "string" ? candidate.imageData : "";
    const contentType =
      typeof candidate.contentType === "string" ? candidate.contentType : "image/png";
    return label && imageData && contentType.startsWith("image/")
      ? [{ label, imageData, contentType }]
      : [];
  });

  if (entries.length === 0) {
    throw new Error("The NASA legend service returned no usable map symbols.");
  }

  return entries;
}

function LayerLegend({ layer }: { layer: MarsLayerDef }) {
  return (
    <section className="border-t border-white/[0.07] pt-2.5 first:border-0 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 text-[10px] font-semibold leading-4 text-slate-100">{layer.title}</h4>
        <span className="shrink-0 rounded border border-white/[0.08] px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-slate-500">
          {layer.dataType}
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-slate-400">{layer.legendDescription}</p>
      <p className="mt-1 text-[8px] text-slate-600">Source · {layer.source}</p>
    </section>
  );
}

export default function MapLegend({
  baseId,
  overlayState,
  geologyItems,
  geologyLoading,
  geologyError,
}: MapLegendProps) {
  const [open, setOpen] = useState(true);
  const [globalLegend, setGlobalLegend] = useState<GlobalLegendState>({ status: "idle" });
  const [retryToken, setRetryToken] = useState(0);

  const baseLayer = MARS_LAYER_DEFS.find((layer) => layer.id === baseId);
  const activeOverlays = MARS_LAYER_DEFS.filter(
    (layer) => layer.role === "overlay" && overlayState[layer.id]?.visible,
  );
  const geologyLayer = MARS_LAYER_DEFS.find((layer) => layer.id === "global-geology");
  const globalLegendUrl = geologyLayer?.legendUrl;
  const globalGeologyVisible = activeOverlays.some((layer) => layer.id === "global-geology");

  useEffect(() => {
    if (!globalGeologyVisible || !globalLegendUrl) return;

    const legendUrl = globalLegendUrl;
    const controller = new AbortController();
    async function loadLegend() {
      setGlobalLegend({ status: "loading" });
      try {
        const response = await fetch(legendUrl, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`NASA's map legend returned HTTP ${response.status}.`);
        }
        const payload: unknown = await response.json();
        setGlobalLegend({ status: "ready", entries: parseArcGisLegend(payload) });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setGlobalLegend({
          status: "error",
          message: cause instanceof Error ? cause.message : "The map legend could not be read.",
        });
      }
    }

    void loadLegend();
    return () => controller.abort();
  }, [globalGeologyVisible, globalLegendUrl, retryToken]);

  return (
    <div className="pointer-events-auto absolute left-14 top-3 z-10 w-[min(19rem,calc(100vw-5rem))]">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show map legend"
          className="rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-[10px] font-semibold text-slate-100 shadow-lg backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          Map legend
        </button>
      ) : (
        <section
          aria-label="Map legend"
          className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 text-slate-100 shadow-[0_12px_35px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          <header className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-orange-200/70">
                Data key
              </p>
              <h3 className="text-xs font-semibold text-white">Visible map layers</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Hide map legend"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              −
            </button>
          </header>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-3 py-2.5">
            {baseLayer ? <LayerLegend layer={baseLayer} /> : null}
            {activeOverlays.map((layer) => (
              <div key={layer.id}>
                <LayerLegend layer={layer} />
                {layer.id === "global-geology" && (
                  <div className="mt-2 border-l border-teal-300/30 pl-2.5">
                    {globalLegend.status === "loading" && (
                      <p role="status" className="text-[9px] text-slate-500">
                        Loading NASA unit key…
                      </p>
                    )}
                    {globalLegend.status === "error" && (
                      <div role="alert" className="text-[9px] leading-4 text-amber-200/80">
                        <p>{globalLegend.message}</p>
                        <button
                          type="button"
                          onClick={() => setRetryToken((value) => value + 1)}
                          className="mt-1 underline decoration-amber-200/30 underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                        >
                          Retry legend
                        </button>
                      </div>
                    )}
                    {globalLegend.status === "ready" && (
                      <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                        {globalLegend.entries.map((entry) => (
                          <div key={entry.label} className="flex items-center gap-2 text-[9px] leading-3 text-slate-300">
                            <span
                              aria-hidden="true"
                              className="h-4 w-4 shrink-0 rounded-sm bg-contain bg-center bg-no-repeat"
                              style={{
                                backgroundImage: `url("data:${entry.contentType};base64,${entry.imageData}")`,
                              }}
                            />
                            <span>{entry.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <section className="border-t border-white/[0.07] pt-2.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[10px] font-semibold leading-4 text-slate-100">
                  Jezero mapped geology
                </h4>
                <span className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-teal-200/70">
                  Unit key
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                Colors identify mapped unit codes only; they do not encode age, composition, or safety.
              </p>
              <a
                href={MARS_GEOLOGY_SERVICE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex text-[8px] text-teal-200/80 underline decoration-teal-200/20 underline-offset-2 hover:text-teal-100"
              >
                ArcGIS feature source ↗
              </a>
              {geologyLoading && (
                <p role="status" className="mt-2 text-[9px] text-slate-500">
                  Loading Jezero map units…
                </p>
              )}
              {geologyError && (
                <p role="alert" className="mt-2 text-[9px] leading-4 text-amber-200/80">
                  Jezero unit key unavailable: {geologyError}
                </p>
              )}
              {!geologyLoading && !geologyError && geologyItems.length > 0 && (
                <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                  {geologyItems.map((item) => (
                    <div
                      key={item.unit || item.symbol}
                      className="flex items-center gap-2 text-[9px] leading-3 text-slate-300"
                    >
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 rounded-sm border"
                        style={{
                          backgroundColor: `${item.color}55`,
                          borderColor: item.color,
                        }}
                      />
                      <span className="font-mono text-slate-500">
                        {item.symbol || `Unit ${item.unit}`}
                      </span>
                      <span className="min-w-0 truncate">{item.name || `Unit ${item.unit}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </div>
  );
}
