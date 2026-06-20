import { useState } from "react";
import { FlaskConical, X, RotateCcw } from "lucide-react";
import { DEMO, resetDemo } from "@/lib/demo/backend";

/**
 * Thin banner shown only in DEMO mode (no Firebase keys configured).
 * Lets the user know data is local/sample and offers a reset.
 */
export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  if (!DEMO || hidden) return null;

  return (
    <div className="relative z-[60] flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>
        <strong>Demo mode</strong> — sample data, no Firebase keys needed.
        Changes are saved locally in your browser.
      </span>
      <button
        onClick={() => {
          if (confirm("Reset all demo data back to the original sample set?")) {
            resetDemo();
            location.reload();
          }
        }}
        className="hidden items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 transition hover:bg-white/30 sm:inline-flex"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </button>
      <button
        onClick={() => setHidden(true)}
        className="absolute right-2 grid h-6 w-6 place-items-center rounded-full hover:bg-white/20"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
