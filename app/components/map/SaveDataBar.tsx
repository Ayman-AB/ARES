"use client";

import { useRef, useState } from "react";
import { usePlaceInfo } from "../../lib/place-info";

const btn =
  "rounded px-2 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

export default function SaveDataBar() {
  const { all, replaceAll, resetLocal } = usePlaceInfo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  async function saveToFile() {
    try {
      const res = await fetch("/api/place-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all),
      });
      const json = await res.json();
      setMsg(res.ok ? "Saved to app/data/place-info.json. Now commit and push." : json.error);
    } catch {
      setMsg("Save failed.");
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "place-info.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importFile(file: File) {
    try {
      replaceAll(JSON.parse(await file.text()));
      setMsg("Imported.");
    } catch {
      setMsg("Invalid JSON file.");
    }
  }

  return (
    <section>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Save data
      </h4>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={saveToFile} className={`${btn} bg-green-600 hover:bg-green-500`}>
          Save to project file
        </button>
        <button type="button" onClick={download} className={`${btn} bg-white/10 hover:bg-white/20`}>
          Download JSON
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={`${btn} bg-white/10 hover:bg-white/20`}>
          Import JSON
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Drop browser edits and show the project file data?")) resetLocal();
          }}
          className={`${btn} bg-white/10 hover:bg-white/20`}
        >
          Reset to file
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
      />
      {msg && <p className="mt-1 text-xs text-slate-400">{msg}</p>}
    </section>
  );
}