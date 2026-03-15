"use client";

import { useState, useEffect, useRef } from "react";
import {
  PhoneCall, PhoneOff, PhoneMissed, Phone, PhoneIncoming,
  PhoneForwarded, Pause, Play, Users, Clock, Activity,
  Mic, MicOff, Volume2, VolumeX, AlertTriangle, CheckCircle,
  BarChart2, Zap, User, Building2, RefreshCw,
} from "lucide-react";

// ── Fake data seeds ────────────────────────────────────────────────────────────

const CALLERS = [
  { name: "James Harrington",  phone: "+1 (212) 555-0182", company: "Harrington & Co",       dept: "Sales"       },
  { name: "Sofia Patel",       phone: "+1 (415) 555-0247", company: "BlueWave Solutions",     dept: "Support"     },
  { name: "Marcus Webb",       phone: "+1 (312) 555-0391", company: "Webb Industries",        dept: "Billing"     },
  { name: "Unknown Caller",    phone: "+1 (646) 555-0123", company: "",                       dept: "Support"     },
  { name: "Elena Kowalski",    phone: "+1 (713) 555-0567", company: "Kowalski Logistics",     dept: "Management"  },
  { name: "David Nguyen",      phone: "+1 (206) 555-0834", company: "Pacific Rim Tech",       dept: "Onboarding"  },
  { name: "Rachel Kim",        phone: "+1 (617) 555-0299", company: "NewGen Health",          dept: "HR"          },
  { name: "Tom Bradford",      phone: "+1 (404) 555-0741", company: "Bradford Consulting",    dept: "Sales"       },
  { name: "Priya Singh",       phone: "+1 (773) 555-0182", company: "Apex Analytics",         dept: "Billing"     },
  { name: "Chris Almonte",     phone: "+1 (858) 555-0558", company: "Almonte Partners",       dept: "Support"     },
];

const INTENTS = [
  "Product enquiry",
  "Billing support",
  "Appointment scheduling",
  "Technical support",
  "Account management",
  "General information",
  "Complaint — escalate",
  "Onboarding assistance",
];

const SENTIMENTS = ["positive", "neutral", "negative"];

const DEPT_COLOR = {
  Sales:      "#6366f1",
  Support:    "#22c55e",
  Billing:    "#ef4444",
  HR:         "#a78bfa",
  Management: "#f97316",
  Onboarding: "#06b6d4",
};

let _id = 1;

function makeCall(status = "active") {
  const c = CALLERS[Math.floor(Math.random() * CALLERS.length)];
  return {
    id: _id++,
    ...c,
    status,
    intent:    INTENTS[Math.floor(Math.random() * INTENTS.length)],
    sentiment: SENTIMENTS[Math.floor(Math.random() * 3)],
    confidence: 60 + Math.floor(Math.random() * 36),
    elapsed: status === "active" ? Math.floor(Math.random() * 180) : 0,
    muted: false,
    volume: true,
    aiHandled: Math.random() > 0.35,
    waitTime: Math.floor(Math.random() * 90),
  };
}

function fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700/40" style={{ background: "var(--bg-card)" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
        <Icon size={16} style={{ color: iconColor }} />
      </div>
      <div>
        <div className="text-xl font-bold leading-none" style={{ color: "var(--text-main)" }}>{value}</div>
        <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
        {sub && <div className="text-[10px]" style={{ color: "#475569" }}>{sub}</div>}
      </div>
    </div>
  );
}

function SentimentDot({ s }) {
  const c = { positive: "#4ade80", neutral: "#94a3b8", negative: "#f87171" }[s] ?? "#94a3b8";
  const label = { positive: "Positive", neutral: "Neutral", negative: "Negative" }[s] ?? s;
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: c }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {label}
    </span>
  );
}

function ConfBar({ val }) {
  const color = val >= 80 ? "#4ade80" : val >= 65 ? "#facc15" : "#f87171";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-1 rounded-full bg-slate-700/60 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: color }} />
      </div>
      <span className="text-[10px]" style={{ color }}>{val}%</span>
    </div>
  );
}

