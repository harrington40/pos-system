"use client";

import { useState, useMemo } from "react";
import {
  BookUser, Phone, PhoneCall, PhoneMissed, Mail, Building2,
  Search, Filter, Download, UserPlus, LayoutGrid, List,
  ChevronUp, ChevronDown, ChevronsUpDown, Star, StarOff,
  Tag, Globe, Clock, MessageSquare, MoreHorizontal,
  CheckCircle2, AlertCircle, User, MapPin, Briefcase,
} from "lucide-react";

// ── Sample contacts ───────────────────────────────────────────────────────────

const CONTACTS_RAW = [
  { id: "c001", name: "Sarah Johnson",   email: "sarah.j@acmecorp.com",   phone: "+1 555 203 8821", company: "Acme Corp",        title: "VP Sales",          dept: "Sales",      calls: 12, missed: 1, lastCall: "2026-03-15", tags: ["VIP","Sales"],        starred: true,  status: "active",   timezone: "EST", notes: "Key account – quarterly review pending" },
  { id: "c002", name: "Marcus Reid",     email: "m.reid@techsolutions.io", phone: "+1 555 874 0012", company: "Tech Solutions",   title: "IT Manager",        dept: "Support",    calls: 7,  missed: 0, lastCall: "2026-03-14", tags: ["Support"],            starred: false, status: "active",   timezone: "PST", notes: "" },
  { id: "c003", name: "Diana Wu",        email: "d.wu@globalfinance.com",  phone: "+1 555 994 3310", company: "Global Finance",   title: "Finance Director",  dept: "Billing",    calls: 9,  missed: 2, lastCall: "2026-03-14", tags: ["Billing","Finance"],  starred: true,  status: "active",   timezone: "CST", notes: "Billing dispute in progress" },
  { id: "c004", name: "James Hopper",    email: "james@hopperind.com",     phone: "+1 555 201 4432", company: "Hopper Industries",title: "CEO",               dept: "Sales",      calls: 5,  missed: 3, lastCall: "2026-03-15", tags: ["VIP","Prospect"],     starred: true,  status: "hot",      timezone: "EST", notes: "Hot lead – follow up today" },
  { id: "c005", name: "Priya Patel",     email: "p.patel@nova.co",         phone: "+1 555 312 8873", company: "Nova Co",          title: "Operations Lead",   dept: "Onboarding", calls: 4,  missed: 0, lastCall: "2026-03-14", tags: ["Onboarding"],         starred: false, status: "active",   timezone: "PST", notes: "" },
  { id: "c006", name: "Tom Baker",       email: "tom.baker@bakers.net",    phone: "+1 555 667 3344", company: "Baker & Sons",     title: "Owner",             dept: "Billing",    calls: 3,  missed: 1, lastCall: "2026-03-13", tags: ["Billing"],            starred: false, status: "active",   timezone: "CST", notes: "" },
  { id: "c007", name: "Elena Vasquez",   email: "evasquez@startech.com",   phone: "+1 555 773 9901", company: "StarTech",         title: "Product Manager",   dept: "Sales",      calls: 15, missed: 0, lastCall: "2026-03-13", tags: ["Sales","Demo"],       starred: true,  status: "active",   timezone: "PST", notes: "Demo scheduled for next week" },
  { id: "c008", name: "Oliver Chen",     email: "oliver@chengroup.hk",     phone: "+1 555 448 2200", company: "Chen Group",       title: "Managing Director", dept: "Support",    calls: 6,  missed: 2, lastCall: "2026-03-13", tags: ["VIP","Support"],      starred: false, status: "at-risk",  timezone: "EST", notes: "Has unresolved support ticket" },
  { id: "c009", name: "Amara Wilson",    email: "awilson@mgmt.io",         phone: "+1 555 881 0033", company: "Wilson Mgmt",      title: "Chief of Staff",    dept: "Management", calls: 18, missed: 0, lastCall: "2026-03-13", tags: ["Management","VIP"],   starred: true,  status: "active",   timezone: "EST", notes: "" },
  { id: "c010", name: "Derek Santos",    email: "derek@santostech.com",    phone: "+1 555 556 7712", company: "Santos Tech",      title: "Sysadmin",          dept: "Support",    calls: 2,  missed: 1, lastCall: "2026-03-12", tags: ["Support"],            starred: false, status: "active",   timezone: "PST", notes: "" },
  { id: "c011", name: "Natasha Ivanova", email: "n.ivanova@ivgroup.ru",    phone: "+1 555 229 4480", company: "IV Group",         title: "Sales Director",    dept: "Sales",      calls: 11, missed: 0, lastCall: "2026-03-12", tags: ["Sales","VIP"],        starred: false, status: "active",   timezone: "CET", notes: "" },
  { id: "c012", name: "Ben Okafor",      email: "b.okafor@okatech.ng",     phone: "+1 555 334 9900", company: "Oka Tech",         title: "CTO",               dept: "Billing",    calls: 4,  missed: 5, lastCall: "2026-03-15", tags: ["Billing","At Risk"],  starred: false, status: "at-risk",  timezone: "WAT", notes: "Repeat missed calls – churn risk" },
  { id: "c013", name: "Fiona McLaren",   email: "fmclaren@hr-elite.co.uk", phone: "+1 555 102 6677", company: "HR Elite",         title: "HR Manager",        dept: "HR",         calls: 6,  missed: 0, lastCall: "2026-03-12", tags: ["HR"],                 starred: false, status: "active",   timezone: "GMT", notes: "" },
  { id: "c014", name: "Ryan Nguyen",     email: "ryan@nguyendev.io",       phone: "+1 555 773 1144", company: "Nguyen Dev",       title: "Lead Developer",    dept: "Onboarding", calls: 3,  missed: 0, lastCall: "2026-03-11", tags: ["Onboarding","Dev"],   starred: false, status: "active",   timezone: "PST", notes: "" },
  { id: "c015", name: "Chloe Nakamura",  email: "c.nakamura@naka.jp",      phone: "+1 555 773 8821", company: "Naka Inc",         title: "CFO",               dept: "Billing",    calls: 8,  missed: 4, lastCall: "2026-03-15", tags: ["Billing","VIP"],      starred: true,  status: "hot",      timezone: "JST", notes: "Billing dispute – urgent callback" },
  { id: "c016", name: "Marcus Vega",     email: "mvega@vegaholdings.com",  phone: "+1 555 671 8833", company: "Vega Holdings",    title: "President",         dept: "Management", calls: 10, missed: 3, lastCall: "2026-03-15", tags: ["VIP","Management"],   starred: true,  status: "hot",      timezone: "CST", notes: "VIP – executive escalation path" },
  { id: "c017", name: "Zara Ahmed",      email: "z.ahmed@ztech.ae",        phone: "+1 555 992 1104", company: "ZTech",            title: "Founder",           dept: "Onboarding", calls: 2,  missed: 1, lastCall: "2026-03-15", tags: ["Onboarding","Prospect"], starred: false, status: "active", timezone: "GST", notes: "" },
  { id: "c018", name: "Liam Fitzroy",    email: "liam@fitzroy.co",         phone: "+1 555 880 4000", company: "Fitzroy Ltd",      title: "Account Exec",      dept: "Sales",      calls: 7,  missed: 3, lastCall: "2026-03-14", tags: ["Sales"],              starred: false, status: "at-risk",  timezone: "GMT", notes: "" },
];

