"use client";

import { useState, useMemo } from "react";
import {
  PhoneMissed, Phone, PhoneCall, Clock, User, Building2,
  Search, Filter, Download, RefreshCw, CheckCircle2,
  AlertTriangle, AlertCircle, ChevronUp, ChevronDown,
  ChevronsUpDown, MessageSquarePlus, RotateCcw, SlidersHorizontal,
  Flame, Timer, TrendingDown,
} from "lucide-react";

// ── Sample data ───────────────────────────────────────────────────────────────

const now = new Date("2026-03-15T14:55:00");

function minutesAgo(dateStr, timeStr) {
  const dt = new Date(`${dateStr}T${timeStr}:00`);
  return Math.floor((now - dt) / 60000);
}

const RAW_MISSED = [
  { id: "m001", caller: "James Hopper",    phone: "+1 555 201 4432", dept: "Sales",      date: "2026-03-15", time: "14:48", attempts: 3, notes: "",  status: "pending"   },
  { id: "m002", caller: "Unknown",         phone: "+1 555 090 4499", dept: "—",          date: "2026-03-15", time: "14:31", attempts: 1, notes: "",  status: "pending"   },
  { id: "m003", caller: "Chloe Nakamura",  phone: "+1 555 773 8821", dept: "Billing",    date: "2026-03-15", time: "14:15", attempts: 4, notes: "Billing dispute – urgent", status: "pending" },
  { id: "m004", caller: "Ethan Greaves",   phone: "+1 555 556 3301", dept: "Support",    date: "2026-03-15", time: "13:52", attempts: 2, notes: "",  status: "attempted" },
  { id: "m005", caller: "Rosa Delgado",    phone: "+1 555 334 7720", dept: "Sales",      date: "2026-03-15", time: "13:41", attempts: 1, notes: "",  status: "pending"   },
  { id: "m006", caller: "Ben Okafor",      phone: "+1 555 334 9900", dept: "Billing",    date: "2026-03-15", time: "13:30", attempts: 5, notes: "Called 5x – escalate", status: "pending" },
  { id: "m007", caller: "Oliver Chen",     phone: "+1 555 448 2200", dept: "Support",    date: "2026-03-15", time: "12:10", attempts: 2, notes: "",  status: "attempted" },
  { id: "m008", caller: "Zara Ahmed",      phone: "+1 555 992 1104", dept: "Onboarding", date: "2026-03-15", time: "11:55", attempts: 1, notes: "",  status: "pending"   },
  { id: "m009", caller: "Marcus Vega",     phone: "+1 555 671 8833", dept: "Management", date: "2026-03-15", time: "11:20", attempts: 3, notes: "VIP client", status: "pending" },
  { id: "m010", caller: "Unknown",         phone: "+1 555 103 5544", dept: "—",          date: "2026-03-15", time: "10:48", attempts: 1, notes: "",  status: "resolved"  },
  { id: "m011", caller: "Nina Kostakis",   phone: "+1 555 229 7712", dept: "HR",         date: "2026-03-15", time: "10:05", attempts: 2, notes: "",  status: "resolved"  },
  { id: "m012", caller: "Liam Fitzroy",    phone: "+1 555 880 4000", dept: "Sales",      date: "2026-03-14", time: "17:32", attempts: 3, notes: "",  status: "attempted" },
  { id: "m013", caller: "Priya Bose",      phone: "+1 555 312 6650", dept: "Support",    date: "2026-03-14", time: "16:44", attempts: 1, notes: "",  status: "resolved"  },
  { id: "m014", caller: "Carlos Ibarra",   phone: "+1 555 445 2291", dept: "Billing",    date: "2026-03-14", time: "15:58", attempts: 4, notes: "Churn risk – priority callback", status: "attempted" },
  { id: "m015", caller: "Fiona McLaren",   phone: "+1 555 102 6677", dept: "HR",         date: "2026-03-14", time: "14:22", attempts: 2, notes: "",  status: "resolved"  },
  { id: "m016", caller: "Devon Price",     phone: "+1 555 667 1199", dept: "Sales",      date: "2026-03-14", time: "11:10", attempts: 1, notes: "",  status: "resolved"  },
  { id: "m017", caller: "Anika Reyes",     phone: "+1 555 770 3344", dept: "Onboarding", date: "2026-03-13", time: "14:00", attempts: 2, notes: "",  status: "resolved"  },
  { id: "m018", caller: "Steve Kowalski",  phone: "+1 555 556 8812", dept: "Support",    date: "2026-03-13", time: "10:30", attempts: 5, notes: "Repeated attempts",         status: "resolved"  },
];

