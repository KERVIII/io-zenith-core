import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { MetricCard } from "@/components/app/metric-card";
import { CapabilityGate } from "@/components/app/capability-gate";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceStore } from "@/stores/device-store";
import { reading, unavailable } from "@/features/device/types";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Network counters — IoBattery Pro" },
      {
        name: "description",
        content:
          "Read cumulative interface receive and transmit counters straight from the kernel, with no estimated throughput.",
      },
      { property: "og:title", content: "Network counters — IoBattery Pro" },
      {
        property: "og:description",
        content: "Kernel interface counters for rooted Android devices.",
      },
    ],
  }),
  component: NetworkScreen,
});

function toMiB(bytes: number) {
  return bytes / (1024 * 1024);
}

function NetworkScreen() {
  const telemetry = useDeviceStore((s) => s.telemetry);

  const rx =
    telemetry.rxBytes.value === null
      ? unavailable<number>(telemetry.rxBytes.reason ?? "not-probed", telemetry.rxBytes.source)
      : reading(toMiB(telemetry.rxBytes.value), "MiB", telemetry.rxBytes.source);
  const tx =
    telemetry.txBytes.value === null
      ? unavailable<number>(telemetry.txBytes.reason ?? "not-probed", telemetry.txBytes.source)
      : reading(toMiB(telemetry.txBytes.value), "MiB", telemetry.txBytes.source);

  return (
    <AppShell title="Network" back="/">
      <CapabilityGate capability="network.stats" title="Interface counters">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Received"
            reading={rx}
            digits={1}
            icon={<ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />}
          />
          <MetricCard
            label="Transmitted"
            reading={tx}
            digits={1}
            icon={<ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden />}
          />
        </div>
      </CapabilityGate>

      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-1 p-4">
          <h2 className="text-sm font-semibold">Why there is no live speed graph</h2>
          <p className="text-xs leading-snug text-on-surface-variant">
            The kernel exposes cumulative byte counters, not throughput. A speed figure would be a
            derived guess between two polls, so IoBattery Pro reports the counters themselves and
            leaves interpretation to you.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