// ── Config ────────────────────────────────────────────────────────────────────

const DEPT_COLOR = {
  Sales: "#6366f1", Support: "#22c55e", Billing: "#ef4444",
  HR: "#a78bfa", Management: "#f97316", Onboarding: "#06b6d4",
};

const STATUS_CFG = {
  active:   { label: "Active",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  hot:      { label: "Hot Lead", color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  "at-risk":{ label: "At Risk",  color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

const TAG_COLOR = {
  VIP:        { bg: "rgba(250,204,21,0.12)",  color: "#facc15" },
  Sales:      { bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
  Support:    { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  Billing:    { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  Finance:    { bg: "rgba(239,68,68,0.1)",    color: "#fca5a5" },
  HR:         { bg: "rgba(167,139,250,0.12)", color: "#c4b5fd" },
  Management: { bg: "rgba(249,115,22,0.1)",   color: "#fdba74" },
  Onboarding: { bg: "rgba(6,182,212,0.12)",   color: "#22d3ee" },
  Prospect:   { bg: "rgba(52,211,153,0.1)",   color: "#6ee7b7" },
  Demo:       { bg: "rgba(99,102,241,0.1)",   color: "#a5b4fc" },
  Dev:        { bg: "rgba(148,163,184,0.1)",  color: "#94a3b8" },
  "At Risk":  { bg: "rgba(239,68,68,0.1)",    color: "#ef4444" },
};

const ALL_TAGS = ["All", "VIP", "Sales", "Support", "Billing", "HR", "Management", "Onboarding", "Prospect"];

const COLS = [
  { key: "name",     label: "Name",        sort: true  },
  { key: "company",  label: "Company",     sort: true  },
  { key: "dept",     label: "Department",  sort: true  },
  { key: "title",    label: "Title",       sort: false },
  { key: "phone",    label: "Phone",       sort: false },
  { key: "calls",    label: "Calls",       sort: true  },
  { key: "missed",   label: "Missed",      sort: true  },
  { key: "lastCall", label: "Last Call",   sort: true  },
  { key: "status",   label: "Status",      sort: true  },
  { key: "actions",  label: "",            sort: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarColor(name) {
  const palette = ["#6366f1","#22c55e","#f97316","#a78bfa","#06b6d4","#f43f5e","#eab308","#14b8a6"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function initials(name) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} className="text-slate-600" />;
  return sortDir === "asc"
    ? <ChevronUp size={11} style={{ color: "var(--accent)" }} />
    : <ChevronDown size={11} style={{ color: "var(--accent)" }} />;
}

function TagBadge({ tag }) {
  const cfg = TAG_COLOR[tag] ?? { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" };
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {tag}
    </span>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border flex-1 min-w-[110px]"
      style={{ background: `${color}08`, borderColor: `${color}22` }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums leading-tight" style={{ color }}>{value}</div>
        <div className="text-[10px] text-slate-400 leading-tight">{label}</div>
      </div>
    </div>
  );
}

// ── Card view ─────────────────────────────────────────────────────────────────

function ContactCard({ c, onStar }) {
  const sc = STATUS_CFG[c.status];
  const dc = DEPT_COLOR[c.dept] ?? "#6366f1";
  const av = avatarColor(c.name);
  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl border border-slate-700/40 hover:border-indigo-500/30 transition-all group relative"
      style={{ background: "var(--bg-card)" }}
    >
      {/* Star */}
      <button
        onClick={() => onStar(c.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: c.starred ? "#facc15" : "#475569" }}
      >
        {c.starred ? <Star size={13} fill="#facc15" /> : <StarOff size={13} />}
      </button>

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: `${av}25`, color: av }}
        >
          {initials(c.name)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: "var(--text-main)" }}>
            {c.name}
          </div>
          <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
            {c.title} · {c.company}
          </div>
        </div>
      </div>

      {/* Status + dept */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: sc.bg, color: sc.color }}
        >
          {sc.label}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: `${dc}18`, color: dc }}
        >
          {c.dept}
        </span>
      </div>

      {/* Tags */}
      {c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.tags.map(t => <TagBadge key={t} tag={t} />)}
        </div>
      )}

      {/* Contact info */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <Phone size={10} className="shrink-0" />
          <span className="font-mono">{c.phone}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
          <Mail size={10} className="shrink-0" />
          <span className="truncate">{c.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <Globe size={10} className="shrink-0" />
          <span>{c.timezone}</span>
          <span className="mx-0.5">·</span>
          <Clock size={10} className="shrink-0" />
          <span>Last: {c.lastCall}</span>
        </div>
      </div>

      {/* Call stats */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1 text-[11px]" style={{ color: "#818cf8" }}>
          <PhoneCall size={10} />
          <span className="font-semibold tabular-nums">{c.calls}</span>
          <span className="text-slate-500">total</span>
        </div>
        {c.missed > 0 && (
          <div className="flex items-center gap-1 text-[11px]" style={{ color: "#f87171" }}>
            <PhoneMissed size={10} />
            <span className="font-semibold tabular-nums">{c.missed}</span>
            <span className="text-slate-500">missed</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-105"
          style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.3)" }}
        >
          <PhoneCall size={10} /> Call
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:scale-105"
          style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid #334155" }}
        >
          <Mail size={10} /> Email
        </button>
        <button
          className="px-2 py-1.5 rounded-lg text-[10px] transition-all hover:bg-slate-700/50"
          style={{ background: "rgba(148,163,184,0.06)", color: "#475569", border: "1px solid #334155" }}
        >
          <MoreHorizontal size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState(CONTACTS_RAW);
  const [search,   setSearch]   = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid | table
  const [deptFilter, setDeptFilter] = useState("All");
  const [tagFilter,  setTagFilter]  = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey,  setSortKey]  = useState("name");
  const [sortDir,  setSortDir]  = useState("asc");
  const [page,     setPage]     = useState(1);
  const [showStarred, setShowStarred] = useState(false);
  const PER_PAGE = viewMode === "grid" ? 12 : 10;

  const depts = useMemo(() => ["All", ...Array.from(new Set(CONTACTS_RAW.map(c => c.dept))).sort()], []);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  function toggleStar(id) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, starred: !c.starred } : c));
  }

  const filtered = useMemo(() => {
    let data = contacts;
    if (showStarred)         data = data.filter(c => c.starred);
    if (deptFilter !== "All") data = data.filter(c => c.dept === deptFilter);
    if (tagFilter !== "All")  data = data.filter(c => c.tags.includes(tagFilter));
    if (statusFilter !== "all") data = data.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.title.toLowerCase().includes(q)
      );
    }
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [contacts, search, deptFilter, tagFilter, statusFilter, sortKey, sortDir, showStarred]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = useMemo(() => ({
    total:   contacts.length,
    starred: contacts.filter(c => c.starred).length,
    hot:     contacts.filter(c => c.status === "hot").length,
    atRisk:  contacts.filter(c => c.status === "at-risk").length,
    totalCalls: contacts.reduce((s, c) => s + c.calls, 0),
  }), [contacts]);

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.15)" }}
          >
            <BookUser size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Contacts</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {contacts.length} contacts · {stats.starred} starred
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 hover:border-slate-500 transition-colors"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}
          >
            <Download size={13} /> Export
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <UserPlus size={13} /> Add Contact
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="flex items-stretch gap-3 flex-wrap">
        <StatCard label="Total Contacts" value={stats.total}      color="#6366f1" icon={BookUser}   />
        <StatCard label="Starred"        value={stats.starred}    color="#facc15" icon={Star}        />
        <StatCard label="Hot Leads"      value={stats.hot}        color="#f97316" icon={Briefcase}   />
        <StatCard label="At Risk"        value={stats.atRisk}     color="#ef4444" icon={AlertCircle} />
        <StatCard label="Total Calls"    value={stats.totalCalls} color="#22c55e" icon={PhoneCall}   />
      </div>

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
            placeholder="Search name, company, email…"
            className="bg-transparent text-xs text-slate-300 placeholder:text-slate-500 outline-none w-full"
          />
        </div>

        {/* Dept filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter size={13} className="text-slate-500 mr-0.5 shrink-0" />
          {depts.map(d => (
            <button
              key={d}
              onClick={() => { setDeptFilter(d); setPage(1); }}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                background: deptFilter === d ? (DEPT_COLOR[d] ?? "var(--accent)") : "rgba(99,102,241,0.06)",
                color:      deptFilter === d ? "white" : "var(--text-muted)",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {[
            { val: "all",     label: "All Status" },
            { val: "active",  label: "Active"     },
            { val: "hot",     label: "Hot"         },
            { val: "at-risk", label: "At Risk"     },
          ].map(s => (
            <button
              key={s.val}
              onClick={() => { setStatusFilter(s.val); setPage(1); }}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                background: statusFilter === s.val ? "var(--accent)" : "rgba(99,102,241,0.06)",
                color:      statusFilter === s.val ? "white" : "var(--text-muted)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Starred toggle */}
        <button
          onClick={() => { setShowStarred(v => !v); setPage(1); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
          style={{
            background: showStarred ? "rgba(250,204,21,0.15)" : "rgba(250,204,21,0.05)",
            color:      showStarred ? "#facc15" : "#64748b",
            border:     `1px solid ${showStarred ? "rgba(250,204,21,0.3)" : "#334155"}`,
          }}
        >
          <Star size={10} fill={showStarred ? "#facc15" : "none"} />
          Starred
        </button>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #334155" }}>
          <button
            onClick={() => { setViewMode("grid"); setPage(1); }}
            className="p-1.5 rounded-md transition-colors"
            style={{ background: viewMode === "grid" ? "var(--accent)" : "transparent", color: viewMode === "grid" ? "white" : "#64748b" }}
          >
            <LayoutGrid size={13} />
          </button>
          <button
            onClick={() => { setViewMode("table"); setPage(1); }}
            className="p-1.5 rounded-md transition-colors"
            style={{ background: viewMode === "table" ? "var(--accent)" : "transparent", color: viewMode === "table" ? "white" : "#64748b" }}
          >
            <List size={13} />
          </button>
        </div>

        <span className="text-xs text-slate-500 tabular-nums">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Tag quick-filter row ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Tag size={12} className="text-slate-500 shrink-0" />
        {ALL_TAGS.map(t => (
          <button
            key={t}
            onClick={() => { setTagFilter(t); setPage(1); }}
            className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
            style={
              tagFilter === t
                ? { background: "var(--accent)", color: "white" }
                : t === "All"
                ? { background: "rgba(148,163,184,0.08)", color: "#64748b" }
                : { background: (TAG_COLOR[t]?.bg ?? "rgba(148,163,184,0.08)"), color: (TAG_COLOR[t]?.color ?? "#94a3b8") }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Grid view ── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pageData.length === 0 ? (
            <div className="col-span-full flex flex-col items-center gap-2 py-16">
              <User size={30} className="text-slate-600" />
              <span className="text-slate-500 text-sm">No contacts match your filters</span>
            </div>
          ) : pageData.map(c => (
            <ContactCard key={c.id} c={c} onStar={toggleStar} />
          ))}
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === "table" && (
        <div
          className="rounded-xl border border-slate-700/40 overflow-hidden"
          style={{ background: "var(--bg-card)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: "rgba(15,23,42,0.7)", borderBottom: "1px solid #1e293b" }}>
                  {COLS.map(col => (
                    <th
                      key={col.key}
                      className="text-left px-4 py-3 font-semibold whitespace-nowrap select-none"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {col.sort ? (
                        <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                          {col.label} <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="px-4 py-12 text-center text-slate-500">
                      No contacts match your filters
                    </td>
                  </tr>
                ) : pageData.map((c, i) => {
                  const sc = STATUS_CFG[c.status];
                  const dc = DEPT_COLOR[c.dept] ?? "#6366f1";
                  const av = avatarColor(c.name);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-700/20 transition-colors"
                      style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}
                    >
                      {/* Name */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: `${av}25`, color: av }}
                          >
                            {initials(c.name)}
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-1" style={{ color: "var(--text-main)" }}>
                              {c.name}
                              {c.starred && <Star size={9} fill="#facc15" style={{ color: "#facc15" }} />}
                            </div>
                            <div className="text-[10px] text-slate-500">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      {/* Company */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                          <Building2 size={10} className="shrink-0" />
                          {c.company}
                        </div>
                      </td>
                      {/* Dept */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${dc}18`, color: dc }}>
                          {c.dept}
                        </span>
                      </td>
                      {/* Title */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">{c.title}</td>
                      {/* Phone */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono" style={{ color: "var(--text-muted)" }}>{c.phone}</td>
                      {/* Calls */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-semibold tabular-nums" style={{ color: "#818cf8" }}>
                          <PhoneCall size={10} /> {c.calls}
                        </span>
                      </td>
                      {/* Missed */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="flex items-center gap-1 font-semibold tabular-nums"
                          style={{ color: c.missed > 0 ? "#f87171" : "#475569" }}
                        >
                          <PhoneMissed size={10} /> {c.missed}
                        </span>
                      </td>
                      {/* Last call */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                          <Clock size={10} /> {c.lastCall}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-105"
                            style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.25)" }}
                          >
                            <PhoneCall size={9} /> Call
                          </button>
                          <button
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-105"
                            style={{ background: "rgba(148,163,184,0.08)", color: "#94a3b8", border: "1px solid #334155" }}
                          >
                            <Mail size={9} /> Email
                          </button>
                          <button
                            onClick={() => toggleStar(c.id)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-slate-700/50"
                            style={{ color: c.starred ? "#facc15" : "#475569" }}
                          >
                            <Star size={10} fill={c.starred ? "#facc15" : "none"} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3 border-t border-slate-800"
              style={{ background: "rgba(15,23,42,0.4)" }}
            >
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages} · {filtered.length} contacts
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
                        background:  page === n ? "var(--accent)" : "transparent",
                        color:       page === n ? "white" : "var(--text-muted)",
                        borderColor: page === n ? "var(--accent)" : "#334155",
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
      )}

      {/* Grid pagination */}
      {viewMode === "grid" && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }).map((_, idx) => {
            const n = idx + 1;
            return (
              <button
                key={n}
                onClick={() => setPage(n)}
                className="w-7 h-7 rounded text-xs border transition-colors"
                style={{
                  background:  page === n ? "var(--accent)" : "transparent",
                  color:       page === n ? "white" : "var(--text-muted)",
                  borderColor: page === n ? "var(--accent)" : "#334155",
                }}
              >
                {n}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded text-xs border border-slate-700 disabled:opacity-30 hover:bg-slate-700/40 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}