// Enrich with derived fields
const MISSED = RAW_MISSED.map(r => {
  const mins = minutesAgo(r.date, r.time);
  let priority;
  if (r.attempts >= 4 || mins < 30) priority = "high";
  else if (r.attempts >= 2 || mins < 120) priority = "medium";
  else priority = "low";
  return { ...r, minsAgo: mins, priority };
});

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:   { label: "Pending",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  attempted: { label: "Attempted", color: "#f97316", bg: "rgba(249,115,22,0.12)",  dot: "#f97316" },
  resolved:  { label: "Resolved",  color: "#22c55e", bg: "rgba(34,197,94,0.12)",   dot: "#22c55e" },
};

const PRIORITY_CFG = {
  high:   { label: "High",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",  icon: Flame },
  medium: { label: "Medium", color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: AlertTriangle },
  low:    { label: "Low",    color: "#94a3b8", bg: "rgba(148,163,184,0.08)",icon: AlertCircle },
};

const DEPT_COLORS = {
  Sales: "#6366f1", Support: "#22c55e", Billing: "#ef4444",
  HR: "#a78bfa", Management: "#f97316", Onboarding: "#06b6d4", "—": "#475569",
};

const COLS = [
  { key: "caller",   label: "Caller",       sort: true  },
  { key: "phone",    label: "Phone",        sort: false },
  { key: "date",     label: "Missed At",    sort: true  },
  { key: "minsAgo",  label: "Time Ago",     sort: true  },
  { key: "dept",     label: "Department",   sort: true  },
  { key: "attempts", label: "Attempts",     sort: true  },
  { key: "priority", label: "Priority",     sort: true  },
  { key: "status",   label: "Status",       sort: true  },
  { key: "notes",    label: "Notes",        sort: false },
  { key: "actions",  label: "",             sort: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAgo(mins) {
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function useStats(data) {
  return useMemo(() => ({
    total:     data.length,
    pending:   data.filter(d => d.status === "pending").length,
    attempted: data.filter(d => d.status === "attempted").length,
    resolved:  data.filter(d => d.status === "resolved").length,
    high:      data.filter(d => d.priority === "high").length,
  }), [data]);
}

function StatCard({ label, value, color, sub, icon: Icon }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border flex-1 min-w-[120px]"
      style={{ background: `${color}08`, borderColor: `${color}22` }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums leading-tight" style={{ color }}>{value}</div>
        <div className="text-[10px] text-slate-400 leading-tight">{label}</div>
        {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} className="text-slate-600" />;
  return sortDir === "asc"
    ? <ChevronUp   size={11} style={{ color: "var(--accent)" }} />
    : <ChevronDown size={11} style={{ color: "var(--accent)" }} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MissedCallsPage() {
  const [rows,    setRows]    = useState(MISSED);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");   // all | pending | attempted | resolved
  const [priFilter, setPriFilter] = useState("all"); // all | high | medium | low
  const [sortKey, setSortKey] = useState("minsAgo");
  const [sortDir, setSortDir] = useState("asc");
  const [page,    setPage]    = useState(1);
  const [resolving, setResolving] = useState(null);
  const PER_PAGE = 10;

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  function handleResolve(id) {
    setResolving(id);
    setTimeout(() => {
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: "resolved" } : r));
      setResolving(null);
    }, 600);
  }

  function handleAttempt(id) {
    setRows(prev => prev.map(r =>
      r.id === id ? { ...r, status: "attempted", attempts: r.attempts + 1 } : r
    ));
  }

  const filtered = useMemo(() => {
    let data = rows;
    if (filter !== "all")    data = data.filter(r => r.status === filter);
    if (priFilter !== "all") data = data.filter(r => r.priority === priFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        r.caller.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.dept.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    }
    data = [...data].sort((a, b) => {
      let av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      if (sortKey === "date") { av = a.date + a.time; bv = b.date + b.time; }
      const priOrder = { high: 0, medium: 1, low: 2 };
      if (sortKey === "priority") { av = priOrder[a.priority]; bv = priOrder[b.priority]; }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [rows, search, filter, priFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const stats      = useStats(rows);

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.15)" }}
          >
            <PhoneMissed size={18} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Missed Calls</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {stats.pending} pending callback · {stats.total} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 hover:border-indigo-500/50 transition-colors"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-900/40 hover:border-red-500/60 transition-colors"
            style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
          >
            <RotateCcw size={13} /> Bulk Callback
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="flex items-stretch gap-3 flex-wrap">
        <StatCard label="Total Missed"  value={stats.total}     color="#94a3b8" icon={PhoneMissed}  />
        <StatCard label="Pending"       value={stats.pending}   color="#ef4444" icon={Timer}        sub="Need callback" />
        <StatCard label="Attempted"     value={stats.attempted} color="#f97316" icon={RefreshCw}    sub="In progress" />
        <StatCard label="Resolved"      value={stats.resolved}  color="#22c55e" icon={CheckCircle2} sub="Closed out" />
        <StatCard label="High Priority" value={stats.high}      color="#a78bfa" icon={Flame}        sub="Act fast" />
      </div>

      {/* ── Urgent banner ── */}
      {stats.pending > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-900/40"
          style={{ background: "rgba(239,68,68,0.06)" }}
        >
          <AlertTriangle size={16} style={{ color: "#ef4444" }} className="shrink-0" />
          <p className="text-xs" style={{ color: "#fca5a5" }}>
            <span className="font-bold">{stats.pending} calls</span> are waiting for a callback —
            {stats.high > 0 && <span className="font-bold text-red-400"> {stats.high} high-priority</span>} callers
            have been waiting the longest. Prioritise callbacks within 30 minutes.
          </p>
        </div>
      )}

      {/* ── Toolbar ── */}
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
            placeholder="Search caller, dept, notes…"
            className="bg-transparent text-xs text-slate-300 placeholder:text-slate-500 outline-none w-full"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <Filter size={13} className="text-slate-500 mr-0.5" />
          {[
            { val: "all",       label: "All"       },
            { val: "pending",   label: "Pending"   },
            { val: "attempted", label: "Attempted" },
            { val: "resolved",  label: "Resolved"  },
          ].map(f => (
            <button
              key={f.val}
              onClick={() => { setFilter(f.val); setPage(1); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                background: filter === f.val ? "var(--accent)" : "rgba(99,102,241,0.08)",
                color:      filter === f.val ? "white"          : "var(--text-muted)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1">
          <SlidersHorizontal size={13} className="text-slate-500 mr-0.5" />
          {[
            { val: "all",    label: "Any"    },
            { val: "high",   label: "High"   },
            { val: "medium", label: "Medium" },
            { val: "low",    label: "Low"    },
          ].map(p => (
            <button
              key={p.val}
              onClick={() => { setPriFilter(p.val); setPage(1); }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                background: priFilter === p.val ? "#f97316" : "rgba(249,115,22,0.08)",
                color:      priFilter === p.val ? "white"    : "#94a3b8",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-500 tabular-nums">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      <div
        className="rounded-xl border border-slate-700/40 overflow-hidden"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">

            {/* Head */}
            <thead>
              <tr style={{ background: "rgba(15,23,42,0.7)", borderBottom: "1px solid #1e293b" }}>
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
                  <td colSpan={COLS.length} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 size={28} className="text-green-500/40" />
                      <span className="text-slate-500 text-sm">No missed calls match your filters</span>
                    </div>
                  </td>
                </tr>
              ) : pageRows.map((row, i) => {
                const sc  = STATUS_CFG[row.status];
                const pc  = PRIORITY_CFG[row.priority];
                const PrIcon = pc.icon;
                const isResolving = resolving === row.id;
                const deptColor = DEPT_COLORS[row.dept] ?? "#6366f1";

                // Time-ago urgency colour
                const agoColor = row.minsAgo < 30 ? "#ef4444"
                  : row.minsAgo < 120 ? "#f97316"
                  : "#94a3b8";

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
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                        >
                          {row.caller !== "Unknown" ? row.caller[0] : <User size={11} />}
                        </div>
                        <div>
                          <div className="font-semibold" style={{ color: "var(--text-main)" }}>
                            {row.caller}
                          </div>
                          {row.notes && (
                            <div className="text-[10px] text-amber-400/80 truncate max-w-[140px]">
                              {row.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {row.phone}
                    </td>

                    {/* Missed at */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div style={{ color: "var(--text-main)" }}>{row.date}</div>
                      <div className="text-slate-500">{row.time}</div>
                    </td>

                    {/* Time ago */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="flex items-center gap-1 font-semibold tabular-nums"
                        style={{ color: agoColor }}
                      >
                        <Timer size={11} />
                        {fmtAgo(row.minsAgo)}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: `${deptColor}18`, color: deptColor }}
                      >
                        {row.dept}
                      </span>
                    </td>

                    {/* Attempts */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(row.attempts, 5) }).map((_, idx) => (
                            <span
                              key={idx}
                              className="w-1.5 h-3 rounded-sm"
                              style={{
                                background: row.attempts >= 4
                                  ? "#ef4444"
                                  : row.attempts >= 2
                                  ? "#f97316"
                                  : "#6366f1",
                                opacity: 0.4 + idx * 0.12,
                              }}
                            />
                          ))}
                        </div>
                        <span className="font-mono font-semibold" style={{ color: row.attempts >= 4 ? "#ef4444" : "var(--text-muted)" }}>
                          {row.attempts}×
                        </span>
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit"
                        style={{ background: pc.bg, color: pc.color }}
                      >
                        <PrIcon size={9} />
                        {pc.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: sc.dot }}
                        />
                        <span style={{ color: sc.color }}>{sc.label}</span>
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3 max-w-[160px]">
                      {row.notes ? (
                        <span className="text-amber-400/70 italic truncate block">{row.notes}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {/* Call back */}
                        <button
                          onClick={() => handleAttempt(row.id)}
                          disabled={row.status === "resolved"}
                          title="Mark callback attempt"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
                          style={{
                            background: row.status === "resolved" ? "transparent" : "rgba(99,102,241,0.15)",
                            color: row.status === "resolved" ? "#475569" : "var(--accent)",
                            border: "1px solid",
                            borderColor: row.status === "resolved" ? "#334155" : "rgba(99,102,241,0.3)",
                          }}
                        >
                          <PhoneCall size={10} /> Call Back
                        </button>

                        {/* Resolve */}
                        {row.status !== "resolved" ? (
                          <button
                            onClick={() => handleResolve(row.id)}
                            title="Mark as resolved"
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-105"
                            style={{
                              background: isResolving ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.1)",
                              color: "#22c55e",
                              border: "1px solid rgba(34,197,94,0.3)",
                            }}
                          >
                            <CheckCircle2 size={10} />
                            {isResolving ? "…" : "Resolve"}
                          </button>
                        ) : (
                          <span
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold"
                            style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}
                          >
                            <CheckCircle2 size={10} /> Done
                          </span>
                        )}

                        {/* Note */}
                        <button
                          title="Add note"
                          className="p-1.5 rounded-lg transition-colors hover:bg-slate-700/50"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <MessageSquarePlus size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t border-slate-800"
            style={{ background: "rgba(15,23,42,0.4)" }}
          >
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} · {filtered.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const n = idx + 1;
                if (totalPages > 7 && Math.abs(n - page) > 2 && n !== 1 && n !== totalPages)
                  return idx === 1 || idx === totalPages - 2
                    ? <span key={n} className="px-1 text-slate-600 text-xs">…</span>
                    : null;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className="w-7 h-6 rounded text-xs border transition-colors"
                    style={{
                      background:   page === n ? "var(--accent)" : "transparent",
                      color:        page === n ? "white" : "var(--text-muted)",
                      borderColor:  page === n ? "var(--accent)" : "#334155",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
