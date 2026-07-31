import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { HistoryPoint } from "@/stores/device-store";

/** Sparkline over real in-session samples. Renders nothing fake when empty. */
export function Sparkline({
  points,
  metric,
  className,
  height = 48,
}: {
  points: HistoryPoint[];
  metric: "level" | "temperature";
  className?: string;
  height?: number;
}) {
  const values = points
    .map((p) => p[metric])
    .filter((v): v is number => typeof v === "number");

  if (values.length < 2) {
    return (
      <p className={cn("text-xs text-on-surface-variant", className)}>
        Collecting samples — a trend appears once at least two real readings exist.
      </p>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(100 - ((v - min) / span) * 100).toFixed(2)}`)
    .join(" ");

  return (
    <figure className={className}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full"
        role="img"
        aria-label={`${metric} trend from ${min.toFixed(1)} to ${max.toFixed(1)} across ${values.length} samples`}
      >
        <motion.path
          d={path}
          fill="none"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className="stroke-primary"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      </svg>
      <figcaption className="text-[11px] text-on-surface-variant">
        {values.length} samples · min {min.toFixed(1)} · max {max.toFixed(1)}
      </figcaption>
    </figure>
  );
}
