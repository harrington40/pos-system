"use client";

import { useState, useMemo } from "react";
import {
  History, Phone, PhoneMissed, PhoneOff, PhoneIncoming,
  Clock, User, Building2, Search, Filter, Download,
  ChevronUp, ChevronDown, ChevronsUpDown, Play, Tag,
} from "lucide-react";

// ── Sample data ───────────────────────────────────────────────────────────────

const HISTORY = [
  { id: "h001", caller: "Sarah Johnson",    phone: "+1 555 203 8821", dept: "Sales",      status: "completed", duration: "02:34", date: "2026-03-14", time: "14:41", sentiment: "positive", intent: "Pricing inquiry",    ai: true,  recording: true  },
  { id: "h002", caller: "Marcus Reid",      phone: "+1 555 874 0012", dept: "Support",    status: "completed", duration: "00:52", date: "2026-03-14", time: "14:43", sentiment: "neutral",  intent: "Technical support",  ai: true,  recording: true  },
  { id: "h003", caller: "Diana Wu",         phone: "+1 555 994 3310", dept: "Billing",    status: "transferred",duration:"01:18",date: "2026-03-14", time: "14:39", sentiment: "negative", intent: "Billing dispute",    ai: true,  recording: true  },
  { id: "h004", caller: "James Puerto",     phone: "+1 555 101 7755", dept: "Support",    status: "completed", duration: "03:07", date: "2026-03-14", time: "14:28", sentiment: "positive", intent: "Installation help",   ai: true,  recording: true  },
  { id: "h005", caller: "Unknown",          phone: "+1 555 090 4499", dept: "—",          status: "missed",    duration: "00:00", date: "2026-03-14", time: "14:15", sentiment: "neutral",  intent: "Unknown",            ai: false, recording: false },
  { id: "h006", caller: "Priya Patel",      phone: "+1 555 312 8873", dept: "Onboarding", status: "completed", duration: "01:55", date: "2026-03-14", time: "14:44", sentiment: "positive", intent: "Onboarding request",  ai: true,  recording: true  },
  { id: "h007", caller: "Tom Baker",        phone: "+1 555 667 3344", dept: "Billing",    status: "transferred",duration:"02:12",date: "2026-03-13", time: "11:02", sentiment: "neutral",  intent: "Invoice query",       ai: true,  recording: true  },
  { id: "h008", caller: "Elena Vasquez",    phone: "+1 555 773 9901", dept: "Sales",      status: "completed", duration: "04:31", date: "2026-03-13", time: "10:14", sentiment: "positive", intent: "Demo request",        ai: true,  recording: true  },
  { id: "h009", caller: "Oliver Chen",      phone: "+1 555 448 2200", dept: "Support",    status: "missed",    duration: "00:00", date: "2026-03-13", time: "09:55", sentiment: "neutral",  intent: "Unknown",            ai: false, recording: false },
  { id: "h010", caller: "Amara Wilson",     phone: "+1 555 881 0033", dept: "Management", status: "completed", duration: "05:18", date: "2026-03-13", time: "09:20", sentiment: "positive", intent: "Contract renewal",    ai: true,  recording: true  },
  { id: "h011", caller: "Derek Santos",     phone: "+1 555 556 7712", dept: "Support",    status: "voicemail", duration: "01:02", date: "2026-03-12", time: "16:35", sentiment: "neutral",  intent: "Password reset",      ai: false, recording: true  },
  { id: "h012", caller: "Natasha Ivanova",  phone: "+1 555 229 4480", dept: "Sales",      status: "completed", duration: "03:44", date: "2026-03-12", time: "15:58", sentiment: "positive", intent: "Upsell inquiry",      ai: true,  recording: true  },
  { id: "h013", caller: "Ben Okafor",       phone: "+1 555 334 9900", dept: "Billing",    status: "missed",    duration: "00:00", date: "2026-03-12", time: "14:22", sentiment: "neutral",  intent: "Unknown",            ai: false, recording: false },
  { id: "h014", caller: "Fiona McLaren",    phone: "+1 555 102 6677", dept: "HR",         status: "completed", duration: "02:00", date: "2026-03-12", time: "13:10", sentiment: "neutral",  intent: "HR enquiry",          ai: true,  recording: true  },
  { id: "h015", caller: "Ryan Nguyen",      phone: "+1 555 773 1144", dept: "Onboarding", status: "transferred",duration:"01:45",date: "2026-03-11", time: "11:30", sentiment: "positive", intent: "Account setup",       ai: true,  recording: true  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  completed:   { label: "Completed",   color: "#22c55e", bg: "rgba(34,197,94,0.12)",   icon: Phone },
  missed:      { label: "Missed",      color: "#ef4444", bg: "rgba(239,68,68,0.12)",   icon: PhoneMissed },
  transferred: { label: "Transferred", color: "#6366f1", bg: "rgba(99,102,241,0.12)",  icon: PhoneIncoming },
  voicemail:   { label: "Voicemail",   color: "#facc15", bg: "rgba(250,204,21,0.12)",  icon: PhoneOff },
};

const SENTIMENT_CFG = {
  positive: { color: "#22c55e", label: "Positive" },
  neutral:  { color: "#94a3b8", label: "Neutral"  },
  negative: { color: "#ef4444", label: "Negative" },
};

const COLS = [
  { key: "caller",    label: "Caller",     sort: true },
  { key: "phone",     label: "Phone",      sort: false },
  { key: "date",      label: "Date & Time",sort: true },
  { key: "duration",  label: "Duration",   sort: true },
  { key: "dept",      label: "Department", sort: true },
  { key: "status",    label: "Status",     sort: true },
  { key: "sentiment", label: "Sentiment",  sort: true },
  { key: "intent",    label: "Intent",     sort: false },
  { key: "ai",        label: "AI Handled", sort: true },
  { key: "actions",   label: "",           sort: false },
];

// Stats
function useStats(data) {
  return useMemo(() => ({
    total:       data.length,
    completed:   data.filter(d => d.status === "completed").length,
    missed:      data.filter(d => d.status === "missed").length,
    transferred: data.filter(d => d.status === "transferred").length,
    aiHandled:   data.filter(d => d.ai).length,
  }), [data]);
}

function StatPill({ label, value, color }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-2.5 rounded-xl border min-w-[80px]"
      style={{ background: `${color}08`, borderColor: `${color}25` }}
    >
      <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={12} className="text-slate-600" />;
  return sortDir === "asc"
    ? <ChevronUp   size={12} style={{ color: "var(--accent)" }} />
    : <ChevronDown size={12} style={{ color: "var(--accent)" }} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CallHistoryPage() {
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all"); // all | completed | missed | transferred | voicemail
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page,    setPage]    = useState(1);
  const PER_PAGE = 10;

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let rows = HISTORY;
    if (filter !== "all") rows = rows.filter(r => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.caller.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.intent.toLowerCase().includes(q) ||
        r.dept.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      if (sortKey === "date") { av = a.date + a.time; bv = b.date + b.time; }
      if (sortKey === "ai")   { av = a.ai ? 1 : 0;   bv = b.ai ? 1 : 0; }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [search, filter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const stats      = useStats(HISTORY);

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <History size={20} style={{ color: "var(--accent)" }} />
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Call History</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{HISTORY.length} total records</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-700 hover:border-indigo-500/60"
          style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Stat pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatPill label="Total"       value={stats.total}       color="#94a3b8" />
        <StatPill label="Completed"   value={stats.completed}   color="#22c55e" />
        <StatPill label="Missed"      value={stats.missed}      color="#ef4444" />
        <StatPill label="Transferred" value={stats.transferred} color="#6366f1" />
        <StatPill label="AI Handled"  value={stats.aiHandled}   color="#a78bfa" />
      </div>

      {/* Toolbar */}
      <div
        className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl border border-slate-700/40"
        style={{ background: "var(--bg-card)" }}
      >
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5">
          <Search size={13} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search caller, intent, dept…"
            className="bg-transparent text-xs text-slate-300 placeholder:text-slate-500 outline-none w-full"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1">
          <Filter size={13} className="text-slate-500 mr-1" />
          {["all", "completed", "missed", "transferred", "voicemail"].map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-colors"
              style={{
                background: filter === f ? "var(--accent)" : "rgba(99,102,241,0.08)",
                color:      filter === f ? "white"          : "var(--text-muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-500 tabular-nums">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border border-slate-700/40 overflow-hidden"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">

            {/* Head */}
            <thead>
              <tr style={{ background: "rgba(15,23,42,0.6)", borderBottom: "1px solid #1e293b" }}>
                {COLS.map(col => (
                  <th
                    key={col.key}
                    className="text-left px-4 py-3 font-semibold whitespace-nowrap select-none"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {col.sort ? (
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center gap-1 hover:text-slate-200 transition-colors"
                      >
                        {col.label}
                        <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                      </button>
                    ) : col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-800/60">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-10 text-center text-slate-500">
                    No records match your search
                  </td>
                </tr>
              ) : pageRows.map((row, i) => {
                const sc = STATUS_CFG[row.status] ?? STATUS_CFG.completed;
                const StatusIcon = sc.icon;
                const sent = SENTIMENT_CFG[row.sentiment] ?? SENTIMENT_CFG.neutral;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-700/20 transition-colors"
                    style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}
                  >
                    {/* Caller */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "rgba(99,102,241,0.2)", color: "var(--accent)" }}
                        >
                          {row.caller !== "Unknown" ? row.caller[0] : <User size={10} />}
                        </div>
                        <span className="font-medium" style={{ color: "var(--text-main)" }}>
                          {row.caller}
                        </span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {row.phone}
                    </td>

                    {/* Date & Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div style={{ color: "var(--text-main)" }}>{row.date}</div>
                      <div className="text-slate-500">{row.time}</div>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <Clock size={11} />
                        {row.duration}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <Building2 size={11} />
                        {row.dept}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold w-fit"
                        style={{ background: sc.bg, color: sc.color }}
                      >
                        <StatusIcon size={10} />
                        {sc.label}
                      </span>
                    </td>

                    {/* Sentiment */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="w-2 h-2 rounded-full inline-block mr-1"
                        style={{ background: sent.color }}
                      />
                      <span style={{ color: sent.color }}>{sent.label}</span>
                    </td>

                    {/* Intent */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        <Tag size={10} />
                        {row.intent}
                      </span>
                    </td>

                    {/* AI Handled */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          background: row.ai ? "rgba(167,139,250,0.15)" : "rgba(71,85,105,0.15)",
                          color:      row.ai ? "#a78bfa"                 : "#475569",
                        }}
                      >
                        {row.ai ? "AI" : "Human"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.recording && (
                        <button
                          className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors hover:bg-indigo-500/20"
                          style={{ color: "var(--accent)" }}
                          title="Play recording"
                        >
                          <Play size={11} />
                          <span className="text-[10px]">Play</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t border-slate-800/60"
          style={{ background: "rgba(15,23,42,0.4)" }}
        >
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} · {filtered.length} records
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-30 transition-colors hover:bg-slate-700/50"
              style={{ color: "var(--text-muted)" }}
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce((acc, n, idx, arr) => {
                if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span key={`e${idx}`} className="px-1 text-slate-600 text-xs">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className="w-7 h-7 rounded-md text-xs font-semibold transition-colors"
                    style={{
                      background: page === item ? "var(--accent)" : "transparent",
                      color:      page === item ? "white"          : "var(--text-muted)",
                    }}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-30 transition-colors hover:bg-slate-700/50"
              style={{ color: "var(--text-muted)" }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