function DeptPill({ dept }) {
  const c = DEPT_COLOR[dept] ?? "#6366f1";
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide"
      style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}>
      {dept}
    </span>
  );
}

// ── Active Call Card ───────────────────────────────────────────────────────────

function ActiveCallCard({ call, onAction }) {
  const elapsedRef = useRef(call.elapsed);
  const [elapsed, setElapsed] = useState(call.elapsed);

  useEffect(() => {
    elapsedRef.current = call.elapsed;
  }, [call.elapsed]);

  useEffect(() => {
    const t = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const isLong = elapsed > 240;

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3 transition-shadow hover:shadow-lg hover:shadow-black/20"
      style={{
        background: "var(--bg-card)",
        borderColor: call.status === "on-hold" ? "#6366f155" : "#22c55e33",
        boxShadow: call.status !== "on-hold" ? "0 0 0 1px #22c55e0d" : undefined,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: "rgba(99,102,241,0.18)", color: "var(--accent)" }}>
            {call.name[0]}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: "var(--text-main)" }}>{call.name}</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{call.phone}</div>
            {call.company && <div className="text-[10px] truncate" style={{ color: "#475569" }}>{call.company}</div>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: call.status === "on-hold" ? "rgba(99,102,241,0.12)" : "rgba(34,197,94,0.12)",
              color:      call.status === "on-hold" ? "#818cf8" : "#4ade80",
            }}
          >
            {call.status === "on-hold" ? "⏸ " : "●  "}{fmt(elapsed)}
          </span>
          {isLong && (
            <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "#fb923c" }}>
              <AlertTriangle size={8} /> Long call
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <DeptPill dept={call.dept} />
        <SentimentDot s={call.sentiment} />
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/40 truncate max-w-[130px]"
          style={{ color: "var(--text-muted)" }}>
          {call.intent}
        </span>
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>AI confidence</span>
        <ConfBar val={call.confidence} />
      </div>

      {/* AI badge */}
      <div className="flex items-center gap-1.5">
        {call.aiHandled
          ? <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#4ade80" }}><Zap size={9} /> AI handling</span>
          : <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "#fb923c" }}><User size={9} /> Needs agent</span>
        }
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/50">
        <button
          title={call.muted ? "Unmute" : "Mute"}
          onClick={() => onAction(call.id, "mute")}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-700/50"
          style={{ color: call.muted ? "#f87171" : "#64748b" }}
        >
          {call.muted ? <MicOff size={13} /> : <Mic size={13} />}
        </button>
        <button
          title={call.volume ? "Mute speaker" : "Unmute speaker"}
          onClick={() => onAction(call.id, "volume")}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-700/50"
          style={{ color: call.volume ? "#64748b" : "#f87171" }}
        >
          {call.volume ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
        <button
          title={call.status === "on-hold" ? "Resume" : "Hold"}
          onClick={() => onAction(call.id, "hold")}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-700/50"
          style={{ color: call.status === "on-hold" ? "#818cf8" : "#64748b" }}
        >
          {call.status === "on-hold" ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <button
          title="Transfer"
          onClick={() => onAction(call.id, "transfer")}
          className="p-1.5 rounded-lg transition-colors hover:bg-slate-700/50"
          style={{ color: "#64748b" }}
        >
          <PhoneForwarded size={13} />
        </button>
        <button
          title="End call"
          onClick={() => onAction(call.id, "end")}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:bg-red-500/20"
          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <PhoneOff size={10} /> End
        </button>
      </div>
    </div>
  );
}

// ── Queue row ──────────────────────────────────────────────────────────────────

