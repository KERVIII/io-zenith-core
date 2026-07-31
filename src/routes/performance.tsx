import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Cpu, Gauge, Thermometer } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/app/metric-card";
import { CapabilityGate } from "@/components/app/capability-gate";
import { Sparkline } from "@/components/app/sparkline";
import { ConfirmSheet } from "@/components/app/confirm-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Card as Panel } from "@/components/ui/card";
import { useDeviceStore } from "@/stores/device-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance & thermals — IoBattery Pro" },
      {
        name: "description",
        content:
          "Live CPU frequency, governor and thermal readings with a verified governor switch for rooted Android devices.",
      },
      { property: "og:title", content: "Performance & thermals — IoBattery Pro" },
      {
        property: "og:description",
        content: "Monitor CPU and thermals, then switch governors safely.",
      },
    ],
  }),
  component: PerformanceScreen,
});

const GOVERNOR_NODE = "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor";
const GOVERNORS = ["powersave", "conservative", "schedutil", "ondemand", "performance"] as const;

function PerformanceScreen() {
  const telemetry = useDeviceStore((s) => s.telemetry);
  const history = useDeviceStore((s) => s.history);
  const applyWrite = useDeviceStore((s) => s.applyWrite);
  const [target, setTarget] = useState<string | null>(null);

  const commit = async () => {
    if (!target) return;
    const ok = await applyWrite({
      id: "governor",
      label: `CPU governor → ${target}`,
      capability: "cpu.governor",
      node: GOVERNOR_NODE,
      value: target,
    });
    setTarget(null);
    if (ok) toast.success(`Governor set to ${target}.`);
    else toast.error("Governor write failed verification and was rolled back.");
  };

  return (
    <AppShell title="Performance" back="/">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="CPU frequency" reading={telemetry.cpuFreq} icon={<Cpu className="h-3.5 w-3.5" aria-hidden />} />
        <MetricCard label="CPU load" reading={telemetry.cpuLoad} digits={1} icon={<Gauge className="h-3.5 w-3.5" aria-hidden />} />
        <MetricCard label="Governor" reading={telemetry.governor} />
        <MetricCard label="Thermal zone" reading={telemetry.thermal} digits={1} icon={<Thermometer className="h-3.5 w-3.5" aria-hidden />} />
      </div>

      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Temperature trend</h2>
          <Sparkline points={history} metric="temperature" />
        </CardContent>
      </Card>

      <CapabilityGate capability="cpu.governor" title="CPU governor">
        <Panel className="border-border bg-card py-0">
          <CardContent className="space-y-3 p-4">
            <div>
              <h2 className="text-sm font-semibold">CPU governor</h2>
              <p className="text-xs text-on-surface-variant">
                Controls how aggressively the scheduler raises clocks. Written to{" "}
                <code className="text-[11px]">{GOVERNOR_NODE}</code>.
              </p>
            </div>
            <div className="grid gap-2">
              {GOVERNORS.map((governor) => {
                const active = telemetry.governor.value === governor;
                return (
                  <button
                    key={governor}
                    onClick={() => setTarget(governor)}
                    aria-pressed={active}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "border-border",
                    )}
                  >
                    {governor}
                    {active && <span className="ml-2 text-xs">· active</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Panel>
      </CapabilityGate>

      <CapabilityGate capability="thermal.profile" title="Thermal profile">
        <Card className="border-border bg-card py-0">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Thermal profile</h2>
            <p className="text-xs text-on-surface-variant">
              Relaxes or tightens the kernel throttling table. Gaming raises the ceiling; default
              restores stock behaviour.
            </p>
            <div className="flex gap-2">
              {[
                { label: "Default", value: "0" },
                { label: "Gaming", value: "10" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className="min-h-11 flex-1"
                  onClick={() =>
                    void applyWrite({
                      id: `thermal-${option.value}`,
                      label: `Thermal profile → ${option.label}`,
                      capability: "thermal.profile",
                      node: "/sys/class/thermal/thermal_message/sconfig",
                      value: option.value,
                    }).then((ok) =>
                      ok
                        ? toast.success(`Thermal profile: ${option.label}.`)
                        : toast.error("Thermal write rolled back."),
                    )
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </CapabilityGate>

      <ConfirmSheet
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title={`Switch CPU governor to ${target}?`}
        impact={[
          `Writes "${target}" to ${GOVERNOR_NODE}.`,
          target === "performance"
            ? "Clocks stay high: expect more heat and faster drain."
            : "Clock behaviour changes immediately across all policy cores.",
          "The previous governor is snapshotted and restored if read-back disagrees.",
        ]}
        confirmLabel="Switch"
        onConfirm={commit}
      />
    </AppShell>
  );
}
