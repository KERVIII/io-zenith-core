import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BatteryCharging, HeartPulse, RotateCcw, Thermometer, Zap } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/app/metric-card";
import { CapabilityGate } from "@/components/app/capability-gate";
import { Sparkline } from "@/components/app/sparkline";
import { ConfirmSheet } from "@/components/app/confirm-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useDeviceStore } from "@/stores/device-store";

export const Route = createFileRoute("/battery")({
  head: () => ({
    meta: [
      { title: "Battery & charging — IoBattery Pro" },
      {
        name: "description",
        content:
          "Read real battery level, temperature, current, voltage, health and cycles, and cap charging through a verified write pipeline.",
      },
      { property: "og:title", content: "Battery & charging — IoBattery Pro" },
      {
        property: "og:description",
        content: "Live battery telemetry and a reversible charge limit control.",
      },
    ],
  }),
  component: BatteryScreen,
});

const CHARGE_NODE = "/sys/class/power_supply/battery/charge_control_limit";

function BatteryScreen() {
  const telemetry = useDeviceStore((s) => s.telemetry);
  const history = useDeviceStore((s) => s.history);
  const applyWrite = useDeviceStore((s) => s.applyWrite);
  const pending = useDeviceStore((s) => s.pending);
  const [limit, setLimit] = useState(80);
  const [confirming, setConfirming] = useState(false);

  const applyLimit = async () => {
    const ok = await applyWrite({
      id: "charge-limit",
      label: `Charge limit → ${limit}%`,
      capability: "charging.limit",
      node: CHARGE_NODE,
      value: String(limit),
    });
    setConfirming(false);
    if (ok) toast.success(`Charging capped at ${limit}%.`);
    else toast.error("The write could not be verified and was rolled back.");
  };

  return (
    <AppShell title="Battery" back="/">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Level" reading={telemetry.level} icon={<BatteryCharging className="h-3.5 w-3.5" aria-hidden />} />
        <MetricCard label="Temperature" reading={telemetry.temperature} digits={1} icon={<Thermometer className="h-3.5 w-3.5" aria-hidden />} />
        <MetricCard label="Current" reading={telemetry.current} icon={<Zap className="h-3.5 w-3.5" aria-hidden />} />
        <MetricCard label="Voltage" reading={telemetry.voltage} digits={2} />
        <MetricCard label="Health" reading={telemetry.health} icon={<HeartPulse className="h-3.5 w-3.5" aria-hidden />} />
        <MetricCard label="Charge cycles" reading={telemetry.cycles} />
      </div>

      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Level over this session</h2>
          <Sparkline points={history} metric="level" />
        </CardContent>
      </Card>

      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Temperature over this session</h2>
          <Sparkline points={history} metric="temperature" />
        </CardContent>
      </Card>

      <CapabilityGate capability="charging.limit" title="Charge limit">
        <Card className="border-border bg-card py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-sm font-semibold">Charge limit</h2>
              <p className="text-xs text-on-surface-variant">
                Stops charging at the chosen level to slow calendar ageing. Written to{" "}
                <code className="text-[11px]">{CHARGE_NODE}</code> and verified by read-back.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[limit]}
                min={50}
                max={100}
                step={5}
                onValueChange={([value]) => setLimit(value ?? 80)}
                aria-label="Charge limit percentage"
                className="flex-1"
              />
              <span className="w-12 text-right text-sm font-semibold tabular-nums">{limit}%</span>
            </div>
            <Button
              className="min-h-11 w-full"
              disabled={pending["charge-limit"]}
              onClick={() => setConfirming(true)}
            >
              {pending["charge-limit"] ? "Applying…" : "Apply charge limit"}
            </Button>
          </CardContent>
        </Card>
      </CapabilityGate>

      <CapabilityGate capability="charging.bypass" title="Charging bypass">
        <Card className="border-border bg-card py-0">
          <CardContent className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Charging bypass</h2>
            <p className="text-xs text-on-surface-variant">
              Powers the device directly from the charger, leaving the cell untouched during long
              gaming sessions.
            </p>
            <Button
              variant="outline"
              className="min-h-11 w-full"
              onClick={() =>
                void applyWrite({
                  id: "charge-bypass",
                  label: "Charging bypass → on",
                  capability: "charging.bypass",
                  node: "/sys/class/power_supply/battery/input_suspend",
                  value: "1",
                }).then((ok) =>
                  ok ? toast.success("Bypass engaged.") : toast.error("Bypass write rolled back."),
                )
              }
            >
              <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
              Engage bypass
            </Button>
          </CardContent>
        </Card>
      </CapabilityGate>

      <ConfirmSheet
        open={confirming}
        onOpenChange={setConfirming}
        title={`Cap charging at ${limit}%?`}
        impact={[
          `Writes ${limit} to ${CHARGE_NODE}.`,
          "The current node value is snapshotted first and restored if verification fails.",
          "Your device will stop charging above this level until you change it.",
        ]}
        confirmLabel="Apply"
        onConfirm={applyLimit}
      />
    </AppShell>
  );
}
