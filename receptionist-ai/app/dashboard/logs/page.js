"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  AudioLines, Play, Pause, Download, Search, Filter,
  ChevronDown, ChevronUp, ChevronsUpDown, Clock, User,
  Building2, Bot, Mic, MicOff, Volume2, VolumeX,
  SkipBack, SkipForward, MessageSquareText, FileText,
  ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle2,
  PhoneCall, PhoneMissed, Zap, Tag, SlidersHorizontal,
  BarChart2,
} from "lucide-react";

// ── Sample data ───────────────────────────────────────────────────────────────

const LOGS = [
  {
    id: "l001",
    caller: "Sarah Johnson",    phone: "+1 555 203 8821",
    dept: "Sales",              date: "2026-03-15", time: "14:41",
    duration: 154,              status: "completed",
    aiHandled: true,            sentiment: "positive",
    intent: "Pricing inquiry",  confidence: 94,
    transcript: [
      { role: "caller", text: "Hi, I'd like to know more about your enterprise pricing plans." },
      { role: "ai",     text: "Of course! I'd be happy to walk you through our enterprise options. Are you looking for a team of under 50, or larger?" },
      { role: "caller", text: "We're about 120 people. We need SSO, custom integrations, and dedicated support." },
      { role: "ai",     text: "That falls into our Enterprise tier. I'll connect you with our sales team who can put together a custom quote. One moment please." },
      { role: "caller", text: "Perfect, thank you." },
    ],
    summary: "Caller requested enterprise pricing for a 120-person team. Required SSO, custom integrations, and dedicated support. Transferred to Sales team for custom quote.",
    tags: ["Sales", "Enterprise", "Pricing"],
    flagged: false,
    quality: 5,
  },
  {
    id: "l002",
    caller: "Marcus Reid",      phone: "+1 555 874 0012",
    dept: "Support",            date: "2026-03-15", time: "14:43",
    duration: 52,               status: "completed",
    aiHandled: true,            sentiment: "neutral",
    intent: "Technical support",confidence: 88,
    transcript: [
      { role: "caller", text: "The dashboard isn't loading. I've tried refreshing." },
      { role: "ai",     text: "I'm sorry to hear that. Can you tell me which browser you're using and if you see any error messages?" },
      { role: "caller", text: "Chrome. It just shows a spinner." },
      { role: "ai",     text: "This may be a caching issue. Please try clearing your browser cache and cookies, then try again. If the problem persists, I'll escalate to our tech team." },
      { role: "caller", text: "OK let me try. Thanks." },
    ],
    summary: "Technical issue with dashboard not loading in Chrome. AI advised clearing cache. Issue likely resolved without escalation.",
    tags: ["Support", "Technical"],
    flagged: false,
    quality: 4,
  },
  {
    id: "l003",
    caller: "Diana Wu",         phone: "+1 555 994 3310",
    dept: "Billing",            date: "2026-03-15", time: "14:39",
    duration: 78,               status: "transferred",
    aiHandled: true,            sentiment: "negative",
    intent: "Billing dispute",  confidence: 91,
    transcript: [
      { role: "caller", text: "I was charged twice this month. This is the second time this has happened!" },
      { role: "ai",     text: "I completely understand your frustration, and I sincerely apologise for this inconvenience. Let me pull up your account right away." },
      { role: "caller", text: "I need this resolved today." },
      { role: "ai",     text: "Absolutely. I'm connecting you to our billing specialist now who can process a refund immediately. Please hold for just a moment." },
    ],
    summary: "Caller reported a duplicate charge — second occurrence. High frustration. Transferred to billing specialist for immediate refund processing.",
    tags: ["Billing", "Dispute", "Refund"],
    flagged: true,
    quality: 3,
  },
  {
    id: "l004",
    caller: "James Puerto",     phone: "+1 555 101 7755",
    dept: "Support",            date: "2026-03-15", time: "14:28",
    duration: 187,              status: "completed",
    aiHandled: true,            sentiment: "positive",
    intent: "Installation help",confidence: 97,
    transcript: [
      { role: "caller", text: "I need help installing the desktop app on Windows 11." },
      { role: "ai",     text: "Happy to help! First, download the installer from your account portal under Downloads. Have you done that yet?" },
      { role: "caller", text: "Yes, I have it." },
      { role: "ai",     text: "Great. Run it as Administrator — right-click and choose 'Run as administrator'. It should complete in about 2 minutes." },
      { role: "caller", text: "It worked! All installed." },
      { role: "ai",     text: "Excellent! Is there anything else I can assist you with today?" },
      { role: "caller", text: "No that's all, thanks so much!" },
    ],
    summary: "Guided caller through Windows 11 desktop app installation. Resolved successfully. Customer satisfied.",
    tags: ["Support", "Install"],
    flagged: false,
    quality: 5,
  },
  {
    id: "l005",
    caller: "Priya Patel",      phone: "+1 555 312 8873",
    dept: "Onboarding",         date: "2026-03-15", time: "14:44",
    duration: 115,              status: "completed",
    aiHandled: true,            sentiment: "positive",
    intent: "Onboarding request",confidence: 90,
    transcript: [
      { role: "caller", text: "We just signed up and I'm trying to onboard my team. Where do I start?" },
      { role: "ai",     text: "Welcome aboard! The best starting point is the Onboarding Wizard in your admin panel. It'll guide you through inviting users, setting permissions, and configuring integrations." },
      { role: "caller", text: "Got it, I can see it. Should I invite everyone at once?" },
      { role: "ai",     text: "You can do a bulk invite via CSV — much faster for teams. Would you like me to send you the template?" },
      { role: "caller", text: "Yes please!" },
    ],
    summary: "New customer seeking onboarding help. Directed to Onboarding Wizard. Offered bulk CSV invite template. Positive experience.",
    tags: ["Onboarding", "New Customer"],
    flagged: false,
    quality: 5,
  },
  {
    id: "l006",
    caller: "Tom Baker",        phone: "+1 555 667 3344",
    dept: "Billing",            date: "2026-03-14", time: "11:02",
    duration: 132,              status: "transferred",
    aiHandled: true,            sentiment: "neutral",
    intent: "Invoice query",    confidence: 85,
    transcript: [
      { role: "caller", text: "I need a copy of my invoice for March." },
      { role: "ai",     text: "Sure! You can download any invoice from the Billing section of your account. Go to Settings → Billing → Invoice History." },
      { role: "caller", text: "I don't see it there. My accountant needs it urgently." },
      { role: "ai",     text: "In that case, I'll transfer you to our billing team who can email it directly to your accountant right away." },
    ],
    summary: "Requested March invoice for accountant. Not found in portal. Transferred to billing team to email directly.",
    tags: ["Billing", "Invoice"],
    flagged: false,
    quality: 4,
  },
  {
    id: "l007",
    caller: "Elena Vasquez",    phone: "+1 555 773 9901",
    dept: "Sales",              date: "2026-03-14", time: "10:14",
    duration: 271,              status: "completed",
    aiHandled: true,            sentiment: "positive",
    intent: "Demo request",     confidence: 98,
    transcript: [
      { role: "caller", text: "I'd like to schedule a product demo for our leadership team." },
      { role: "ai",     text: "Absolutely! We have demo slots available this week and next. How many people would be attending?" },
      { role: "caller", text: "About 8 people, including our CTO and CFO." },
      { role: "ai",     text: "I'll book you in with one of our senior solution engineers. Are mornings or afternoons better for your team?" },
      { role: "caller", text: "Afternoon, preferably Thursday." },
      { role: "ai",     text: "Perfect. I've reserved Thursday 2 PM for you. You'll receive a calendar invite and pre-read materials shortly." },
    ],
    summary: "Demo scheduled for an 8-person leadership team including CTO and CFO. Thursday 2 PM confirmed. High-value opportunity.",
    tags: ["Sales", "Demo", "VIP"],
    flagged: false,
    quality: 5,
  },
  {
    id: "l008",
    caller: "Ben Okafor",       phone: "+1 555 334 9900",
    dept: "Billing",            date: "2026-03-14", time: "09:30",
    duration: 44,               status: "completed",
    aiHandled: false,           sentiment: "negative",
    intent: "Complaint",        confidence: 72,
    transcript: [
      { role: "caller", text: "This is completely unacceptable. I've been waiting for a refund for three weeks!" },
      { role: "ai",     text: "I'm very sorry to hear this. Let me check your account immediately." },
      { role: "caller", text: "Just get me a human. This AI isn't helping." },
    ],
    summary: "Frustrated caller demanding refund after 3-week wait. Requested human agent. AI escalation scored low — flagged for review.",
    tags: ["Billing", "Complaint", "Escalation"],
    flagged: true,
    quality: 1,
  },
  {
    id: "l009",
    caller: "Natasha Ivanova",  phone: "+1 555 229 4480",
    dept: "Sales",              date: "2026-03-13", time: "15:58",
    duration: 224,              status: "completed",
    aiHandled: true,            sentiment: "positive",
    intent: "Upsell inquiry",   confidence: 93,
    transcript: [
      { role: "caller", text: "We're on the Pro plan. What would we gain by upgrading to Business?" },
      { role: "ai",     text: "Great question! Business adds advanced analytics, priority support, custom SLAs, and 5x the API rate limits." },
      { role: "caller", text: "The analytics feature sounds useful. Can we get a trial?" },
      { role: "ai",     text: "Absolutely. I can activate a 14-day Business trial on your account right now at no cost. Shall I do that?" },
      { role: "caller", text: "Yes please, go ahead." },
    ],
    summary: "Pro plan customer enquired about Business upgrade. Activated 14-day Business trial. Strong upsell opportunity.",
    tags: ["Sales", "Upsell"],
    flagged: false,
    quality: 5,
  },
  {
    id: "l010",
    caller: "Fiona McLaren",    phone: "+1 555 102 6677",
    dept: "HR",                 date: "2026-03-12", time: "13:10",
    duration: 120,              status: "completed",
    aiHandled: true,            sentiment: "neutral",
    intent: "HR enquiry",       confidence: 86,
    transcript: [
      { role: "caller", text: "I need to update the HR contact information on our account." },
      { role: "ai",     text: "Of course. You can update company contact details under Admin → Company Profile → HR Contacts. You'll need admin privileges." },
      { role: "caller", text: "I do have admin access. I'll take care of it there." },
      { role: "ai",     text: "Perfect. Is there anything else I can help with today?" },
      { role: "caller", text: "No, that's everything. Thank you." },
    ],
    summary: "HR contact info update requested. Directed to Admin → Company Profile → HR Contacts. Resolved in self-service.",
    tags: ["HR", "Admin"],
    flagged: false,
    quality: 4,
  },
  {
    id: "l011",
    caller: "Marcus Vega",      phone: "+1 555 671 8833",
    dept: "Management",         date: "2026-03-12", time: "11:05",
    duration: 318,              status: "completed",
    aiHandled: true,            sentiment: "positive",
    intent: "Contract renewal", confidence: 96,
    transcript: [
      { role: "caller", text: "Our contract is up in 60 days. I want to discuss renewal terms." },
      { role: "ai",     text: "Thank you for getting in touch about your renewal. I'll connect you with your dedicated account manager. They'll have your full history and can offer loyalty pricing." },
      { role: "caller", text: "That sounds great. We're also interested in adding two more seats." },
      { role: "ai",     text: "Noted! I'll flag that for your account manager and also prepare an amended quote. Connecting you now." },
    ],
    summary: "VIP contract renewal discussion. 60 days to expiry. Requested 2 additional seats. Transferred to account manager with loyalty pricing note.",
    tags: ["Management", "VIP", "Renewal"],
    flagged: false,
    quality: 5,
  },
  {
    id: "l012",
    caller: "Ryan Nguyen",      phone: "+1 555 773 1144",
    dept: "Onboarding",         date: "2026-03-11", time: "11:30",
    duration: 105,              status: "transferred",
    aiHandled: true,            sentiment: "positive",
    intent: "Account setup",    confidence: 89,
    transcript: [
      { role: "caller", text: "I'm trying to set up our API integration but I can't find the webhook docs." },
      { role: "ai",     text: "The webhook documentation is in our Developer Hub at docs.example.com/webhooks. You'll need your API key from Settings → Developer." },
      { role: "caller", text: "Found it. I also need help configuring the CRM sync." },
      { role: "ai",     text: "CRM sync is a bit more involved — I'll transfer you to our integration specialist." },
    ],
    summary: "Developer onboarding — webhook docs located. Needed help with CRM sync configuration. Transferred to integration specialist.",
    tags: ["Onboarding", "API", "Dev"],
    flagged: false,
    quality: 4,
  },
];

