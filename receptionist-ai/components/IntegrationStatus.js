"use client";

import { CheckCircle2, Loader2, Link2, TicketIcon, Building2, Tag } from "lucide-react";

/**
 * IntegrationStatus — shows CRM sync, ticket creation, and routing
 * from the "integration" stage of the orchestrator pipeline.
 */
export default function IntegrationStatus({ integrationStage }) {
  if (!integrationStage) {
    return (
      <div
        className="rounded-xl border border-slate-700/40 p-5 flex flex-col items-center justify-center gap-2 min-h-40"
        style={{ background: "var(--bg-card)" }}
      >
        <Link2 size={28} className="text-slate-600" />
        <p className="text-sm text-slate-500">Integration results will appear here</p>
      </div>
    );
  }

  const {
    ticketId,
    callId,
    department,
    priority,
    crmEntry,
    actions = [],
    timestamp,
  } = integrationStage;

  const priorityColors = {
    urgent: { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
    high:   { bg: "rgba(250,204,21,0.12)", color: "#facc15" },
    medium: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
    low:    { bg: "rgba(71,85,105,0.12)",  color: "#64748b" },
  };
  const pc = priorityColors[priority] ?? priorityColors.medium;

  return (
    <div
      className="rounded-xl border border-slate-700/40 overflow-hidden"
      style={{ background: "var(--bg-card)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <Link2 size={16} style={{ color: "#34d399" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Integration
          </h3>
        </div>
        <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
          <CheckCircle2 size={12} /> Synced
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Ticket + Call row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-500">
              <TicketIcon size={12} /> Ticket ID
            </div>
            <p className="text-sm font-mono font-semibold" style={{ color: "var(--accent)" }}>
              {ticketId}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-1.5 mb-1 text-xs text-slate-500">
              <Building2 size={12} /> Routed to
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {department}
            </p>
          </div>
        </div>

        {/* Priority + Sentiment */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
            style={{ background: pc.bg, color: pc.color }}
          >
            {priority} priority
          </span>
          {crmEntry?.sentiment && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
              style={{
                background:
                  crmEntry.sentiment === "positive" ? "rgba(34,197,94,0.1)"  :
                  crmEntry.sentiment === "negative" ? "rgba(239,68,68,0.1)"  :
                                                      "rgba(71,85,105,0.1)",
                color:
                  crmEntry.sentiment === "positive" ? "#22c55e" :
                  crmEntry.sentiment === "negative" ? "#ef4444" :
                                                      "#64748b",
              }}
            >
              {crmEntry.sentiment}
            </span>
          )}
          {crmEntry?.intent && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Tag size={10} /> {crmEntry.intent}
            </span>
          )}
        </div>

        {/* CRM Summary */}
        {crmEntry?.summary && (
          <div className="px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/40">
            <p className="text-xs text-slate-500 mb-1 font-medium">CRM Note</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {crmEntry.summary}
            </p>
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Follow-up Actions</p>
            <ul className="space-y-1">
              {actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <CheckCircle2 size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <p className="text-xs text-slate-600 pt-1 border-t border-slate-800">
            Synced at {new Date(timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
