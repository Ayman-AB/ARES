export type MapMode = "pan" | "marker" | "route";

const TOOLS: { id: MapMode; label: string; glyph: string }[] = [
  { id: "pan", label: "Pan / select", glyph: "✋" },
  { id: "marker", label: "Add marker", glyph: "📍" },
  { id: "route", label: "Draw route", glyph: "✏️" },
];

interface MapToolbarProps {
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

export default function MapToolbar({ mode, onModeChange }: MapToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Map tools"
      className="absolute left-3 top-28 z-10 flex flex-col gap-2"
    >
      {TOOLS.map((tool) => {
        const active = tool.id === mode;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => onModeChange(tool.id)}
            aria-label={tool.label}
            aria-pressed={active}
            title={tool.label}
            className={`flex h-9 w-9 items-center justify-center rounded-md text-base shadow ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-95 ${
              active
                ? "bg-orange-500 text-white ring-orange-300"
                : "bg-slate-900/90 text-white ring-white/20 hover:bg-slate-700"
            }`}
          >
            {tool.glyph}
          </button>
        );
      })}
    </div>
  );
}