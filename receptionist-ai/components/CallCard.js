"use client";

import { useState } from "react";
import { Phone, Clock, User, ChevronDown, ChevronUp, PhoneForwarded } from "lucide-react";
import CallIndicator from "./CallIndicator";
import AudioPlayer from "./AudioPlayer";

export default function CallCard({ call }) {
  const {
    id,
    phoneNumber,
    callerName,
    duration,
    status,
    timestamp,
    department,
    aiSummary,
    sentiment,
    intent,
  } = call;

  const [expanded, setExpanded] = useState(false);

  const borderColor = {
    active:   "border-green-500/30",
    incoming: "border-yellow-400/30",
    missed:   "border-red-500/30",
    "on-hold": "border-indigo-500/30",
    ended:    "border-slate-700/30",
  }[status] ?? "border-slate-700/30";

  const sentimentColor = {
    positive: "text-green-400",
    neutral:  "text-slate-400",
    negative: "text-red-400",
  }[sentiment] ?? "text-slate-400";

  return (
    <div
      className={`flex flex-col rounded-xl border p-5 transition-shadow hover:shadow-lg hover:shadow-black/20 ${borderColor}`}
      style={{ background: "var(--bg-card)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "rgba(99,102,241,0.2)", color: "var(--accent)" }}
          >
            {callerName ? callerName[0].toUpperCase() : <User size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-main)" }}>
              {callerName || "Unknown"}
            </p>
            <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {phoneNumber}
            </p>
          </div>
        </div>
        <CallIndicator status={status} showLabel size="sm" />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {duration}
        </span>
        <span className="flex items-center gap-1">
          <Phone size={12} />
          {timestamp}
        </span>
        {department && (
          <span className="flex items-center gap-1">
            <PhoneForwarded size={12} />
            {department}
          </span>
        )}
      </div>

      {/* Audio player */}
      <AudioPlayer src={`/recordings/${id}.mp3`} />

      {/* AI Summary toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between mt-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-slate-700/40"
        style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)" }}
      >
        <span>AI Summary</span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div className="mt-2 px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700/40 space-y-2">
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {aiSummary}
          </p>
          <div className="flex items-center gap-3 pt-1 border-t border-slate-700/40">
            <span className="text-xs text-slate-500">
              Sentiment: <span className={`font-medium ${sentimentColor}`}>{sentiment ?? "—"}</span>
            </span>
            <span className="text-xs text-slate-500">
              Intent: <span className="text-slate-300">{intent ?? "—"}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
