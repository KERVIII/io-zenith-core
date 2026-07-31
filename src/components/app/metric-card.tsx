import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { REASON_TEXT, type Reading } from "@/features/device/types";
import { cn } from "@/lib/utils";

function formatValue(reading: Reading<number | string>, digits = 0): string {
  if (reading.value === null) return "—";
  if (typeof reading.value === "string") return reading.value;
  return reading.value.toFixed(digits);
}

/**
 * A single metric. Shows a real reading, or an explicit explanation of why the
 * value is unavailable. It never renders a placeholder number.
 */
export function MetricCard({
  label,
  reading,
  digits = 0,
  icon,
  className,
  footer,
}: {
  label: string;
  reading: Reading<number | string>;
  digits?: number;
  icon?: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  const available = reading.value !== null;
  const stale = available && Date.now() - reading.at > 15_000;

  return (
    <Card className={cn("border-border bg-card py-0", className)}>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
          {icon}
          <span className="flex-1">{label}</span>
          {!available && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  aria-label={`Why is ${label} unavailable?`}
                  className="rounded-full p-1"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-xs">
                  {REASON_TEXT[reading.reason ?? "not-probed"]}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <motion.span
            key={String(reading.value)}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              !available && "text-on-surface-variant",
            )}
            aria-live="polite"
          >
            {formatValue(reading, digits)}
          </motion.span>
          {available && reading.unit && (
            <span className="text-sm text-on-surface-variant">{reading.unit}</span>
          )}
        </div>

        {!available ? (
          <p className="text-[11px] leading-snug text-on-surface-variant">
            Unavailable — {REASON_TEXT[reading.reason ?? "not-probed"]}
          </p>
        ) : (
          <p className="text-[11px] text-on-surface-variant">
            {stale ? "Stale reading" : "Live"} · {reading.source ?? "device"}
          </p>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
