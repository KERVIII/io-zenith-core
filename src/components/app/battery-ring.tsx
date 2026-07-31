import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type StatusTone = "healthy" | "warning" | "critical" | "unknown";

const TONE: Record<StatusTone, string> = {
  healthy: "text-status-healthy",
  warning: "text-status-warning",
  critical: "text-status-critical",
  unknown: "text-status-unknown",
};

/**
 * Battery ring. Renders an indeterminate dashed ring when the level is unknown
 * rather than defaulting to a fake 0%.
 */
export function BatteryRing({
  level,
  tone = "healthy",
  label,
  size = 168,
}: {
  level: number | null;
  tone?: StatusTone;
  label: string;
  size?: number;
}) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = level === null ? 0 : Math.max(0, Math.min(100, level));

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={level === null ? `${label}: unavailable` : `${label}: ${pct}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-container-high"
        />
        {level !== null ? (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={cn("stroke-current", TONE[tone])}
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray="6 10"
            className="stroke-status-unknown"
          />
        )}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-4xl font-semibold tabular-nums", TONE[tone])}>
          {level === null ? "—" : `${Math.round(pct)}`}
        </span>
        <span className="text-xs text-on-surface-variant">
          {level === null ? "unavailable" : "percent"}
        </span>
      </div>
    </div>
  );
}
