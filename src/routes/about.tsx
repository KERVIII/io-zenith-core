import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceStore } from "@/stores/device-store";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — IoBattery Pro" },
      {
        name: "description",
        content:
          "Module and device information, the no-fabricated-data policy, and how IoBattery Pro keeps every change reversible.",
      },
      { property: "og:title", content: "About — IoBattery Pro" },
      { property: "og:description", content: "Module info and the data-integrity policy." },
    ],
  }),
  component: AboutScreen,
});

function AboutScreen() {
  const identity = useDeviceStore((s) => s.identity);

  const rows = [
    ["Device model", identity.model.value],
    ["Android version", identity.androidVersion.value],
    ["Kernel", identity.kernel.value],
    ["Root manager", identity.rootManager.value],
    ["Module version", identity.moduleVersion.value],
    ["SELinux", identity.selinux.value],
  ] as const;

  return (
    <AppShell title="About" back="/">
      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Device</h2>
          <dl className="space-y-1.5 text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">{label}</dt>
                <dd className={value ? "font-medium" : "text-on-surface-variant"}>
                  {value ?? "Unavailable"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-2 p-4">
          <h2 className="text-sm font-semibold">Data integrity policy</h2>
          <p className="text-xs leading-snug text-on-surface-variant">
            IoBattery Pro never displays a fabricated value. If a kernel interface is missing, the
            metric reads "unavailable" and explains why. Every write is validated, snapshotted,
            verified by read-back and rolled back on mismatch. Nothing leaves your device.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
