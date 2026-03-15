"use client";

import { useState } from "react";
import { Search, Bell, Zap, ChevronDown, RefreshCw } from "lucide-react";

const notifications = [
  { id: 1, text: "Missed call from +1 555 909 3344", time: "2 min ago", type: "missed" },
  { id: 2, text: "AI transferred call to Sales dept.", time: "5 min ago", type: "info" },
  { id: 3, text: "New voicemail from +1 555 203 8821", time: "12 min ago", type: "info" },
];

export default function Topbar() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [aiLatency] = useState(142); // ms

  return (
    <header
      className="flex items-center gap-4 px-6 h-14 shrink-0"
      style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid #1e293b" }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 flex-1 max-w-sm px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/50">
        <Search size={14} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search calls, contacts..."
          className="bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none w-full"
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* AI Latency */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <Zap size={13} className="text-yellow-400" />
          <span className="text-xs text-slate-300">
            AI Latency: <span className="text-green-400 font-semibold">{aiLatency}ms</span>
          </span>
        </div>

        {/* AI Engine Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-active" />
          <span className="text-xs text-slate-300">DeepSeek</span>
          <span className="text-xs text-green-400 font-medium">Active</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-indigo-500/50 transition-colors"
          >
            <Bell size={15} className="text-slate-300" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-400" />
          </button>

          {showNotifs && (
            <div
              className="absolute right-0 top-10 w-72 rounded-xl shadow-2xl border border-slate-700/60 p-2 z-50"
              style={{ background: "var(--bg-card)" }}
            >
              <p className="text-xs font-semibold text-slate-400 px-2 py-1.5 mb-1">Notifications</p>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-slate-700/40 transition-colors"
                >
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: n.type === "missed" ? "var(--call-missed)" : "var(--accent)" }}
                  />
                  <div>
                    <p className="text-xs text-slate-300">{n.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-indigo-500/50 transition-colors">
          <RefreshCw size={14} className="text-slate-300" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/60 transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
          <ChevronDown size={13} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
