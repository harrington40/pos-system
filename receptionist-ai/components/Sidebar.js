"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PhoneCall,
  History,
  PhoneMissed,
  BookUser,
  BrainCircuit,
  AudioLines,
  BarChart3,
  Settings,
  Bot,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",       href: "/dashboard",              icon: LayoutDashboard },
  { label: "Live Calls",      href: "/dashboard/live",         icon: PhoneCall,    badge: 3 },
  { label: "Call History",    href: "/dashboard/history",      icon: History },
  { label: "Missed Calls",    href: "/dashboard/missed",       icon: PhoneMissed,  badge: 7 },
  { label: "Contacts",        href: "/dashboard/contacts",     icon: BookUser },
  { label: "AI Orchestrator", href: "/dashboard/orchestrator", icon: BrainCircuit },
  { label: "Voice Logs",      href: "/dashboard/logs",         icon: AudioLines },
  { label: "Analytics",       href: "/dashboard/analytics",    icon: BarChart3 },
  { label: "Settings",        href: "/dashboard/settings",     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col h-screen w-48 shrink-0"
      style={{ background: "var(--bg-sidebar)", borderRight: "1px solid #1e293b" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-3 py-3.5 border-b border-slate-800">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--accent)" }}
        >
          <Bot size={15} color="white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight truncate" style={{ color: "var(--text-main)" }}>
            AI Receptionist
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Control Panel
          </p>
        </div>
      </div>

      {/* Online status pill */}
      <div className="flex items-center gap-1.5 mx-2 mt-3 mb-1.5 px-2 py-1.5 rounded-md bg-green-950/40 border border-green-900/40">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-active shrink-0" />
        <span className="text-[10px] text-green-400 font-medium truncate">AI Online</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-2 py-2 rounded-md text-[11px] font-medium transition-colors"
              style={{
                background: active ? "rgba(99,102,241,0.15)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
              }}
            >
              <Icon size={14} className="shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge && (
                <span
                  className="text-[10px] font-bold px-1 py-0.5 rounded-full shrink-0"
                  style={{
                    background: label === "Missed Calls" ? "#ef444420" : "#6366f120",
                    color: label === "Missed Calls" ? "#ef4444" : "var(--accent)",
                  }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium truncate" style={{ color: "var(--text-main)" }}>Admin</p>
            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>admin@company.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
