/**
 * IoMakima — the intelligence layer.
 *
 * Deterministic analysis over live telemetry, capabilities and diagnostics.
 * It never invents a value: every insight cites the reading that produced it,
 * and when data is missing it says so instead of estimating.
 */
import type { CapabilityMap, Telemetry } from "@/features/device/types";
import type { HistoryPoint } from "@/stores/device-store";
import type { AutomationRule } from "@/stores/automation-store";

export type InsightSeverity = "info" | "good" | "warn" | "critical" | "unknown";

export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  /** The exact source that backs this statement. */
  evidence: string;
  action?: { label: string; route: string } | undefined;
}

export function analyzeDevice(
  telemetry: Telemetry,
  caps: CapabilityMap,
  history: HistoryPoint[],
): Insight[] {
  const insights: Insight[] = [];

  const temp = telemetry.temperature;
  if (temp.value === null) {
    insights.push({
      id: "temp-unknown",
      title: "Battery temperature is unavailable",
      body: "I cannot judge thermal safety without a temperature reading, so I will not estimate one.",
      severity: "unknown",
      evidence: temp.source ?? "no thermal source",
    });
  } else if (temp.value >= 43) {
    insights.push({
      id: "temp-high",
      title: `Battery is running hot at ${temp.value.toFixed(1)} °C`,
      body: "Sustained temperatures above 43 °C accelerate capacity loss. A thermal guard rule would cap load automatically.",
      severity: "critical",
      evidence: temp.source ?? "battery temperature node",
      action: { label: "Create thermal rule", route: "/automation" },
    });
  } else if (temp.value >= 38) {
    insights.push({
      id: "temp-warm",
      title: `Battery at ${temp.value.toFixed(1)} °C`,
      body: "Warm but within a safe band. No action needed unless it keeps climbing under load.",
      severity: "warn",
      evidence: temp.source ?? "battery temperature node",
    });
  } else {
    insights.push({
      id: "temp-ok",
      title: `Thermals healthy at ${temp.value.toFixed(1)} °C`,
      body: "Temperature is inside the optimal operating window.",
      severity: "good",
      evidence: temp.source ?? "battery temperature node",
    });
  }

  const level = telemetry.level;
  if (level.value !== null && level.value >= 85 && telemetry.status.value === "Charging") {
    insights.push({
      id: "charge-high",
      title: "Charging above 85%",
      body: "Long periods at a high state of charge age the cell. A charge limit keeps it near 80%.",
      severity: "warn",
      evidence: `${level.source ?? "capacity node"} + charging status`,
      action: { label: "Set a charge limit", route: "/battery" },
    });
  }

  const governor = telemetry.governor;
  if (governor.value === "performance") {
    insights.push({
      id: "gov-perf",
      title: "CPU governor is set to performance",
      body: "Great for frame stability, costly for idle drain. Consider switching back after gaming.",
      severity: "warn",
      evidence: governor.source ?? "scaling_governor",
      action: { label: "Open performance", route: "/performance" },
    });
  }

  const drain = estimateDrainPerHour(history);
  if (drain !== null) {
    insights.push({
      id: "drain",
      title: `Measured drain: ${drain.toFixed(1)} %/h`,
      body: "Derived from level samples collected in this session only — not a prediction.",
      severity: drain > 15 ? "warn" : "good",
      evidence: `${history.length} in-session samples`,
    });
  } else {
    insights.push({
      id: "drain-unknown",
      title: "Not enough history for a drain figure",
      body: "I need several minutes of level samples before reporting a drain rate. Nothing is estimated in the meantime.",
      severity: "unknown",
      evidence: `${history.length} samples collected`,
    });
  }

  const unsupported = Object.values(caps).filter((c) => !c.supported);
  if (unsupported.length > 0) {
    insights.push({
      id: "caps",
      title: `${unsupported.length} capabilities are unavailable on this device`,
      body: "Controls that depend on them are hidden rather than shown as toggles that cannot work.",
      severity: "info",
      evidence: unsupported
        .slice(0, 4)
        .map((c) => c.label)
        .join(", "),
      action: { label: "Run Device Doctor", route: "/doctor" },
    });
  }

  return insights;
}

