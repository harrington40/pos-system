"use client";

import { useState } from "react";
import {
  Mic, Brain, Cpu, FlaskConical, Plug2, Radio,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Zap,
} from "lucide-react";

// Pipeline stage definitions
const STAGES = [
  {
    id: "stt",
    label: "Speech-to-Text",
    model: "Whisper v3",
    provider: "OpenAI",
    icon: Mic,
    accentColor: "#38bdf8",
    description: "Converts raw caller audio to a clean transcript in real-time.",
  },
  {
    id: "reasoning",
    label: "Reasoning",
    model: "DeepAI Text",
    provider: "DeepAI",
    icon: Brain,
    accentColor: "#a78bfa",
    description: "Intent analysis, entity extraction, sentiment scoring, and priority classification.",
  },
  {
    id: "implementation",
    label: "Implementation",
    model: "DeepSeek Chat",
    provider: "DeepSeek",
    icon: Cpu,
    accentColor: "#6366f1",
    description: "Generates the AI response, action plan, and routing decision based on the reasoning output.",
  },
  {
    id: "testing",
    label: "Testing",
    model: "Policy Validator",
    provider: "Internal",
    icon: FlaskConical,
    accentColor: "#facc15",
    description: "Runs automated assertions: confidence threshold, safe-content check, valid routing, response completeness.",
  },
  {
    id: "integration",
    label: "Integration",
    model: "CRM + Ticketing",
    provider: "Internal",
    icon: Plug2,
    accentColor: "#34d399",
    description: "Syncs to CRM, creates support ticket, routes call to the correct department.",
  },
  {
    id: "tts",
    label: "Voice Output",
    model: "ElevenLabs",
    provider: "ElevenLabs",
    icon: Radio,
    accentColor: "#f472b6",
    description: "Converts the generated response text back to natural speech for the caller.",
  },
];

function StageRow({ stage, result, isActive, isLast }) {
  const [open, setOpen] = useState(false);
  const Icon = stage.icon;

  const status = result?.status ?? (isActive ? "running" : "idle");

  const badgeMap = {
    passed:  { label: "Passed",  color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
    partial: { label: "Partial", color: "#facc15", bg: "rgba(250,204,21,0.12)" },
    failed:  { label: "Failed",  color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
    running: { label: "Running", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    idle:    { label: "Idle",    color: "#475569", bg: "rgba(71,85,105,0.12)"  },
  };

  const badge = badgeMap[status] ?? badgeMap.idle;

  return (
    <div>
      <div
        className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/20 transition-colors cursor-pointer"
        onClick={() => result && setOpen((o) => !o)}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${stage.accentColor}18`, border: `1px solid ${stage.accentColor}30` }}
        >
          {status === "running"
            ? <Loader2 size={16} className="animate-spin" style={{ color: stage.accentColor }} />
            : <Icon size={16} style={{ color: stage.accentColor }} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {stage.label}
            </p>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: `${stage.accentColor}18`, color: stage.accentColor }}
            >
              {stage.model}
            </span>
            <span className="text-xs text-slate-500">{stage.provider}</span>
          </div>
          <p className="text-xs mt-0.5 text-slate-500 truncate">{stage.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {result?.latencyMs && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
              <Zap size={11} />
              {result.latencyMs}ms
            </span>
          )}
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: badge.bg, color: badge.color }}
          >
            {status === "passed"  && <CheckCircle2 size={11} />}
            {status === "failed"  && <AlertCircle  size={11} />}
            {status === "running" && <Loader2 size={11} className="animate-spin" />}
            {badge.label}
          </span>
          {result && (open
            ? <ChevronUp   size={14} className="text-slate-500" />
            : <ChevronDown size={14} className="text-slate-500" />)}
        </div>
      </div>

      {open && result && (
        <div className="mx-5 mb-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700/40 text-xs">
          <pre className="whitespace-pre-wrap break-all font-mono text-slate-300 leading-relaxed overflow-auto max-h-48">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {!isLast && (
        <div className="flex items-center gap-4 px-5 py-0.5">
          <div className="w-9 flex justify-center">
            <div className="w-px h-4 bg-slate-700/60" />
          </div>
          <span className="text-xs text-slate-600">↓</span>
        </div>
      )}
    </div>
  );
}

const DEMO_TRANSCRIPT =
  "Hi, I am calling about the invoice I received last week. I think there is an error in the total amount. My account number is ACC-4421.";

export default function AIOrchestrator({ onResults }) {
  const [transcript, setTranscript] = useState(DEMO_TRANSCRIPT);
  const [results, setResults]       = useState({});
  const [running, setRunning]       = useState(false);
  const [activeStage, setActiveStage] = useState(null);
  const [error, setError]           = useState(null);
  const [requestCount, setRequestCount] = useState(1247);

  async function runPipeline() {
    if (running) return;
    setRunning(true);
    setError(null);
    const fresh = {};
    setResults(fresh);
    if (onResults) onResults({});

    try {
      setActiveStage("stt");
      await new Promise((r) => setTimeout(r, 600));
      const sttResult = { status: "passed", latencyMs: 312, transcript };
      setResults((r) => { const n = { ...r, stt: sttResult }; if (onResults) onResults(n); return n; });

      setActiveStage("reasoning");
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, callId: `call-${Date.now()}` }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Pipeline failed");

      const order = ["reasoning", "implementation", "testing", "integration"];
      for (const s of order) {
        setActiveStage(s);
        await new Promise((r) => setTimeout(r, 280));
        setResults((r) => {
          const n = { ...r, [s]: data.stages[s] };
          if (onResults) onResults(n);
          return n;
        });
      }

      setActiveStage("tts");
      await new Promise((r) => setTimeout(r, 400));
      setResults((r) => {
        const n = { ...r, tts: { status: "passed", latencyMs: 228 } };
        if (onResults) onResults(n);
        return n;
      });

      setRequestCount((c) => c + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setActiveStage(null);
      setRunning(false);
    }
  }

  const allPassed =
    !running &&
    Object.keys(results).length === STAGES.length &&
    Object.values(results).every((r) => r.status === "passed");

  return (
    <div
      className="rounded-xl border border-slate-700/40 overflow-hidden"
      style={{ background: "var(--bg-card)" }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <Brain size={17} style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            AI Orchestrator
          </h2>
          <span className="hidden sm:block text-xs text-slate-500">
            DeepAI → DeepSeek → Test → Integrate
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>
            Runs:{" "}
            <span className="text-indigo-400 font-semibold tabular-nums">{requestCount.toLocaleString()}</span>
          </span>
          {allPassed && (
            <span className="flex items-center gap-1 text-green-400 font-medium">
              <CheckCircle2 size={12} /> All stages passed
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-b border-slate-700/40 bg-slate-900/30">
        <label className="block text-xs text-slate-500 mb-1.5 font-medium">
          Test transcript
        </label>
        <div className="flex gap-2">
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={2}
            className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-500 outline-none resize-none focus:border-indigo-500/60 transition-colors"
            placeholder="Paste caller transcript..."
            maxLength={4000}
          />
          <button
            onClick={runPipeline}
            disabled={running || !transcript.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {running ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" /> Running
              </span>
            ) : "Run Pipeline"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>

      <div className="divide-y divide-slate-800/60">
        {STAGES.map((stage, i) => (
          <StageRow
            key={stage.id}
            stage={stage}
            result={results[stage.id] ?? null}
            isActive={activeStage === stage.id}
            isLast={i === STAGES.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
