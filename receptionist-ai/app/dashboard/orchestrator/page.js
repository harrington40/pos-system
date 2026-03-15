"use client";

import { useState } from "react";
import { BrainCircuit, Cpu, FlaskConical, Plug2, ArrowRight } from "lucide-react";
import AIOrchestrator from "@/components/AIOrchestrator";
import TestRunner from "@/components/TestRunner";
import IntegrationStatus from "@/components/IntegrationStatus";

// ── Model info cards ───────────────────────────────────────────────────────────

const MODELS = [
  {
    role: "Reasoning",
    name: "DeepAI Text Generator",
    icon: BrainCircuit,
    color: "#a78bfa",
    envVar: "DEEPAI_API_KEY",
    description:
      "Analyses the caller transcript to extract intent, named entities, sentiment, and call priority. Output feeds directly into the implementation stage.",
    inputLabel: "Caller transcript",
    outputLabel: "Intent, entities, sentiment, priority",
  },
  {
    role: "Implementation",
    name: "DeepSeek Chat",
    icon: Cpu,
    color: "#6366f1",
    envVar: "DEEPSEEK_API_KEY",
    description:
      "Takes the reasoning output and generates a natural-language response, follow-up action list, and department routing decision.",
    inputLabel: "Reasoning JSON",
    outputLabel: "Response, actions, routeTo, confidence",
  },
  {
    role: "Testing",
    name: "Policy Validator",
    icon: FlaskConical,
    color: "#facc15",
    envVar: "Internal",
    description:
      "Runs 5 automated assertions: response completeness, confidence threshold, valid routing, safe content, and action list presence.",
    inputLabel: "Implementation JSON",
    outputLabel: "Test results, score",
  },
  {
    role: "Integration",
    name: "CRM + Ticketing",
    icon: Plug2,
    color: "#34d399",
    envVar: "Internal",
    description:
      "Assembles CRM entry, creates support ticket ID, sets department routing, and logs the call with full metadata.",
    inputLabel: "All stage outputs",
    outputLabel: "ticketId, CRM entry, actions",
  },
];

function ModelCard({ model }) {
  const Icon = model.icon;
  return (
    <div
      className="rounded-xl border border-slate-700/40 p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-card)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${model.color}18`, border: `1px solid ${model.color}30` }}
        >
          <Icon size={17} style={{ color: model.color }} />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">{model.role}</p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            {model.name}
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{model.description}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="px-2 py-1.5 rounded bg-slate-800/60">
          <p className="text-slate-500 mb-0.5">Input</p>
          <p className="text-slate-300">{model.inputLabel}</p>
        </div>
        <div className="px-2 py-1.5 rounded bg-slate-800/60">
          <p className="text-slate-500 mb-0.5">Output</p>
          <p className="text-slate-300">{model.outputLabel}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
        <span className="text-slate-500">API Key</span>
        <span
          className="font-mono px-1.5 py-0.5 rounded"
          style={{ background: `${model.color}14`, color: model.color }}
        >
          {model.envVar}
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrchestratorPage() {
  // Lifted state — AIOrchestrator writes here, TestRunner + IntegrationStatus read from here
  const [pipelineResults, setPipelineResults] = useState({});

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BrainCircuit size={22} style={{ color: "var(--accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>
            AI Orchestrator
          </h1>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">
          Multi-model pipeline: <strong className="text-violet-400">DeepAI</strong> for
          intent reasoning → <strong className="text-indigo-400">DeepSeek</strong> for
          response implementation → automated testing → CRM integration.
        </p>
      </div>

      {/* Pipeline flow diagram */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {MODELS.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={m.role} className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium"
                style={{
                  background: `${m.color}10`,
                  borderColor: `${m.color}30`,
                  color: m.color,
                }}
              >
                <Icon size={13} />
                {m.role}
              </div>
              {i < MODELS.length - 1 && (
                <ArrowRight size={14} className="text-slate-600 shrink-0" />
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-2 shrink-0">
          <ArrowRight size={14} className="text-slate-600 shrink-0" />
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium"
            style={{ background: "rgba(244,114,182,0.1)", borderColor: "rgba(244,114,182,0.3)", color: "#f472b6" }}
          >
            Voice Output
          </div>
        </div>
      </div>

      {/* Model info cards */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Model Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {MODELS.map((m) => <ModelCard key={m.role} model={m} />)}
        </div>
      </section>

      {/* Live pipeline runner */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Live Pipeline</h2>
        <AIOrchestrator onResults={setPipelineResults} />
      </section>

      {/* Test + Integration results side-by-side */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 mb-3">Stage Results</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TestRunner testStage={pipelineResults?.testing ?? null} />
          <IntegrationStatus integrationStage={pipelineResults?.integration ?? null} />
        </div>
      </section>
    </main>
  );
}