/** Suggests automation rules that are backed by observed values only. */
export function suggestAutomation(
  telemetry: Telemetry,
  existing: AutomationRule[],
): Array<{ name: string; reason: string }> {
  const suggestions: Array<{ name: string; reason: string }> = [];
  const has = (fragment: string) =>
    existing.some((rule) => rule.name.toLowerCase().includes(fragment));

  if (telemetry.temperature.value !== null && telemetry.temperature.value >= 40 && !has("thermal")) {
    suggestions.push({
      name: "Thermal guard above 42°C",
      reason: `Measured ${telemetry.temperature.value.toFixed(1)} °C this session.`,
    });
  }
  if (telemetry.level.value !== null && telemetry.level.value >= 90 && !has("cap charging")) {
    suggestions.push({
      name: "Cap charging at 80%",
      reason: `Battery reached ${telemetry.level.value}% while charging.`,
    });
  }
  return suggestions;
}

export function estimateDrainPerHour(history: HistoryPoint[]): number | null {
  const points = history.filter((p) => p.level !== null);
  if (points.length < 6) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const hours = (last.at - first.at) / 3_600_000;
  if (hours <= 0) return null;
  const delta = (first.level ?? 0) - (last.level ?? 0);
  if (delta <= 0) return null;
  return delta / hours;
}

/** Natural-language search across app destinations and telemetry facts. */
export interface SearchResult {
  type: "screen" | "setting" | "metric" | "doc";
  label: string;
  detail: string;
  route: string;
}

export function searchApp(query: string, telemetry: Telemetry): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const index: SearchResult[] = [
    { type: "screen", label: "Dashboard", detail: "Device overview and health verdict", route: "/" },
    { type: "screen", label: "Battery", detail: "Level, charging limit, health", route: "/battery" },
    { type: "screen", label: "Performance", detail: "Governor, frequency, thermals", route: "/performance" },
    { type: "screen", label: "Network", detail: "Interface counters", route: "/network" },
    { type: "screen", label: "Profiles", detail: "Eco, Balanced, Gaming, Extreme, custom", route: "/profiles" },
    { type: "screen", label: "Automation", detail: "Condition → action rules", route: "/automation" },
    { type: "screen", label: "Device Doctor", detail: "Diagnostics and one-tap repair", route: "/doctor" },
    { type: "screen", label: "IoMakima", detail: "Analysis, suggestions, learning centre", route: "/assistant" },
    { type: "screen", label: "Developer Console", detail: "Shell logs, filters, export", route: "/logs" },
    { type: "screen", label: "Backup & Restore", detail: "Restore points and exports", route: "/backup" },
    { type: "screen", label: "Settings", detail: "Theme, density, accessibility", route: "/settings" },
    { type: "screen", label: "About", detail: "Version, licences, module info", route: "/about" },
    { type: "setting", label: "Charge limit", detail: "Cap the maximum state of charge", route: "/battery" },
    { type: "setting", label: "CPU governor", detail: "Scheduler frequency policy", route: "/performance" },
    { type: "setting", label: "Theme", detail: "Six built-in themes", route: "/settings" },
  ];

  const metricResults: SearchResult[] = [
    {
      type: "metric",
      label: "Battery level",
      detail:
        telemetry.level.value === null
          ? "Unavailable on this device"
          : `${telemetry.level.value}%`,
      route: "/battery",
    },
    {
      type: "metric",
      label: "Temperature",
      detail:
        telemetry.temperature.value === null
          ? "Unavailable on this device"
          : `${telemetry.temperature.value.toFixed(1)} °C`,
      route: "/battery",
    },
  ];

  return [...index, ...metricResults].filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.detail.toLowerCase().includes(q) ||
      item.type.includes(q),
  );
}
