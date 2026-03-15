"use client";

import { useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Phone, PhoneMissed,
  PhoneCall, Clock, Bot, Star, Users, Building2,
  ThumbsUp, ThumbsDown, Minus, Zap, AlertTriangle,
  Calendar, Filter, Download, ChevronUp, ChevronDown,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const DAILY = [
  { day: "Mon 09", calls: 38, missed: 5,  resolved: 31, transferred: 2, aiHandled: 33, avgDur: 112, sentiment: { pos: 22, neu: 12, neg: 4 } },
  { day: "Tue 10", calls: 45, missed: 3,  resolved: 39, transferred: 3, aiHandled: 41, avgDur: 98,  sentiment: { pos: 30, neu: 11, neg: 4 } },
  { day: "Wed 11", calls: 52, missed: 7,  resolved: 42, transferred: 3, aiHandled: 46, avgDur: 124, sentiment: { pos: 29, neu: 16, neg: 7 } },
  { day: "Thu 12", calls: 41, missed: 4,  resolved: 35, transferred: 2, aiHandled: 37, avgDur: 103, sentiment: { pos: 25, neu: 13, neg: 3 } },
  { day: "Fri 13", calls: 60, missed: 9,  resolved: 48, transferred: 3, aiHandled: 54, avgDur: 135, sentiment: { pos: 34, neu: 18, neg: 8 } },
  { day: "Sat 14", calls: 28, missed: 6,  resolved: 20, transferred: 2, aiHandled: 22, avgDur: 89,  sentiment: { pos: 14, neu: 10, neg: 4 } },
  { day: "Sun 15", calls: 22, missed: 3,  resolved: 18, transferred: 1, aiHandled: 20, avgDur: 76,  sentiment: { pos: 13, neu: 7,  neg: 2 } },
];

const DEPT_STATS = [
  { dept: "Sales",      calls: 78,  resolved: 68, missed: 4,  avgConf: 93, color: "#6366f1" },
  { dept: "Support",    calls: 95,  resolved: 80, missed: 8,  avgConf: 89, color: "#22c55e" },
  { dept: "Billing",    calls: 61,  resolved: 49, missed: 7,  avgConf: 87, color: "#ef4444" },
  { dept: "Onboarding", calls: 42,  resolved: 38, missed: 2,  avgConf: 91, color: "#06b6d4" },
  { dept: "HR",         calls: 24,  resolved: 22, missed: 1,  avgConf: 86, color: "#a78bfa" },
  { dept: "Management", calls: 16,  resolved: 15, missed: 0,  avgConf: 95, color: "#f97316" },
];

const HOURLY = [
  { h: "08", v: 4 }, { h: "09", v: 12 }, { h: "10", v: 19 }, { h: "11", v: 22 },
  { h: "12", v: 15 }, { h: "13", v: 11 }, { h: "14", v: 26 }, { h: "15", v: 24 },
  { h: "16", v: 18 }, { h: "17", v: 10 }, { h: "18", v: 5 },  { h: "19", v: 2 },
];

const TOP_INTENTS = [
  { intent: "Technical Support",  count: 58, pct: 82, color: "#22c55e" },
  { intent: "Pricing Inquiry",    count: 47, pct: 67, color: "#6366f1" },
  { intent: "Billing Dispute",    count: 39, pct: 55, color: "#ef4444" },
  { intent: "Demo Request",       count: 31, pct: 44, color: "#f97316" },
  { intent: "Onboarding Help",    count: 28, pct: 40, color: "#06b6d4" },
  { intent: "Contract Renewal",   count: 19, pct: 27, color: "#a78bfa" },
  { intent: "Invoice Query",      count: 14, pct: 20, color: "#facc15" },
];

const AI_PERF = [
  { metric: "Intent Detection",   score: 94, prev: 91, unit: "%" },
  { metric: "Avg Confidence",     score: 91, prev: 88, unit: "%" },
  { metric: "Resolution Rate",    score: 78, prev: 74, unit: "%" },
  { metric: "Escalation Rate",    score: 12, prev: 16, unit: "%", invert: true },
  { metric: "Avg Handle Time",    score: 102, prev: 114, unit: "s", invert: true },
  { metric: "CSAT Score",         score: 4.6, prev: 4.3, unit: "/5" },
];

// Totals
const TOTALS = DAILY.reduce((acc, d) => ({
  calls:       acc.calls + d.calls,
  missed:      acc.missed + d.missed,
  resolved:    acc.resolved + d.resolved,
  transferred: acc.transferred + d.transferred,
  aiHandled:   acc.aiHandled + d.aiHandled,
  pos: acc.pos + d.sentiment.pos,
  neg: acc.neg + d.sentiment.neg,
  neu: acc.neu + d.sentiment.neu,
}), { calls: 0, missed: 0, resolved: 0, transferred: 0, aiHandled: 0, pos: 0, neg: 0, neu: 0 });

const MAX_HOURLY = Math.max(...HOURLY.map(h => h.v));
const MAX_DAILY  = Math.max(...DAILY.map(d => d.calls));

// ── Helpers ───────────────────────────────────────────────────────────────────

function delta(cur, prev) {
  const d = ((cur - prev) / prev * 100).toFixed(1);
  return { d, up: cur >= prev };
}

function StatCard({ label, value, sub, color, icon: Icon, trend, trendLabel }) {
  const up = trend >= 0;
  return (
    <div
      className="flex flex-col gap-2 p-4 rounded-xl border flex-1 min-w-[130px]"
      style={{ background: `${color}07`, borderColor: `${color}20` }}
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: up ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: up ? "#4ade80" : "#f87171" }}
          >
            {up ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums leading-tight" style={{ color }}>{value}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
        {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Bar chart (CSS) ───────────────────────────────────────────────────────────

function BarChart({ data, maxVal, keyFn, labelFn, colorFn, height = 120, showValues = true }) {
  return (
    <div className="flex items-end gap-1 w-full" style={{ height }}>
      {data.map((d, i) => {
        const pct = maxVal > 0 ? (keyFn(d) / maxVal) * 100 : 0;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {showValues && (
              <span className="text-[9px] tabular-nums" style={{ color: "#475569" }}>{keyFn(d)}</span>
            )}
            <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(pct, 2)}%`, background: colorFn(d, i) }} />
            <span className="text-[9px] truncate w-full text-center" style={{ color: "#475569" }}>{labelFn(d)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stacked sentiment bar ─────────────────────────────────────────────────────

function SentimentBar({ pos, neu, neg }) {
  const total = pos + neu + neg || 1;
  return (
    <div className="flex rounded-full overflow-hidden h-2 w-full">
      <div style={{ width: `${pos/total*100}%`, background: "#22c55e" }} />
      <div style={{ width: `${neu/total*100}%`, background: "#475569" }} />
      <div style={{ width: `${neg/total*100}%`, background: "#ef4444" }} />
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconColor = "var(--accent)", children, action }) {
  return (
    <div className="rounded-xl border border-slate-700/40 overflow-hidden" style={{ background: "var(--bg-card)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: iconColor }} />
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{title}</span>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState("7d");

  const aiRate  = Math.round(TOTALS.aiHandled / TOTALS.calls * 100);
  const missRate = Math.round(TOTALS.missed / TOTALS.calls * 100);
  const resRate  = Math.round(TOTALS.resolved / TOTALS.calls * 100);

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
            <BarChart3 size={18} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Analytics</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Performance overview — last 7 days</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex items-center p-0.5 rounded-lg gap-0.5" style={{ background: "var(--bg-card)", border: "1px solid #334155" }}>
            {["7d","14d","30d"].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-2.5 py-1 rounded text-[10px] font-semibold transition-colors"
                style={{ background: range === r ? "var(--accent)" : "transparent", color: range === r ? "white" : "#64748b" }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 hover:border-slate-500 transition-colors"
            style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="Total Calls"     value={TOTALS.calls}                  color="#6366f1" icon={Phone}       trend={8.3}  trendLabel="vs prev week" />
        <StatCard label="AI Handled"      value={`${aiRate}%`}                  color="#22c55e" icon={Bot}         trend={4.1}  />
        <StatCard label="Resolved"        value={`${resRate}%`}                 color="#06b6d4" icon={PhoneCall}   trend={5.2}  />
        <StatCard label="Missed Rate"     value={`${missRate}%`}                color="#ef4444" icon={PhoneMissed} trend={-1.8} />
        <StatCard label="Avg Duration"    value="1m 42s"                        color="#a78bfa" icon={Clock}       trend={-10.5}/>
        <StatCard label="CSAT Score"      value="4.6/5"                         color="#facc15" icon={Star}        trend={7.0}  />
      </div>

      {/* ── Row 1: Daily bar + Hourly heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily call volume */}
        <Section title="Daily Call Volume" icon={BarChart3}>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {[
              { label: "Total",       color: "#6366f1" },
              { label: "Resolved",    color: "#22c55e" },
              { label: "Missed",      color: "#ef4444" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: "#64748b" }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {DAILY.map(d => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-[10px] w-12 shrink-0 text-right" style={{ color: "#475569" }}>{d.day}</span>
                <div className="flex-1 flex gap-1 h-5 items-center">
                  <div className="flex-1 bg-slate-800/60 rounded overflow-hidden h-full flex gap-0.5">
                    <div className="h-full rounded-l" style={{ width: `${d.calls/MAX_DAILY*100}%`, background: "#6366f1", minWidth: 4 }} />
                  </div>
                </div>
                <div className="flex gap-2 text-[10px] shrink-0 tabular-nums">
                  <span style={{ color: "#818cf8" }}>{d.calls}</span>
                  <span style={{ color: "#4ade80" }}>{d.resolved}</span>
                  <span style={{ color: "#f87171" }}>{d.missed}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Hourly distribution */}
        <Section title="Call Volume by Hour (Today)" icon={Clock} iconColor="#06b6d4">
          <BarChart
            data={HOURLY}
            maxVal={MAX_HOURLY}
            keyFn={d => d.v}
            labelFn={d => `${d.h}h`}
            colorFn={(d) => {
              const ratio = d.v / MAX_HOURLY;
              return ratio > 0.75 ? "#6366f1" : ratio > 0.4 ? "#818cf8" : "#1e293b";
            }}
            height={140}
          />
          <div className="flex items-center justify-between mt-3 text-[10px]" style={{ color: "#475569" }}>
            <span>Peak: 14:00–15:00 (26 calls)</span>
            <span>Avg: {Math.round(HOURLY.reduce((s,h)=>s+h.v,0)/HOURLY.length)} calls/hr</span>
          </div>
        </Section>
      </div>

      {/* ── Row 2: Sentiment + Dept breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sentiment trend */}
        <Section title="Sentiment Analysis" icon={ThumbsUp} iconColor="#22c55e">
          <div className="flex items-center justify-around mb-4">
            {[
              { label: "Positive", val: TOTALS.pos, color: "#22c55e", icon: ThumbsUp },
              { label: "Neutral",  val: TOTALS.neu, color: "#94a3b8", icon: Minus },
              { label: "Negative", val: TOTALS.neg, color: "#ef4444", icon: ThumbsDown },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${s.color}15` }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <span className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.val}</span>
                <span className="text-[10px]" style={{ color: "#475569" }}>{s.label}</span>
                <span className="text-[10px]" style={{ color: "#334155" }}>
                  {Math.round(s.val/TOTALS.calls*100)}%
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            {DAILY.map(d => (
              <div key={d.day} className="flex items-center gap-2">
                <span className="text-[10px] w-12 shrink-0 text-right" style={{ color: "#475569" }}>{d.day}</span>
                <SentimentBar pos={d.sentiment.pos} neu={d.sentiment.neu} neg={d.sentiment.neg} />
                <span className="text-[10px] w-8 text-right tabular-nums" style={{ color: "#4ade80" }}>
                  {Math.round(d.sentiment.pos/d.calls*100)}%
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3">
            {[["#22c55e","Positive"],["#475569","Neutral"],["#ef4444","Negative"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1 text-[10px]" style={{ color: "#64748b" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}
              </div>
            ))}
          </div>
        </Section>

        {/* Dept breakdown */}
        <Section title="Department Breakdown" icon={Building2} iconColor="#f97316">
          <div className="space-y-3">
            {DEPT_STATS.map(d => (
              <div key={d.dept} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium" style={{ color: "var(--text-main)" }}>{d.dept}</span>
                  <div className="flex items-center gap-3 tabular-nums" style={{ color: "#64748b" }}>
                    <span>{d.calls} calls</span>
                    <span style={{ color: d.color }}>{Math.round(d.resolved/d.calls*100)}% res.</span>
                    <span style={{ color: "#818cf8" }}>{d.avgConf}% conf.</span>
                  </div>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
                  <div style={{ width: `${d.resolved/d.calls*100}%`, background: d.color }} />
                  <div style={{ width: `${d.missed/d.calls*100}%`,   background: "#ef444466" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3">
            {[["var(--accent)","Resolved"],["#ef444466","Missed"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1 text-[10px]" style={{ color: "#64748b" }}>
                <span className="w-2.5 h-2 rounded-sm" style={{ background: c }} />{l}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Row 3: Top Intents + AI Performance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top intents */}
        <Section title="Top Call Intents" icon={Filter} iconColor="#06b6d4">
          <div className="space-y-2.5">
            {TOP_INTENTS.map((item, i) => (
              <div key={item.intent} className="flex items-center gap-3">
                <span className="text-[10px] w-4 tabular-nums" style={{ color: "#475569" }}>{i+1}</span>
                <span className="text-[11px] flex-1 truncate" style={{ color: "var(--text-main)" }}>{item.intent}</span>
                <div className="w-32 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
                <span className="tabular-nums text-[10px] w-8 text-right font-semibold" style={{ color: item.color }}>{item.count}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* AI performance metrics */}
        <Section title="AI Performance Metrics" icon={Bot} iconColor="#6366f1">
          <div className="grid grid-cols-2 gap-3">
            {AI_PERF.map(m => {
              const improved = m.invert ? m.score < m.prev : m.score > m.prev;
              const pctDiff  = Math.abs(((m.score - m.prev) / m.prev) * 100).toFixed(1);
              return (
                <div
                  key={m.metric}
                  className="flex flex-col gap-1 p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b" }}
                >
                  <div className="text-[10px]" style={{ color: "#475569" }}>{m.metric}</div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-xl font-bold tabular-nums" style={{ color: improved ? "#4ade80" : "#f87171" }}>
                      {m.score}{m.unit}
                    </span>
                    <span
                      className="flex items-center gap-0.5 text-[9px] font-semibold mb-0.5"
                      style={{ color: improved ? "#4ade80" : "#f87171" }}
                    >
                      {improved ? <ArrowUpRight size={9}/> : <ArrowDownRight size={9}/>}
                      {pctDiff}%
                    </span>
                  </div>
                  <div className="text-[9px]" style={{ color: "#334155" }}>prev: {m.prev}{m.unit}</div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* ── Row 4: Weekly summary table ── */}
      <Section title="Daily Summary Table" icon={Calendar}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b" }}>
                {["Day","Calls","Resolved","Missed","Transferred","AI Handled","Avg Duration","Satisfaction"].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {DAILY.map((d, i) => {
                const sat = Math.round(d.sentiment.pos / d.calls * 100);
                return (
                  <tr key={d.day} className="hover:bg-slate-700/15 transition-colors"
                    style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}>
                    <td className="py-2 px-3 font-medium" style={{ color: "var(--text-main)" }}>{d.day}</td>
                    <td className="py-2 px-3 tabular-nums font-semibold" style={{ color: "#818cf8" }}>{d.calls}</td>
                    <td className="py-2 px-3 tabular-nums" style={{ color: "#4ade80" }}>{d.resolved}</td>
                    <td className="py-2 px-3 tabular-nums" style={{ color: "#f87171" }}>{d.missed}</td>
                    <td className="py-2 px-3 tabular-nums" style={{ color: "#94a3b8" }}>{d.transferred}</td>
                    <td className="py-2 px-3 tabular-nums" style={{ color: "#06b6d4" }}>{d.aiHandled}</td>
                    <td className="py-2 px-3 tabular-nums" style={{ color: "var(--text-muted)" }}>{Math.floor(d.avgDur/60)}m {d.avgDur%60}s</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${sat}%`, background: sat > 70 ? "#22c55e" : sat > 50 ? "#f97316" : "#ef4444" }} />
                        </div>
                        <span className="tabular-nums text-[10px]" style={{ color: sat > 70 ? "#4ade80" : sat > 50 ? "#fdba74" : "#f87171" }}>{sat}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid #1e293b", background: "rgba(99,102,241,0.04)" }}>
                <td className="py-2 px-3 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>TOTAL / AVG</td>
                <td className="py-2 px-3 font-bold tabular-nums" style={{ color: "#818cf8" }}>{TOTALS.calls}</td>
                <td className="py-2 px-3 font-bold tabular-nums" style={{ color: "#4ade80" }}>{TOTALS.resolved}</td>
                <td className="py-2 px-3 font-bold tabular-nums" style={{ color: "#f87171" }}>{TOTALS.missed}</td>
                <td className="py-2 px-3 font-bold tabular-nums" style={{ color: "#94a3b8" }}>{TOTALS.transferred}</td>
                <td className="py-2 px-3 font-bold tabular-nums" style={{ color: "#06b6d4" }}>{TOTALS.aiHandled}</td>
                <td className="py-2 px-3 tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {Math.floor(DAILY.reduce((s,d)=>s+d.avgDur,0)/DAILY.length/60)}m {Math.round(DAILY.reduce((s,d)=>s+d.avgDur,0)/DAILY.length%60)}s
                </td>
                <td className="py-2 px-3 tabular-nums text-[10px] font-bold" style={{ color: "#4ade80" }}>
                  {Math.round(TOTALS.pos/TOTALS.calls*100)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>
    </main>
  );
}
