import CallGrid from "@/components/CallGrid";
import AIOrchestrator from "@/components/AIOrchestrator";
import LiveMonitor from "@/components/LiveMonitor";
import { LayoutDashboard } from "lucide-react";

export const metadata = {
  title: "Dashboard — AI Receptionist",
};

export default function DashboardPage() {
  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={22} style={{ color: "var(--accent)" }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>
              AI Receptionist Dashboard
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {now}
            </p>
          </div>
        </div>
      </div>

      {/* Live stats + queue */}
      <LiveMonitor />

      {/* Recent / active calls grid */}
      <section>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
          Recent Calls
        </h2>
        <CallGrid />
      </section>

      {/* AI Orchestration layer */}
      <section>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
          AI Pipeline
        </h2>
        <AIOrchestrator />
      </section>
    </main>
  );
}
