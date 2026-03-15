"use client";

import { CheckCircle2, XCircle, Clock, FlaskConical, AlertTriangle } from "lucide-react";

/**
 * TestRunner — displays the test results from the "testing" pipeline stage.
 * Receives `testStage` from the orchestrator results object.
 */
export default function TestRunner({ testStage }) {
  if (!testStage) {
    return (
      <div
        className="rounded-xl border border-slate-700/40 p-5 flex flex-col items-center justify-center gap-2 min-h-40"
        style={{ background: "var(--bg-card)" }}
      >
        <FlaskConical size={28} className="text-slate-600" />
        <p className="text-sm text-slate-500">Run the pipeline to see test results</p>
      </div>
    );
  }

  const { tests = [], passed = 0, total = 0, score = 0 } = testStage;

  const scoreColor =
    score === 100 ? "#22c55e" :
    score >= 60   ? "#facc15" :
                    "#ef4444";

  return (
    <div
      className="rounded-xl border border-slate-700/40 overflow-hidden"
      style={{ background: "var(--bg-card)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} style={{ color: "#facc15" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Test Runner
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            {passed}/{total} passed
          </span>
          {/* Score ring */}
          <span
            className="text-sm font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: `${scoreColor}18`, color: scoreColor }}
          >
            {score}%
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1 bg-slate-800 w-full">
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{ width: `${score}%`, background: scoreColor }}
        />
      </div>

      {/* Test list */}
      <div className="divide-y divide-slate-800/50">
        {tests.map((test, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/15 transition-colors">
            {test.pass
              ? <CheckCircle2 size={14} className="text-green-400 shrink-0" />
              : <XCircle     size={14} className="text-red-400 shrink-0" />}
            <p
              className="text-sm flex-1"
              style={{ color: test.pass ? "var(--text-main)" : "#f87171" }}
            >
              {test.name}
            </p>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{
                background: test.pass ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                color:      test.pass ? "#22c55e" : "#ef4444",
              }}
            >
              {test.pass ? "PASS" : "FAIL"}
            </span>
          </div>
        ))}

        {tests.length === 0 && (
          <div className="px-5 py-4 flex items-center gap-2 text-sm text-slate-500">
            <Clock size={14} /> No test cases
          </div>
        )}
      </div>

      {passed < total && (
        <div className="px-5 py-3 bg-yellow-950/20 border-t border-yellow-900/30 flex items-center gap-2 text-xs text-yellow-400">
          <AlertTriangle size={13} />
          {total - passed} test{total - passed !== 1 ? "s" : ""} failed — review before routing
        </div>
      )}
    </div>
  );
}