// ── Config ────────────────────────────────────────────────────────────────────

const DEPT_COLOR = {
  Sales: "#6366f1", Support: "#22c55e", Billing: "#ef4444",
  HR: "#a78bfa", Management: "#f97316", Onboarding: "#06b6d4",
};

const SENTIMENT_CFG = {
  positive: { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  label: "Positive" },
  neutral:  { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "Neutral"  },
  negative: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "Negative" },
};

const STATUS_CFG = {
  completed:   { color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  transferred: { color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  missed:      { color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
};

const QUALITY_STARS = 5;

function fmtDuration(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function avatarColor(name) {
  const p = ["#6366f1","#22c55e","#f97316","#a78bfa","#06b6d4","#f43f5e","#eab308"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return p[Math.abs(h) % p.length];
}

function initials(name) {
  return name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
}

// ── Mini waveform visual ──────────────────────────────────────────────────────

function Waveform({ playing, progress }) {
  const bars = Array.from({ length: 40 }, (_, i) => {
    const h = 20 + Math.sin(i * 0.7) * 10 + Math.cos(i * 1.3) * 8 + (i % 3 === 0 ? 12 : 0);
    const filled = (i / 40) * 100 < progress;
    return { h: Math.max(4, Math.min(36, h)), filled };
  });
  return (
    <div className="flex items-center gap-[2px] h-9">
      {bars.map((b, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: 3,
            height: b.h,
            background: b.filled ? "var(--accent)" : playing ? "#334155" : "#1e293b",
            opacity: b.filled ? 1 : playing ? 0.7 + Math.sin(i * 0.5 + Date.now() / 200) * 0.3 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ── Inline audio player ───────────────────────────────────────────────────────

function AudioPlayer({ log, active, onActivate }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active && playing) {
      setPlaying(false);
      clearInterval(intervalRef.current);
    }
  }, [active, playing]);

  function toggle() {
    if (!active) { onActivate(); return; }
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { clearInterval(intervalRef.current); setPlaying(false); return 0; }
          return p + (100 / log.duration) * 0.5;
        });
      }, 500);
    }
  }

  function seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setProgress(pct);
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid #1e293b" }}>
      {/* Play/Pause */}
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110"
        style={{ background: active ? "var(--accent)" : "rgba(99,102,241,0.2)", color: active ? "white" : "var(--accent)" }}
      >
        {playing ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
      </button>

      {/* Waveform */}
      <div className="flex-1 cursor-pointer" onClick={seek}>
        <Waveform playing={playing} progress={progress} />
      </div>

      {/* Time */}
      <div className="text-[10px] font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>
        {fmtDuration(Math.round(log.duration * progress / 100))} / {fmtDuration(log.duration)}
      </div>

      {/* Download */}
      <button className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors" style={{ color: "#475569" }} title="Download">
        <Download size={12} />
      </button>
    </div>
  );
}

// ── Log row (expandable) ──────────────────────────────────────────────────────

function LogRow({ log, expanded, onToggle, activePlayer, onActivatePlayer }) {
  const sent = SENTIMENT_CFG[log.sentiment];
  const sc   = STATUS_CFG[log.status] ?? STATUS_CFG.completed;
  const dc   = DEPT_COLOR[log.dept]   ?? "#6366f1";
  const av   = avatarColor(log.caller);

  return (
    <div
      className="rounded-xl border transition-all overflow-hidden"
      style={{
        background:   "var(--bg-card)",
        borderColor:  expanded ? "rgba(99,102,241,0.35)" : "rgba(30,41,59,0.6)",
        boxShadow:    expanded ? "0 0 0 1px rgba(99,102,241,0.1)" : "none",
      }}
    >
      {/* ── Main row ── */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/10 transition-colors"
        onClick={onToggle}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: `${av}22`, color: av }}
        >
          {initials(log.caller)}
        </div>

        {/* Caller + intent */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: "var(--text-main)" }}>{log.caller}</span>
            {log.flagged && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-950/50 text-red-400 border border-red-900/40">
                <AlertTriangle size={8} /> FLAGGED
              </span>
            )}
            {log.aiHandled && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
                <Bot size={8} /> AI
              </span>
            )}
          </div>
          <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
            {log.intent}
          </div>
        </div>

        {/* Meta pills */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Dept */}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${dc}18`, color: dc }}>
            {log.dept}
          </span>
          {/* Sentiment */}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: sent.bg, color: sent.color }}>
            {sent.label}
          </span>
          {/* Duration */}
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <Clock size={10} /> {fmtDuration(log.duration)}
          </span>
          {/* Date */}
          <span className="text-[10px]" style={{ color: "#475569" }}>{log.date} {log.time}</span>
          {/* Confidence */}
          <span
            className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
            style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
          >
            {log.confidence}%
          </span>
          {/* Quality stars */}
          <div className="flex gap-0.5">
            {Array.from({ length: QUALITY_STARS }).map((_, i) => (
              <span key={i} style={{ color: i < log.quality ? "#facc15" : "#1e293b", fontSize: 10 }}>★</span>
            ))}
          </div>
        </div>

        {/* Chevron */}
        <div className="shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800/60">

          {/* Audio player */}
          <div className="pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AudioLines size={12} style={{ color: "var(--accent)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>Recording</span>
              <span className="ml-auto text-[10px] text-slate-600">{log.phone}</span>
            </div>
            <AudioPlayer
              log={log}
              active={activePlayer === log.id}
              onActivate={() => onActivatePlayer(log.id)}
            />
          </div>

          {/* Summary */}
          <div
            className="px-3 py-2.5 rounded-lg border-l-2 text-xs"
            style={{ background: "rgba(99,102,241,0.06)", borderColor: "var(--accent)", color: "#94a3b8" }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Bot size={11} style={{ color: "var(--accent)" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>AI Summary</span>
            </div>
            {log.summary}
          </div>

          {/* Transcript */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquareText size={12} style={{ color: "var(--text-muted)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>Transcript</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {log.transcript.map((line, i) => (
                <div key={i} className={`flex gap-2 ${line.role === "ai" ? "justify-start" : "justify-end"}`}>
                  {line.role === "ai" && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(99,102,241,0.2)" }}>
                      <Bot size={10} style={{ color: "var(--accent)" }} />
                    </div>
                  )}
                  <div
                    className="max-w-[75%] px-3 py-1.5 rounded-xl text-[11px] leading-relaxed"
                    style={line.role === "ai"
                      ? { background: "rgba(99,102,241,0.1)", color: "#a5b4fc", borderRadius: "4px 12px 12px 12px" }
                      : { background: "rgba(255,255,255,0.05)", color: "#cbd5e1", borderRadius: "12px 4px 12px 12px" }
                    }
                  >
                    {line.text}
                  </div>
                  {line.role === "caller" && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-bold"
                      style={{ background: `${av}22`, color: av }}
                    >
                      {initials(log.caller)[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tags + actions */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/40">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag size={11} className="text-slate-500" />
              {log.tags.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-green-900/40 hover:border-green-500/60 transition-colors" style={{ background: "rgba(34,197,94,0.07)", color: "#4ade80" }}>
                <ThumbsUp size={10} /> Good
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-red-900/40 hover:border-red-500/60 transition-colors" style={{ background: "rgba(239,68,68,0.07)", color: "#f87171" }}>
                <ThumbsDown size={10} /> Flag
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-slate-700 hover:border-slate-500 transition-colors" style={{ background: "rgba(255,255,255,0.03)", color: "#64748b" }}>
                <FileText size={10} /> Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon, sub }) {
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
        {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VoiceLogsPage() {
  const [search,     setSearch]     = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sentFilter, setSentFilter] = useState("all");
  const [aiFilter,   setAiFilter]   = useState("all");   // all | ai | human
  const [flagFilter, setFlagFilter] = useState(false);
  const [sortKey,    setSortKey]    = useState("date");
  const [sortDir,    setSortDir]    = useState("desc");
  const [expanded,   setExpanded]   = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const depts = useMemo(() => ["All", ...Array.from(new Set(LOGS.map(l => l.dept))).sort()], []);

  const filtered = useMemo(() => {
    let data = LOGS;
    if (deptFilter !== "All")   data = data.filter(l => l.dept === deptFilter);
    if (sentFilter !== "all")   data = data.filter(l => l.sentiment === sentFilter);
    if (aiFilter === "ai")      data = data.filter(l => l.aiHandled);
    if (aiFilter === "human")   data = data.filter(l => !l.aiHandled);
    if (flagFilter)             data = data.filter(l => l.flagged);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(l =>
        l.caller.toLowerCase().includes(q) ||
        l.intent.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.tags.some(t => t.toLowerCase().includes(q)) ||
        l.transcript.some(t => t.text.toLowerCase().includes(q))
      );
    }
    return [...data].sort((a, b) => {
      let av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      if (sortKey === "date") { av = a.date + a.time; bv = b.date + b.time; }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [search, deptFilter, sentFilter, aiFilter, flagFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = useMemo(() => ({
    total:      LOGS.length,
    aiHandled:  LOGS.filter(l => l.aiHandled).length,
    flagged:    LOGS.filter(l => l.flagged).length,
    avgConf:    Math.round(LOGS.reduce((s, l) => s + l.confidence, 0) / LOGS.length),
    totalMins:  Math.round(LOGS.reduce((s, l) => s + l.duration, 0) / 60),
  }), []);

  function toggleExpand(id) {
    setExpanded(v => v === id ? null : id);
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(6,182,212,0.12)" }}
          >
            <AudioLines size={18} style={{ color: "#06b6d4" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-main)" }}>Voice Logs</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {LOGS.length} recordings · {stats.totalMins} min total
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 hover:border-slate-500 transition-colors"
          style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}
        >
          <Download size={13} /> Export All
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="flex items-stretch gap-3 flex-wrap">
        <StatCard label="Total Recordings" value={stats.total}     color="#06b6d4" icon={AudioLines}    />
        <StatCard label="AI Handled"        value={stats.aiHandled} color="#6366f1" icon={Bot}           sub={`${Math.round(stats.aiHandled/stats.total*100)}% of calls`} />
        <StatCard label="Flagged"           value={stats.flagged}   color="#ef4444" icon={AlertTriangle} sub="Needs review" />
        <StatCard label="Avg Confidence"    value={`${stats.avgConf}%`} color="#22c55e" icon={Zap}      sub="AI accuracy" />
        <StatCard label="Total Duration"    value={`${stats.totalMins}m`} color="#a78bfa" icon={Clock}  sub="All recordings" />
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
            placeholder="Search caller, intent, transcript…"
            className="bg-transparent text-xs text-slate-300 placeholder:text-slate-500 outline-none w-full"
          />
        </div>

        {/* Dept */}
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

        {/* Sentiment */}
        <div className="flex items-center gap-1">
          {[
            { val: "all",      label: "All"      },
            { val: "positive", label: "Positive" },
            { val: "neutral",  label: "Neutral"  },
            { val: "negative", label: "Negative" },
          ].map(s => (
            <button
              key={s.val}
              onClick={() => { setSentFilter(s.val); setPage(1); }}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                background: sentFilter === s.val ? "var(--accent)" : "rgba(99,102,241,0.06)",
                color:      sentFilter === s.val ? "white" : "var(--text-muted)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* AI / Human */}
        <div className="flex items-center gap-1">
          {[
            { val: "all",   label: "All",   icon: null },
            { val: "ai",    label: "AI",    icon: Bot  },
            { val: "human", label: "Human", icon: User },
          ].map(a => (
            <button
              key={a.val}
              onClick={() => { setAiFilter(a.val); setPage(1); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors"
              style={{
                background: aiFilter === a.val ? "var(--accent)" : "rgba(99,102,241,0.06)",
                color:      aiFilter === a.val ? "white" : "var(--text-muted)",
              }}
            >
              {a.icon && <a.icon size={9} />} {a.label}
            </button>
          ))}
        </div>

        {/* Flagged toggle */}
        <button
          onClick={() => { setFlagFilter(v => !v); setPage(1); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors"
          style={{
            background: flagFilter ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.05)",
            color:      flagFilter ? "#f87171" : "#64748b",
            border:     `1px solid ${flagFilter ? "rgba(239,68,68,0.35)" : "#334155"}`,
          }}
        >
          <AlertTriangle size={10} /> Flagged Only
        </button>

        <span className="ml-auto text-xs text-slate-500 tabular-nums">
          {filtered.length} log{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Log list ── */}
      <div className="space-y-2">
        {pageData.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 py-16 rounded-xl border border-slate-700/40"
            style={{ background: "var(--bg-card)" }}
          >
            <AudioLines size={30} className="text-slate-600" />
            <span className="text-slate-500 text-sm">No voice logs match your filters</span>
          </div>
        ) : pageData.map(log => (
          <LogRow
            key={log.id}
            log={log}
            expanded={expanded === log.id}
            onToggle={() => toggleExpand(log.id)}
            activePlayer={activePlayer}
            onActivatePlayer={setActivePlayer}
          />
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
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
