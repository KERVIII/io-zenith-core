import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, BookOpen, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceStore } from "@/stores/device-store";
import { analyzeDevice } from "@/features/ai/insight";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "IoMakima insights — IoBattery Pro" },
      {
        name: "description",
        content:
          "Deterministic analysis of your device: every insight cites the reading behind it, and missing data is reported as missing.",
      },
      { property: "og:title", content: "IoMakima insights — IoBattery Pro" },
      {
        property: "og:description",
        content: "Grounded device analysis with cited evidence, never guesses.",
      },
    ],
  }),
  component: AssistantScreen,
});

const TONE = {
  good: "text-status-healthy",
  warn: "text-status-warning",
  critical: "text-status-critical",
  unknown: "text-status-unknown",
  info: "text-primary",
} as const;

const LESSONS = [
  {
    title: "Why charge limits help",
    body: "Lithium cells age fastest at a high state of charge and high temperature. Holding at 80% instead of 100% measurably slows calendar ageing.",
  },
  {
    title: "What a CPU governor does",
    body: "The governor decides how quickly clocks ramp with load. schedutil follows the scheduler, powersave keeps clocks low, performance pins them high.",
  },
  {
    title: "Why some controls are hidden",
    body: "If your kernel does not expose a node, IoBattery Pro hides the control instead of showing a toggle that silently does nothing.",
  },
];

function AssistantScreen() {
  const telemetry = useDeviceStore((s) => s.telemetry);
  const capabilities = useDeviceStore((s) => s.capabilities);
  const history = useDeviceStore((s) => s.history);
  const insights = analyzeDevice(telemetry, capabilities, history);

  return (
    <AppShell title="IoMakima" back="/">
      <Card className="border-border bg-card py-0">
        <CardContent className="flex gap-3 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-snug text-on-surface-variant">
            IoMakima analyses only what your device actually reports. It cites the source for every
            statement and says "unavailable" rather than estimating a number.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-2" aria-labelledby="analysis">
        <h2 id="analysis" className="px-1 text-sm font-semibold">
          Current analysis
        </h2>
        {insights.map((insight) => (
          <Card key={insight.id} className="border-border bg-card py-0">
            <CardContent className="space-y-1.5 p-4">
              <div className="flex items-center gap-2">
                <Activity className={cn("h-4 w-4", TONE[insight.severity])} aria-hidden />
                <p className="text-sm font-medium">{insight.title}</p>
              </div>
              <p className="text-xs leading-snug text-on-surface-variant">{insight.body}</p>
              <p className="text-[11px] text-on-surface-variant">Evidence: {insight.evidence}</p>
              {insight.action && (
                <Button asChild size="sm" variant="outline" className="mt-1 min-h-11">
                  <Link to={insight.action.route}>{insight.action.label}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-2" aria-labelledby="learn">
        <h2 id="learn" className="flex items-center gap-2 px-1 text-sm font-semibold">
          <BookOpen className="h-4 w-4" aria-hidden />
          Learning center
        </h2>
        {LESSONS.map((lesson) => (
          <Card key={lesson.title} className="border-border bg-card py-0">
            <CardContent className="space-y-1 p-4">
              <p className="text-sm font-medium">{lesson.title}</p>
              <p className="text-xs leading-snug text-on-surface-variant">{lesson.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