function QueueRow({ call, onAnswer, onReject }) {
  const [wait, setWait] = useState(call.waitTime);
  useEffect(() => {
    const t = setInterval(() => setWait(w => w + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const urgent = wait > 60;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
      style={{
        background: "var(--bg-card)",
        borderColor: urgent ? "rgba(251,146,60,0.3)" : "rgba(250,204,21,0.2)",
      }}
    >
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
          style={{ background: "rgba(250,204,21,0.12)", color: "#facc15" }}>
          {call.name[0]}
        </div>
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
          style={{ background: urgent ? "#fb923c" : "#facc15", borderColor: "var(--bg-card)" }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate" style={{ color: "var(--text-main)" }}>{call.name}</div>
        <div className="text-[10px] flex items-center gap-1.5 flex-wrap mt-0.5">
          <span style={{ color: "var(--text-muted)" }}>{call.phone}</span>
          <DeptPill dept={call.dept} />
          <span className="text-[9px]" style={{ color: urgent ? "#fb923c" : "#facc15" }}>
            <Clock size={8} className="inline mr-0.5" />{fmt(wait)} wait
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onReject(call.id)}
          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
          style={{ color: "#f87171" }}
        >
          <PhoneMissed size={13} />
        </button>
        <button
          onClick={() => onAnswer(call.id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors hover:opacity-90"
          style={{ background: "#22c55e", color: "white" }}
        >
          <Phone size={10} /> Answer
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const INITIAL_ACTIVE = [makeCall("active"), makeCall("active"), makeCall("on-hold")];
const INITIAL_QUEUE  = [makeCall("incoming"), makeCall("incoming")];

export default function LiveCallsPage() {
  const [active, setActive]      = useState(INITIAL_ACTIVE);
  const [queue,  setQueue]       = useState(INITIAL_QUEUE);
  const [ended,  setEnded]       = useState(0);
  const [totalToday] = useState(47);
  const [lastEvent,  setLastEvent] = useState(null);

  // Occasionally add an incoming call to the queue
  useEffect(() => {
    const t = setTimeout(() => {
      if (queue.length < 5) {
        const nc = makeCall("incoming");
        setQueue(q => [...q, nc]);
        setLastEvent(`📞 New call from ${nc.name}`);
        setTimeout(() => setLastEvent(null), 4000);
      }
    }, 12000 + Math.random() * 18000);
    return () => clearTimeout(t);
  }, [queue.length]);

  function handleAction(id, action) {
    if (action === "end") {
      setActive(prev => prev.filter(c => c.id !== id));
      setEnded(e => e + 1);
      setLastEvent("Call ended");
      setTimeout(() => setLastEvent(null), 3000);
    } else if (action === "hold") {
      setActive(prev => prev.map(c => c.id === id
        ? { ...c, status: c.status === "on-hold" ? "active" : "on-hold" }
        : c
      ));
    } else if (action === "mute") {
      setActive(prev => prev.map(c => c.id === id ? { ...c, muted: !c.muted } : c));
    } else if (action === "volume") {
      setActive(prev => prev.map(c => c.id === id ? { ...c, volume: !c.volume } : c));
    } else if (action === "transfer") {
      setActive(prev => prev.filter(c => c.id !== id));
      setEnded(e => e + 1);
      setLastEvent("Call transferred to agent");
      setTimeout(() => setLastEvent(null), 3000);
    }
  }

  function handleAnswer(id) {
    const call = queue.find(c => c.id === id);
    if (!call) return;
    setQueue(q => q.filter(c => c.id !== id));
    setActive(a => [...a, { ...call, status: "active", elapsed: 0 }]);
    setLastEvent(`Answered call from ${call.name}`);
    setTimeout(() => setLastEvent(null), 3000);
  }

  function handleReject(id) {
    const call = queue.find(c => c.id === id);
    setQueue(q => q.filter(c => c.id !== id));
    setEnded(e => e + 1);
    setLastEvent(call ? `Call from ${call.name} declined` : "Call declined");
    setTimeout(() => setLastEvent(null), 3000);
  }

  const onHold = active.filter(c => c.status === "on-hold").length;
  const aiHandled = active.filter(c => c.aiHandled).length;

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center relative" style={{ background: "rgba(34,197,94,0.12)" }}>
            <PhoneCall size={18} style={{ color: "#4ade80" }} />
            {active.filter(c => c.status === "active").length > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[var(--bg-base)] animate-pulse" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Live Calls</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Real-time call monitoring &amp; management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastEvent && (
            <span className="text-[11px] px-3 py-1.5 rounded-full animate-pulse"
              style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.2)" }}>
              {lastEvent}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>
            <Activity size={10} /> LIVE
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={PhoneCall}    iconColor="#4ade80"  iconBg="rgba(34,197,94,0.1)"    label="Active Calls"   value={active.filter(c => c.status === "active").length}  />
        <StatCard icon={PhoneIncoming} iconColor="#facc15" iconBg="rgba(250,204,21,0.1)"   label="In Queue"       value={queue.length}         sub={queue.length > 2 ? "⚠ High queue" : undefined} />
        <StatCard icon={Pause}         iconColor="#818cf8" iconBg="rgba(99,102,241,0.1)"   label="On Hold"        value={onHold}               />
        <StatCard icon={BarChart2}     iconColor="#60a5fa" iconBg="rgba(59,130,246,0.1)"   label="Total Today"    value={totalToday + ended}   sub={`${aiHandled} AI handled`} />
      </div>

      {/* Active Calls */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-main)" }}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            Active Calls
            <span className="text-xs font-normal px-1.5 py-0.5 rounded-md" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
              {active.length}
            </span>
          </h2>
        </div>
        {active.length === 0 ? (
          <div className="rounded-xl border border-slate-700/30 flex flex-col items-center justify-center py-14 gap-2"
            style={{ background: "var(--bg-card)" }}>
            <Phone size={28} style={{ color: "#334155" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active calls</p>
            <p className="text-xs" style={{ color: "#334155" }}>Answer a queued call to begin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map(call => (
              <ActiveCallCard key={call.id} call={call} onAction={handleAction} />
            ))}
          </div>
        )}
      </section>

      {/* Incoming Queue */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-main)" }}>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
            Incoming Queue
            {queue.length > 0 && (
              <span className="text-xs font-normal px-1.5 py-0.5 rounded-md" style={{ background: "rgba(250,204,21,0.1)", color: "#facc15" }}>
                {queue.length} waiting
              </span>
            )}
          </h2>
        </div>
        {queue.length === 0 ? (
          <div className="rounded-xl border border-slate-700/30 flex items-center justify-center py-8 gap-2"
            style={{ background: "var(--bg-card)" }}>
            <CheckCircle size={18} style={{ color: "#334155" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Queue is clear</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map(call => (
              <QueueRow key={call.id} call={call} onAnswer={handleAnswer} onReject={handleReject} />
            ))}
          </div>
        )}
      </section>

      {/* AI Status panel */}
      <section>
        <div className="rounded-xl border border-slate-700/40 p-4" style={{ background: "var(--bg-card)" }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-main)" }}>
            <Zap size={14} style={{ color: "var(--accent)" }} /> AI Orchestrator Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "STT Engine",        status: true,  ping: "12ms"  },
              { label: "Intent Classifier",  status: true,  ping: "34ms"  },
              { label: "DeepAI Reasoner",    status: true,  ping: "280ms" },
              { label: "DeepSeek Generator", status: true,  ping: "510ms" },
              { label: "TTS Engine",         status: true,  ping: "67ms"  },
              { label: "CRM Integration",    status: false, ping: "—"     },
            ].map(svc => (
              <div key={svc.label} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-slate-800/50"
                style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: svc.status ? "#4ade80" : "#f87171", boxShadow: svc.status ? "0 0 6px #4ade80" : "none" }} />
                  <span className="text-xs truncate" style={{ color: "var(--text-main)" }}>{svc.label}</span>
                </div>
                <span className="text-[10px] font-mono shrink-0" style={{ color: svc.status ? "#4ade80" : "#f87171" }}>{svc.ping}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
