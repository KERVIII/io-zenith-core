/**
 * Device health score.
 *
 * Deterministic scoring over real readings only. Any factor whose source
 * reading is unavailable is excluded from the score and reported as such —
 * the score is never padded with assumed values, and when nothing can be read
 * the score itself is null.
 */
import type { Telemetry } from "@/features/device/types";
import type { HistoryPoint } from "@/stores/device-store";

export type ScoreTone = "healthy" | "warning" | "critical" | "unknown";

export interface HealthFactor {
  id: string;
  label: string;
  /** 0-100 for this factor, or null when its source reading is unavailable. */
  score: number | null;
  detail: string;
}

export interface HealthScore {
  /** 0-100, or null when no factor could be measured. */
  value: number | null;
  tone: ScoreTone;
  headline: string;
  factors: HealthFactor[];
  measured: number;
  total: number;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeHealthScore(
  telemetry: Telemetry,
  history: HistoryPoint[],
): HealthScore {
  const factors: HealthFactor[] = [];

  const temp = telemetry.temperature.value;
  factors.push({
    id: "thermal",
    label: "Thermals",
    score:
      temp === null
        ? null
        : temp <= 32
          ? 100
          : clamp(100 - (temp - 32) * 7),
    detail:
      temp === null
        ? "Temperature sensor unavailable"
        : `${temp.toFixed(1)} °C battery temperature`,
  });

  const level = telemetry.level.value;
  factors.push({
    id: "charge",
    label: "Charge level",
    score:
      level === null
        ? null
        : level >= 40
          ? 100
          : level >= 20
            ? 80
            : clamp(level * 3),
    detail: level === null ? "Battery level unavailable" : `${level}% remaining`,
  });

  const current = telemetry.current.value;
  factors.push({
    id: "drain",
    label: "Drain rate",
    score:
      current === null
        ? null
        : clamp(100 - Math.max(0, Math.abs(current) - 300) / 20),
    detail:
      current === null
        ? "Current sensor unavailable"
        : `${Math.round(current)} mA instantaneous`,
  });

  // Stability: how much temperature moved across the samples we actually have.
  const temps = history.map((p) => p.temperature).filter((t): t is number => t !== null);
  const stability =
    temps.length < 4
      ? null
      : clamp(100 - (Math.max(...temps) - Math.min(...temps)) * 8);
  factors.push({
    id: "stability",
    label: "Thermal stability",
    score: stability,
    detail:
      stability === null
        ? "Not enough samples yet this session"
        : `${(Math.max(...temps) - Math.min(...temps)).toFixed(1)} °C swing over ${temps.length} samples`,
  });

  const measured = factors.filter((f) => f.score !== null);
  if (measured.length === 0) {
    return {
      value: null,
      tone: "unknown",
      headline: "No readings available",
      factors,
      measured: 0,
      total: factors.length,
    };
  }

  const value = clamp(
    measured.reduce((sum, f) => sum + (f.score ?? 0), 0) / measured.length,
  );
  const tone: ScoreTone = value >= 80 ? "healthy" : value >= 55 ? "warning" : "critical";
  const headline =
    tone === "healthy"
      ? "Device is running well"
      : tone === "warning"
        ? "Some factors need attention"
        : "Device is under stress";

  return { value, tone, headline, factors, measured: measured.length, total: factors.length };
}
