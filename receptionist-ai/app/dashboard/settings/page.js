"use client";

import { useState } from "react";
import {
  Settings, Bot, Phone, Bell, Shield, Palette, Plug,
  Save, RotateCcw, ChevronRight, Check, AlertTriangle,
  Eye, EyeOff, Globe, Clock, Volume2, Mic, Zap,
  Key, Database, Webhook, Mail, Sliders, ToggleLeft,
  ToggleRight, User, Building2, Lock, Trash2,
} from "lucide-react";

// ── Section nav ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "general",        label: "General",          icon: Settings  },
  { id: "ai",             label: "AI & Models",       icon: Bot       },
  { id: "telephony",      label: "Telephony",         icon: Phone     },
  { id: "notifications",  label: "Notifications",     icon: Bell      },
  { id: "integrations",   label: "Integrations",      icon: Plug      },
  { id: "security",       label: "Security",          icon: Shield    },
  { id: "appearance",     label: "Appearance",        icon: Palette   },
];

// ── UI primitives ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-9 h-5 rounded-full transition-colors shrink-0"
      style={{ background: value ? "var(--accent)" : "#334155" }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow"
        style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SettingRow({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-800/50 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--text-main)" }}>{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingGroup({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700/40 overflow-hidden" style={{ background: "var(--bg-card)" }}>
      <div className="px-4 py-3 border-b border-slate-800/60">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{title}</span>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", mono = false }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-60 px-3 py-1.5 rounded-lg text-xs border outline-none transition-colors focus:border-indigo-500/60"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: "#334155",
        color: "var(--text-main)",
        fontFamily: mono ? "monospace" : undefined,
      }}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg text-xs border outline-none transition-colors focus:border-indigo-500/60"
      style={{ background: "#0f172a", borderColor: "#334155", color: "var(--text-main)", minWidth: 160 }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function SecretInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-56 px-3 py-1.5 rounded-l-lg text-xs border-y border-l outline-none transition-colors focus:border-indigo-500/60"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "#334155", color: "var(--text-main)", fontFamily: "monospace" }}
      />
      <button
        onClick={() => setShow(v => !v)}
        className="px-2 py-1.5 rounded-r-lg border text-xs transition-colors hover:bg-slate-700/50"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "#334155", color: "#475569" }}
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

function StatusBadge({ ok, label }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: ok ? "#4ade80" : "#f87171" }}
    >
      {ok ? <Check size={9} /> : <AlertTriangle size={9} />}
      {label}
    </span>
  );
}

// ── Section panels ────────────────────────────────────────────────────────────

