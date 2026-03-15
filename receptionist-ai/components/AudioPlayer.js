"use client";

import { useState } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

export default function AudioPlayer({ src }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // UI-only stub — wire to real Audio API when back-end is ready
  function toggle() {
    setPlaying((p) => !p);
  }

  return (
    <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
      <button
        onClick={toggle}
        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors"
        style={{ background: "var(--accent)" }}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing
          ? <Pause size={13} color="white" />
          : <Play  size={13} color="white" className="ml-0.5" />}
      </button>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, background: "var(--accent)" }}
        />
      </div>

      <Volume2 size={13} className="text-slate-500 shrink-0" />
    </div>
  );
}
