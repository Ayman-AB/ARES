"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import type { MarsPlace } from "../../data/mars-features";

interface NasaImage {
  id: string;
  title: string;
  dateCreated?: string;
  center?: string;
  previewUrl: string;
  detailsUrl: string;
}

type GalleryState =
  | { placeId: string; attempt: number; status: "loading" }
  | { placeId: string; attempt: number; status: "success"; images: NasaImage[] }
  | { placeId: string; attempt: number; status: "error"; message: string };

const NASA_IMAGE_SEARCHES: Record<
  string,
  { query: string; titleTerms: string[]; missionTerms?: string[] }
> = {
  "olympus-mons": {
    query: "Olympus Mons Mars",
    titleTerms: ["olympus mons", "olympus rupes"],
  },
  "elysium-mons": {
    query: "Elysium Mons Mars",
    titleTerms: ["elysium mons"],
  },
  "arsia-mons": {
    query: "Arsia Mons Mars",
    titleTerms: ["arsia mons"],
  },
  "valles-marineris": {
    query: "Valles Marineris Mars",
    titleTerms: ["valles marineris", "melas chasma", "coprates chasma"],
  },
  "hellas-planitia": {
    query: "Hellas Planitia Mars",
    titleTerms: ["hellas planitia", "hellas basin"],
  },
  "gale-crater": {
    query: "Curiosity Gale Crater Mars",
    titleTerms: ["gale crater"],
    missionTerms: ["curiosity"],
  },
  "jezero-crater": {
    query: "Perseverance Jezero Crater Mars",
    titleTerms: ["jezero crater", "jezero"],
    missionTerms: ["perseverance"],
  },
  "viking-2": {
    query: "Viking 2 Mars lander",
    titleTerms: ["viking 2", "viking lander 2"],
  },
  insight: {
    query: "InSight Mars surface image",
    titleTerms: [
      "one of insight's last images",
      "insight's first image from mars",
      "insight's final location",
      "locations of insight",
      "putting seis on the ground",
      "insight seismometer",
      "insight's robotic arm",
    ],
  },
};

const NASA_IMAGE_SEARCH_URL = "https://images-api.nasa.gov/search";
const NASA_IMAGE_ASSET_HOST = "images-assets.nasa.gov";
const NASA_IMAGE_LIMIT = 4;
const NON_PHOTOGRAPHIC_CONTENT =
  /\b(?:artist'?s?\s+concept|concept art|illustration|artist'?s?\s+rendering|clean room|mimic(?:king)? the terrain)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNasaImages(
  payload: unknown,
  titleTerms: string[],
  missionTerms: string[] = [],
): NasaImage[] {
  if (!isRecord(payload) || !isRecord(payload.collection) || !Array.isArray(payload.collection.items)) {
    throw new Error("NASA returned an unexpected image search response.");
  }

  const images: NasaImage[] = [];
  const seenIds = new Set<string>();

  for (const item of payload.collection.items) {
    if (!isRecord(item) || !Array.isArray(item.data) || !isRecord(item.data[0])) continue;
    const metadata = item.data[0];
    const nasaId = metadata.nasa_id;
    const title = metadata.title;
    if (typeof nasaId !== "string" || typeof title !== "string") continue;
    if (seenIds.has(nasaId)) continue;

    const description = typeof metadata.description === "string" ? metadata.description : "";
    const keywords = Array.isArray(metadata.keywords)
      ? metadata.keywords.filter((keyword): keyword is string => typeof keyword === "string")
      : [];
    const searchableText = [title, description, ...keywords].join(" ").toLowerCase();
    const titleMatches = titleTerms.some((term) => title.toLowerCase().includes(term));
    const missionMatches = missionTerms.some((term) => searchableText.includes(term));
    if (!titleMatches && !missionMatches) continue;
    if (NON_PHOTOGRAPHIC_CONTENT.test(`${title} ${description}`)) continue;

    const preview = Array.isArray(item.links)
      ? item.links.find(
          (link) =>
            isRecord(link) &&
            link.render === "image" &&
            typeof link.href === "string",
        )
      : undefined;
    if (!isRecord(preview) || typeof preview.href !== "string") continue;

    let previewUrl: URL;
    try {
      previewUrl = new URL(preview.href);
    } catch {
      continue;
    }
    if (
      previewUrl.protocol !== "https:" ||
      previewUrl.hostname !== NASA_IMAGE_ASSET_HOST ||
      !previewUrl.pathname.startsWith("/image/")
    ) {
      continue;
    }

    images.push({
      id: nasaId,
      title,
      dateCreated:
        typeof metadata.date_created === "string" ? metadata.date_created : undefined,
      center: typeof metadata.center === "string" ? metadata.center : undefined,
      previewUrl: previewUrl.href,
      detailsUrl: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
    });
    seenIds.add(nasaId);
    if (images.length === NASA_IMAGE_LIMIT) break;
  }

  return images;
}