function GeneralSettings({ s, set }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Business Identity">
        <SettingRow label="Business Name" sub="Displayed in calls and reports">
          <TextInput value={s.bizName} onChange={v => set("bizName", v)} placeholder="My Business" />
        </SettingRow>
        <SettingRow label="Timezone" sub="Used for scheduling and timestamps">
          <SelectInput
            value={s.timezone}
            onChange={v => set("timezone", v)}
            options={[
              { value: "EST", label: "EST — Eastern" },
              { value: "CST", label: "CST — Central" },
              { value: "MST", label: "MST — Mountain" },
              { value: "PST", label: "PST — Pacific" },
              { value: "GMT", label: "GMT — London" },
              { value: "CET", label: "CET — Europe" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Language" sub="Primary language for AI responses">
          <SelectInput
            value={s.language}
            onChange={v => set("language", v)}
            options={[
              { value: "en-US", label: "English (US)" },
              { value: "en-GB", label: "English (UK)" },
              { value: "es",    label: "Spanish" },
              { value: "fr",    label: "French" },
              { value: "de",    label: "German" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Business Hours" sub="Outside these hours calls go to voicemail">
          <div className="flex items-center gap-2 text-xs">
            <TextInput value={s.hoursFrom} onChange={v => set("hoursFrom", v)} placeholder="09:00" />
            <span style={{ color: "#475569" }}>to</span>
            <TextInput value={s.hoursTo} onChange={v => set("hoursTo", v)} placeholder="18:00" />
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Dashboard Behaviour">
        <SettingRow label="Auto-refresh interval" sub="How often live data polls">
          <SelectInput
            value={s.refreshInterval}
            onChange={v => set("refreshInterval", v)}
            options={[
              { value: "5",  label: "Every 5 seconds"  },
              { value: "10", label: "Every 10 seconds" },
              { value: "30", label: "Every 30 seconds" },
              { value: "60", label: "Every minute"     },
            ]}
          />
        </SettingRow>
        <SettingRow label="Start page" sub="Default page on login">
          <SelectInput
            value={s.startPage}
            onChange={v => set("startPage", v)}
            options={[
              { value: "/dashboard",            label: "Dashboard"     },
              { value: "/dashboard/live",        label: "Live Calls"    },
              { value: "/dashboard/analytics",   label: "Analytics"     },
              { value: "/dashboard/missed",      label: "Missed Calls"  },
            ]}
          />
        </SettingRow>
        <SettingRow label="Compact mode" sub="Reduce padding for denser layouts">
          <Toggle value={s.compact} onChange={v => set("compact", v)} />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}

function AISettings({ s, set }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Reasoning Model (DeepAI)">
        <SettingRow label="API Key" sub="Used for intent & sentiment analysis">
          <div className="flex items-center gap-2">
            <SecretInput value={s.deepaiKey} onChange={v => set("deepaiKey", v)} placeholder="your DeepAI API key" />
            <StatusBadge ok={s.deepaiKey.length > 10} label={s.deepaiKey.length > 10 ? "Connected" : "Not set"} />
          </div>
        </SettingRow>
        <SettingRow label="Model" sub="DeepAI text-generation endpoint">
          <SelectInput
            value={s.deepaiModel}
            onChange={v => set("deepaiModel", v)}
            options={[
              { value: "text-generator",          label: "text-generator (default)" },
              { value: "summarization",            label: "summarization"            },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Implementation Model (DeepSeek)">
        <SettingRow label="API Key" sub="Used for response generation">
          <div className="flex items-center gap-2">
            <SecretInput value={s.deepseekKey} onChange={v => set("deepseekKey", v)} placeholder="your DeepSeek API key" />
            <StatusBadge ok={s.deepseekKey.length > 10} label={s.deepseekKey.length > 10 ? "Connected" : "Not set"} />
          </div>
        </SettingRow>
        <SettingRow label="Model" sub="DeepSeek chat model">
          <SelectInput
            value={s.deepseekModel}
            onChange={v => set("deepseekModel", v)}
            options={[
              { value: "deepseek-reasoner", label: "deepseek-reasoner (default)" },
              { value: "deepseek-chat",     label: "deepseek-chat"               },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="AI Behaviour">
        <SettingRow label="Min confidence threshold" sub="Below this, call is escalated to human">
          <SelectInput
            value={s.minConf}
            onChange={v => set("minConf", v)}
            options={[
              { value: "60", label: "60% — Permissive" },
              { value: "70", label: "70% — Balanced"   },
              { value: "80", label: "80% — Strict"     },
              { value: "90", label: "90% — Very strict" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Auto-resolve low-intent calls" sub="Hang up if intent cannot be determined">
          <Toggle value={s.autoResolve} onChange={v => set("autoResolve", v)} />
        </SettingRow>
        <SettingRow label="Record all AI reasoning" sub="Store reasoning chain in voice logs">
          <Toggle value={s.logReasoning} onChange={v => set("logReasoning", v)} />
        </SettingRow>
        <SettingRow label="Multi-language auto-detect" sub="Detect caller language before responding">
          <Toggle value={s.autoLang} onChange={v => set("autoLang", v)} />
        </SettingRow>
        <SettingRow label="Sentiment analysis" sub="Analyse caller emotion on every call">
          <Toggle value={s.sentiment} onChange={v => set("sentiment", v)} />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}

function TelephonySettings({ s, set }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Voice & Audio">
        <SettingRow label="AI Voice" sub="Text-to-speech voice for AI responses">
          <SelectInput
            value={s.voice}
            onChange={v => set("voice", v)}
            options={[
              { value: "nova",    label: "Nova (female, friendly)"  },
              { value: "alloy",   label: "Alloy (neutral)"          },
              { value: "echo",    label: "Echo (male, professional)" },
              { value: "shimmer", label: "Shimmer (female, warm)"   },
            ]}
          />
        </SettingRow>
        <SettingRow label="Speech speed" sub="Rate of AI speech output">
          <SelectInput
            value={s.speechSpeed}
            onChange={v => set("speechSpeed", v)}
            options={[
              { value: "0.85", label: "Slow (0.85×)"    },
              { value: "1.0",  label: "Normal (1.0×)"   },
              { value: "1.15", label: "Fast (1.15×)"    },
              { value: "1.3",  label: "Very fast (1.3×)" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Hold music" sub="Played while transferring or on hold">
          <SelectInput
            value={s.holdMusic}
            onChange={v => set("holdMusic", v)}
            options={[
              { value: "classic", label: "Classic Jazz"  },
              { value: "modern",  label: "Lo-fi Chill"   },
              { value: "minimal", label: "Minimal Tones" },
              { value: "none",    label: "Silence"       },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Call Handling">
        <SettingRow label="Max call duration" sub="Auto-end calls that exceed this length">
          <SelectInput
            value={s.maxDuration}
            onChange={v => set("maxDuration", v)}
            options={[
              { value: "300",  label: "5 minutes"  },
              { value: "600",  label: "10 minutes" },
              { value: "900",  label: "15 minutes" },
              { value: "1800", label: "30 minutes" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Voicemail after (rings)" sub="Redirect to voicemail after N rings">
          <SelectInput
            value={s.vmRings}
            onChange={v => set("vmRings", v)}
            options={[
              { value: "3", label: "3 rings" },
              { value: "4", label: "4 rings" },
              { value: "5", label: "5 rings" },
              { value: "6", label: "6 rings" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Record all calls" sub="Store audio for all calls (compliance)">
          <Toggle value={s.recordAll} onChange={v => set("recordAll", v)} />
        </SettingRow>
        <SettingRow label="Transcribe voicemails" sub="Auto-transcribe voicemail to text">
          <Toggle value={s.transcribeVm} onChange={v => set("transcribeVm", v)} />
        </SettingRow>
        <SettingRow label="Noise suppression" sub="Filter background noise from calls">
          <Toggle value={s.noiseSuppression} onChange={v => set("noiseSuppression", v)} />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}

function NotificationSettings({ s, set }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Alert Channels">
        <SettingRow label="Email notifications" sub="Send alerts to this address">
          <TextInput value={s.emailAlert} onChange={v => set("emailAlert", v)} placeholder="admin@company.com" type="email" />
        </SettingRow>
        <SettingRow label="Desktop notifications" sub="Browser push notifications">
          <Toggle value={s.desktopNotif} onChange={v => set("desktopNotif", v)} />
        </SettingRow>
        <SettingRow label="In-app sounds" sub="Audible alerts in the dashboard">
          <Toggle value={s.sounds} onChange={v => set("sounds", v)} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Trigger Events">
        {[
          { key: "notifMissed",    label: "Missed call",           sub: "Alert when a call is not answered" },
          { key: "notifNew",       label: "New inbound call",      sub: "Alert on every incoming call" },
          { key: "notifFlagged",   label: "AI flagged call",       sub: "Alert when AI flags a low-confidence call" },
          { key: "notifEscalated", label: "Escalation needed",     sub: "Alert when call exceeds confidence threshold" },
          { key: "notifVm",        label: "New voicemail",         sub: "Alert when voicemail is received" },
          { key: "notifHighPri",   label: "High-priority callback", sub: "Alert for pending high-priority callbacks" },
        ].map(n => (
          <SettingRow key={n.key} label={n.label} sub={n.sub}>
            <Toggle value={s[n.key]} onChange={v => set(n.key, v)} />
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="Digest Reports">
        <SettingRow label="Daily summary email" sub="End-of-day performance digest">
          <Toggle value={s.dailyDigest} onChange={v => set("dailyDigest", v)} />
        </SettingRow>
        <SettingRow label="Weekly report" sub="Monday morning weekly summary">
          <Toggle value={s.weeklyDigest} onChange={v => set("weeklyDigest", v)} />
        </SettingRow>
        <SettingRow label="Report recipient" sub="Send digests to this email">
          <TextInput value={s.digestEmail} onChange={v => set("digestEmail", v)} placeholder="manager@company.com" type="email" />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}

function IntegrationSettings({ s, set }) {
  const integrations = [
    { key: "crm",        label: "CRM System",       sub: "Sync contacts & call history", icon: Database, connected: s.crmEnabled   },
    { key: "webhook",    label: "Webhooks",          sub: "POST call events to your endpoint", icon: Webhook, connected: s.webhookEnabled },
    { key: "email",      label: "Email (SMTP)",      sub: "Send notifications via custom SMTP", icon: Mail, connected: s.smtpEnabled   },
    { key: "zapier",     label: "Zapier",            sub: "Connect 5000+ apps via Zapier", icon: Zap, connected: false              },
    { key: "slack",      label: "Slack",             sub: "Post alerts to a Slack channel", icon: Bell, connected: false             },
  ];

  return (
    <div className="space-y-4">
      <SettingGroup title="Connected Services">
        {integrations.map(intg => (
          <SettingRow key={intg.key} label={intg.label} sub={intg.sub}>
            <div className="flex items-center gap-2">
              <StatusBadge ok={intg.connected} label={intg.connected ? "Connected" : "Not connected"} />
              <button
                className="px-3 py-1 rounded-lg text-[10px] font-semibold border transition-colors hover:border-indigo-500/40"
                style={{ background: "rgba(99,102,241,0.08)", color: "var(--accent)", borderColor: "rgba(99,102,241,0.2)" }}
              >
                {intg.connected ? "Configure" : "Connect"}
              </button>
            </div>
          </SettingRow>
        ))}
      </SettingGroup>

      <SettingGroup title="Webhook Configuration">
        <SettingRow label="Webhook URL" sub="Receives POST with call payload on each event">
          <TextInput value={s.webhookUrl} onChange={v => set("webhookUrl", v)} placeholder="https://your-app.com/webhook" mono />
        </SettingRow>
        <SettingRow label="Webhook secret" sub="HMAC-SHA256 signing secret">
          <SecretInput value={s.webhookSecret} onChange={v => set("webhookSecret", v)} placeholder="whsec_…" />
        </SettingRow>
        <SettingRow label="Send on missed calls" sub="Trigger webhook when a call is missed">
          <Toggle value={s.webhookMissed} onChange={v => set("webhookMissed", v)} />
        </SettingRow>
        <SettingRow label="Send on AI escalation" sub="Trigger webhook when AI escalates">
          <Toggle value={s.webhookEscalate} onChange={v => set("webhookEscalate", v)} />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}

function SecuritySettings({ s, set }) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Authentication">
        <SettingRow label="Two-factor authentication" sub="Require 2FA for all admin logins">
          <Toggle value={s.twoFactor} onChange={v => set("twoFactor", v)} />
        </SettingRow>
        <SettingRow label="Session timeout" sub="Auto-logout after inactivity">
          <SelectInput
            value={s.sessionTimeout}
            onChange={v => set("sessionTimeout", v)}
            options={[
              { value: "15",  label: "15 minutes"   },
              { value: "30",  label: "30 minutes"   },
              { value: "60",  label: "1 hour"        },
              { value: "480", label: "8 hours"       },
              { value: "0",   label: "Never"         },
            ]}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Data & Privacy">
        <SettingRow label="Call recording encryption" sub="AES-256 encrypt stored recordings">
          <Toggle value={s.encryptRecordings} onChange={v => set("encryptRecordings", v)} />
        </SettingRow>
        <SettingRow label="PII redaction" sub="Redact card/SSN numbers from transcripts">
          <Toggle value={s.piiRedact} onChange={v => set("piiRedact", v)} />
        </SettingRow>
        <SettingRow label="Data retention period" sub="Auto-delete call records after this period">
          <SelectInput
            value={s.retention}
            onChange={v => set("retention", v)}
            options={[
              { value: "30",  label: "30 days"   },
              { value: "90",  label: "90 days"   },
              { value: "180", label: "6 months"  },
              { value: "365", label: "1 year"    },
              { value: "0",   label: "Never"     },
            ]}
          />
        </SettingRow>
        <SettingRow label="GDPR compliance mode" sub="Enable right-to-erasure workflows">
          <Toggle value={s.gdpr} onChange={v => set("gdpr", v)} />
        </SettingRow>
        <SettingRow label="Audit logging" sub="Log all admin actions for compliance">
          <Toggle value={s.auditLog} onChange={v => set("auditLog", v)} />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Danger Zone">
        <SettingRow label="Reset all settings to defaults" sub="This cannot be undone">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-900/40 hover:border-red-500/60 transition-colors"
            style={{ background: "rgba(239,68,68,0.07)", color: "#f87171" }}
          >
            <RotateCcw size={12} /> Reset Defaults
          </button>
        </SettingRow>
        <SettingRow label="Delete all call data" sub="Permanently removes recordings and transcripts">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-900/40 hover:border-red-500/60 transition-colors"
            style={{ background: "rgba(239,68,68,0.07)", color: "#f87171" }}
          >
            <Trash2 size={12} /> Delete All Data
          </button>
        </SettingRow>
      </SettingGroup>
    </div>
  );
}

function AppearanceSettings({ s, set }) {
  const ACCENTS = [
    "#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6",
  ];
  return (
    <div className="space-y-4">
      <SettingGroup title="Theme">
        <SettingRow label="Accent colour" sub="Primary highlight colour throughout the UI">
          <div className="flex items-center gap-1.5">
            {ACCENTS.map(c => (
              <button
                key={c}
                onClick={() => set("accent", c)}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: s.accent === c ? "white" : "transparent" }}
              />
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Sidebar width" sub="Left navigation panel size">
          <SelectInput
            value={s.sidebarWidth}
            onChange={v => set("sidebarWidth", v)}
            options={[
              { value: "w-40", label: "Narrow (160px)"  },
              { value: "w-48", label: "Default (192px)" },
              { value: "w-56", label: "Wide (224px)"    },
            ]}
          />
        </SettingRow>
        <SettingRow label="Font size" sub="Base font size for the UI">
          <SelectInput
            value={s.fontSize}
            onChange={v => set("fontSize", v)}
            options={[
              { value: "sm",   label: "Small"   },
              { value: "base", label: "Default" },
              { value: "lg",   label: "Large"   },
            ]}
          />
        </SettingRow>
        <SettingRow label="Show badge counts in sidebar" sub="Display unread counts on nav items">
          <Toggle value={s.showBadges} onChange={v => set("showBadges", v)} />
        </SettingRow>
        <SettingRow label="Animations" sub="Enable transitions and pulse effects">
          <Toggle value={s.animations} onChange={v => set("animations", v)} />
        </SettingRow>
      </SettingGroup>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  // General
  bizName: "AI Receptionist Co.", timezone: "EST", language: "en-US",
  hoursFrom: "09:00", hoursTo: "18:00", refreshInterval: "10", startPage: "/dashboard", compact: false,
  // AI
  // Secrets must NOT live in source. Set these in the deployment environment
  // (e.g. a local .env loaded at runtime) — never commit real keys.
  deepaiKey: "",
  deepseekKey: "",
  deepaiModel: "text-generator", deepseekModel: "deepseek-reasoner",
  minConf: "70", autoResolve: false, logReasoning: true, autoLang: true, sentiment: true,
  // Telephony
  voice: "nova", speechSpeed: "1.0", holdMusic: "classic",
  maxDuration: "600", vmRings: "4", recordAll: true, transcribeVm: true, noiseSuppression: true,
  // Notifications
  emailAlert: "", desktopNotif: true, sounds: true,
  notifMissed: true, notifNew: false, notifFlagged: true, notifEscalated: true, notifVm: true, notifHighPri: true,
  dailyDigest: true, weeklyDigest: false, digestEmail: "",
  // Integrations
  crmEnabled: false, webhookEnabled: false, smtpEnabled: false,
  webhookUrl: "", webhookSecret: "", webhookMissed: true, webhookEscalate: true,
  // Security
  twoFactor: false, sessionTimeout: "60", encryptRecordings: true,
  piiRedact: true, retention: "90", gdpr: false, auditLog: true,
  // Appearance
  accent: "#6366f1", sidebarWidth: "w-48", fontSize: "base", showBadges: true, animations: true,
};

export default function SettingsPage() {
  const [active, setActive] = useState("general");
  const [state,  setState]  = useState(DEFAULT_STATE);
  const [saved,  setSaved]  = useState(false);

  function set(key, val) {
    setState(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const panels = {
    general:       <GeneralSettings       s={state} set={set} />,
    ai:            <AISettings            s={state} set={set} />,
    telephony:     <TelephonySettings     s={state} set={set} />,
    notifications: <NotificationSettings  s={state} set={set} />,
    integrations:  <IntegrationSettings   s={state} set={set} />,
    security:      <SecuritySettings      s={state} set={set} />,
    appearance:    <AppearanceSettings    s={state} set={set} />,
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(148,163,184,0.1)" }}>
            <Settings size={18} style={{ color: "#94a3b8" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Settings</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Configure your AI Receptionist</p>
          </div>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ background: saved ? "#22c55e" : "var(--accent)", color: "white" }}
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="flex gap-5 items-start">
        {/* ── Side nav ── */}
        <nav
          className="w-44 shrink-0 rounded-xl border border-slate-700/40 overflow-hidden sticky top-0"
          style={{ background: "var(--bg-card)" }}
        >
          {SECTIONS.map(sec => {
            const Icon = sec.icon;
            const isActive = active === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActive(sec.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors text-left border-b border-slate-800/40 last:border-0"
                style={{
                  background:  isActive ? "rgba(99,102,241,0.12)" : "transparent",
                  color:       isActive ? "var(--accent)" : "var(--text-muted)",
                  borderLeft:  isActive ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                <Icon size={13} className="shrink-0" />
                <span className="flex-1">{sec.label}</span>
                {isActive && <ChevronRight size={11} />}
              </button>
            );
          })}
        </nav>

        {/* ── Panel ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {panels[active]}
        </div>
      </div>
    </main>
  );
}
