import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  BatteryCharging,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Cpu,
  Gauge,
  GraduationCap,
  ScrollText,
  Star,
  Stethoscope,
  Thermometer,
  Workflow,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { BatteryRing, type StatusTone } from "@/components/app/battery-ring";
import { MetricCard } from "@/components/app/metric-card";
import { Sparkline } from "@/components/app/sparkline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceStore } from "@/stores/device-store";
import { useProfileStore } from "@/stores/profile-store";
import { useAppStore } from "@/stores/app-store";
import { useLogStore } from "@/stores/log-store";
import { analyzeDevice } from "@/features/ai/insight";
import { computeHealthScore } from "@/features/health/score";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IoBattery Pro — Device Control Center" },
      {
        name: "description",
        content:
          "Monitor battery, thermals and CPU from real kernel interfaces, apply verified optimization profiles, and diagnose your rooted Android device.",
      },
      { property: "og:title", content: "IoBattery Pro — Device Control Center" },
      {
        property: "og:description",
        content:
          "Real telemetry, reversible optimizations and one-tap diagnostics for KernelSU and Magisk devices.",
      },
    ],
  }),
  component: Dashboard,
});

function verdict(level: number | null, temp: number | null): { tone: StatusTone; text: string } {
  if (level === null && temp === null)
    return { tone: "unknown", text: "Telemetry unavailable — no privileged shell attached" };
  if (temp !== null && temp >= 43) return { tone: "critical", text: "Running hot — reduce load" };
  if (level !== null && level < 15) return { tone: "warning", text: "Battery low" };
  if (temp !== null && temp >= 38) return { tone: "warning", text: "Warm but within safe limits" };
  return { tone: "healthy", text: "Device is healthy" };
}

const TONE_ICON = {
  healthy: CircleCheck,
  warning: CircleAlert,
  critical: CircleAlert,
  unknown: CircleHelp,
} as const;

function Dashboard() {
  const telemetry = useDeviceStore((s) => s.telemetry);
  const history = useDeviceStore((s) => s.history);
  const capabilities = useDeviceStore((s) => s.capabilities);
  const identity = useDeviceStore((s) => s.identity);
  const bridge = useDeviceStore((s) => s.bridge);
  const profiles = useProfileStore((s) => s.profiles);
  const activeId = useProfileStore((s) => s.activeId);
  const favorites = useAppStore((s) => s.favorites);

  const active = profiles.find((p) => p.id === activeId);
  const state = verdict(telemetry.level.value, telemetry.temperature.value);
  const Icon = TONE_ICON[state.tone];
  const insights = analyzeDevice(telemetry, capabilities, history).slice(0, 2);

  return (
    <AppShell title="Dashboard">
      {!bridge && (
        <Card className="border-status-warning/40 bg-status-warning/10 py-0">
          <CardContent className="flex items-start gap-3 p-4">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" aria-hidden />
            <div>
              <p className="text-sm font-medium">Running without a privileged shell</p>
              <p className="text-xs text-on-surface-variant">
                Open this page from the KernelSU or Magisk WebUI to read live device values. Until
                then every metric reports as unavailable — no placeholder numbers are shown.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status hero */}
      <Card className="overflow-hidden border-border bg-card py-0">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <BatteryRing level={telemetry.level.value} tone={state.tone} label="Battery level" />
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon className={cn("h-4 w-4", `text-status-${state.tone}`)} aria-hidden />
            <span>{state.text}</span>
          </div>
          <p className="text-xs text-on-surface-variant">
            {identity.model.value ?? "Device model unavailable"} ·{" "}
            {telemetry.status.value ?? "charging state unavailable"}
          </p>
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <Button asChild className="min-h-11 flex-1">
              <Link to="/profiles">
                <Zap className="mr-1.5 h-4 w-4" aria-hidden />
                {active ? `Profile: ${active.name}` : "Choose a profile"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/doctor">Run diagnostics</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics */}
      <section aria-labelledby="metrics-heading" className="space-y-2">
        <h2 id="metrics-heading" className="px-1 text-sm font-semibold">
          Live metrics
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Temperature"
            reading={telemetry.temperature}
            digits={1}
            icon={<Thermometer className="h-3.5 w-3.5" aria-hidden />}
          />
          <MetricCard
            label="Current"
            reading={telemetry.current}
            icon={<BatteryCharging className="h-3.5 w-3.5" aria-hidden />}
          />
          <MetricCard
            label="CPU frequency"
            reading={telemetry.cpuFreq}
            icon={<Cpu className="h-3.5 w-3.5" aria-hidden />}
          />
          <MetricCard
            label="Governor"
            reading={telemetry.governor}
            icon={<Gauge className="h-3.5 w-3.5" aria-hidden />}
          />
        </div>
      </section>

      {/* Trend */}
      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Battery trend (this session)</h2>
          <Sparkline points={history} metric="level" />
        </CardContent>
      </Card>

      {/* Insights */}
      <section aria-labelledby="insights-heading" className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 id="insights-heading" className="text-sm font-semibold">
            IoMakima insights
          </h2>
          <Link to="/assistant" className="text-xs text-primary">
            See all
          </Link>
        </div>
        {insights.map((insight) => (
          <motion.div key={insight.id} layout>
            <Card className="border-border bg-card py-0">
              <CardContent className="space-y-1 p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-primary" aria-hidden />
                  <p className="text-sm font-medium">{insight.title}</p>
                </div>
                <p className="text-xs leading-snug text-on-surface-variant">{insight.body}</p>
                <p className="text-[11px] text-on-surface-variant">Source: {insight.evidence}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section aria-labelledby="fav-heading" className="space-y-2">
          <h2 id="fav-heading" className="px-1 text-sm font-semibold">
            Favorites
          </h2>
          <div className="flex flex-wrap gap-2">
            {favorites.map((route) => (
              <Button key={route} asChild variant="secondary" size="sm" className="min-h-11">
                <Link to={route}>
                  <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  {route.replace("/", "") || "dashboard"}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
