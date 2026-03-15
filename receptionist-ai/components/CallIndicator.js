/**
 * CallIndicator — status dot with optional pulse animation
 * status: "active" | "incoming" | "missed" | "on-hold" | "ended"
 */

const STATUS_CONFIG = {
  active:   { color: "var(--call-active)",   pulse: "pulse-active",    label: "Active" },
  incoming: { color: "var(--call-incoming)", pulse: "pulse-incoming",  label: "Incoming" },
  missed:   { color: "var(--call-missed)",   pulse: "",                label: "Missed" },
  "on-hold":{ color: "var(--call-on-hold)",  pulse: "",                label: "On Hold" },
  ended:    { color: "#475569",              pulse: "",                label: "Ended" },
};

export default function CallIndicator({ status = "incoming", showLabel = false, size = "sm" }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ended;
  const dotSize = size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5";

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`${dotSize} rounded-full shrink-0 ${cfg.pulse}`}
        style={{ background: cfg.color }}
      />
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}