function formatImageDate(dateCreated?: string) {
  if (!dateCreated) return undefined;
  const date = new Date(dateCreated);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function MarsLocationGallery({ place }: { place: MarsPlace }) {
  const search = NASA_IMAGE_SEARCHES[place.id];
  const [attempt, setAttempt] = useState(0);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());
  const [state, setState] = useState<GalleryState>(() => ({
    placeId: place.id,
    attempt: 0,
    status: "loading",
  }));

  useEffect(() => {
    if (!search) return;
    const controller = new AbortController();
    const url = new URL(NASA_IMAGE_SEARCH_URL);
    url.searchParams.set("q", search.query);
    url.searchParams.set("media_type", "image");
    url.searchParams.set("page_size", "30");

    const loadImages = async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`NASA image search failed (${response.status}).`);
        }
        const images = parseNasaImages(
          await response.json(),
          search.titleTerms,
          search.missionTerms,
        );
        setState({ placeId: place.id, attempt, status: "success", images });
      } catch (reason: unknown) {
        if (controller.signal.aborted) return;
        const message =
          reason instanceof TypeError
            ? "Could not reach NASA's image library. Check the connection and try again."
            : reason instanceof Error
              ? reason.message
              : "NASA's image library could not be loaded.";
        setState({ placeId: place.id, attempt, status: "error", message });
      }
    };

    void loadImages();
    return () => controller.abort();
  }, [attempt, place.id, search]);

  if (!search) return null;

  const visibleState: GalleryState =
    state.placeId === place.id && state.attempt === attempt
      ? state
      : { placeId: place.id, attempt, status: "loading" };
  const searchPageUrl = `https://images.nasa.gov/search?q=${encodeURIComponent(search.query)}`;

  return (
    <section aria-label={`NASA images for ${place.name}`} aria-live="polite" className="mt-3 border-t border-white/[0.07] pt-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h5 className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-300">
            NASA image archive
          </h5>
          <p className="mt-1 text-[9px] text-slate-600">Real mission and orbital imagery</p>
        </div>
        <a
          href={searchPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[9px] font-medium text-orange-200/80 underline decoration-orange-200/20 underline-offset-2 transition hover:text-orange-100"
        >
          Browse archive ↗
        </a>
      </div>

      {visibleState.status === "loading" ? (
        <div className="grid grid-cols-2 gap-2" role="status">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="aspect-[4/3] animate-pulse rounded-lg border border-white/[0.05] bg-white/[0.04]"
            />
          ))}
          <span className="sr-only">Searching NASA&apos;s image archive…</span>
        </div>
      ) : visibleState.status === "error" ? (
        <div className="rounded-lg border border-red-300/10 bg-red-950/20 p-2.5">
          <p className="text-[10px] leading-4 text-red-200/85">{visibleState.message}</p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="mt-2 text-[10px] font-semibold text-slate-200 underline underline-offset-2 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Try again
          </button>
        </div>
      ) : visibleState.images.length === 0 ? (
        <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-[10px] leading-4 text-slate-500">
          No clearly matching NASA images were found for this location. You can browse the
          archive for more results.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visibleState.images.map((image) => {
            const imageDate = formatImageDate(image.dateCreated);
            return (
              <a
                key={image.id}
                href={image.detailsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group min-w-0 overflow-hidden rounded-lg border border-white/[0.07] bg-black/20 transition hover:border-orange-200/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                title={`Open ${image.title} in the NASA image library`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
                  {failedImageIds.has(image.id) ? (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[9px] text-slate-500">
                      Preview unavailable
                    </div>
                  ) : (
                    <Image
                      src={image.previewUrl}
                      alt={image.title}
                      fill
                      unoptimized
                      sizes="160px"
                      onError={() =>
                        setFailedImageIds((current) => new Set(current).add(image.id))
                      }
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 min-h-7 text-[9px] font-medium leading-3.5 text-slate-200 group-hover:text-white">
                    {image.title}
                  </p>
                  <p className="mt-1 truncate text-[8px] uppercase tracking-wide text-slate-600">
                    {imageDate ?? "NASA archive"}
                    {image.center ? ` · ${image.center}` : ""}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
