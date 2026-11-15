"use client";

import { useState } from "react";
import type { ScientificLocation } from "../../data/scientific-locations";
function formatCoords(lat: number, lon: number) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

export default function LocationDetails({
  location,
  onClose,
}: {
  location: ScientificLocation;
  onClose?: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photo = location.photos[photoIndex];

  return (
    <div style={{ padding: 12, borderRadius: 8, background: "#111827", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{location.name}</h3>
        {onClose && (
          <button onClick={onClose} aria-label="Close">✕</button>
        )}
      </div>
      <p style={{ opacity: 0.7, margin: "4px 0" }}>{location.type}</p>

      <p><strong>Coordinates:</strong> {formatCoords(location.lat, location.lon)}</p>
      <p><strong>Geology:</strong> {location.geology}</p>
      <p><strong>Scientific importance:</strong> {location.importance}</p>

      {photo ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.src}
            alt={photo.caption}
            style={{ width: "100%", borderRadius: 6 }}
          />
          <small>{photo.caption} · {photo.credit}</small>
          {location.photos.length > 1 && (
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              {location.photos.map((_, i) => (
                <button key={i} onClick={() => setPhotoIndex(i)}
                  style={{ fontWeight: i === photoIndex ? "bold" : "normal" }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <small>No photo yet for this location.</small>
      )}
    </div>
  );
}
