"use client";

import { useState, useEffect } from "react";
import { PhoneCall, PhoneMissed, PhoneOff, Users, TrendingUp, Clock } from "lucide-react";
import CallIndicator from "./CallIndicator";

const STAT_CARDS = [
  {
    label: "Active Calls",
    value: 2,
    icon: PhoneCall,
    color: "var(--call-active)",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
  },
  {
    label: "In Queue",
    value: 5,
    icon: Users,
    color: "var(--call-incoming)",
    bg: "rgba(250,204,21,0.1)",
    border: "rgba(250,204,21,0.2)",
  },
  {
    label: "Missed Today",
    value: 7,
    icon: PhoneMissed,
    color: "var(--call-missed)",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
  {
    label: "Resolved",
    value: 43,
    icon: TrendingUp,
    color: "var(--accent)",
    bg: "rgba(99,102,241,0.1)",
    border: "rgba(99,102,241,0.2)",
  },
];

const QUEUE = [
  { id: "q1", name: "Alex Turner",    phone: "+1 555 880 2211", wait: "00:42", status: "incoming" },
  { id: "q2", name: "Maria Gonzalez", phone: "+1 555 443 9900", wait: "01:15", status: "incoming" },
  { id: "q3", name: "Tom Baker",      phone: "+1 555 667 3344", wait: "02:03", status: "on-hold" },
];

function StatCard({ label, value: initValue, icon: Icon, color, bg, border }) {
  const [value, setValue] = useState(initValue);

  // Subtle live random drift to make it feel real
  useEffect(() => {
    const t = setInterval(() => {
      setValue((v) => Math.max(0, v + (Math.random() > 0.7 ? 1 : 0)));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border"
      style={{ background: bg, borderColor: border }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(0,0,0,0.2)" }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums" style={{ color }}>
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export default function LiveMonitor() {
  return (
    <section className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Call Queue */}
      <div
        className="rounded-xl border border-slate-700/40 overflow-hidden"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <Clock size={15} style={{ color: "var(--accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              Call Queue
            </h2>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(250,204,21,0.15)", color: "var(--call-incoming)" }}
          >
            {QUEUE.length} waiting
          </span>
        </div>

        <div className="divide-y divide-slate-700/30">
          {QUEUE.map((item, i) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-700/20 transition-colors">
              <span className="text-xs text-slate-500 w-4 shrink-0">{i + 1}</span>
              <CallIndicator status={item.status} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-main)" }}>
                  {item.name}
                </p>
                <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  {item.phone}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-xs" style={{ color: "var(--call-incoming)" }}>
                <Clock size={11} />
                <span className="font-mono">{item.wait}</span>
              </div>
              <button
                className="hidden sm:block text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ background: "var(--accent)", color: "white" }}
              >
                Answer
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
