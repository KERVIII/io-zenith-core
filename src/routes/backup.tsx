import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import { useAutomationStore } from "@/stores/automation-store";

export const Route = createFileRoute("/backup")({
  head: () => ({
    meta: [
      { title: "Backup & restore — IoBattery Pro" },
      {
        name: "description",
        content:
          "Create restore points of your profiles and automation rules, export them as portable JSON, and roll back safely.",
      },
      { property: "og:title", content: "Backup & restore — IoBattery Pro" },
      { property: "og:description", content: "Restore points and portable configuration exports." },
    ],
  }),
  component: BackupScreen,
});

function BackupScreen() {
  const restorePoints = useAppStore((s) => s.restorePoints);
  const addRestorePoint = useAppStore((s) => s.addRestorePoint);
  const removeRestorePoint = useAppStore((s) => s.removeRestorePoint);
  const profiles = useProfileStore((s) => s.profiles);
  const rules = useAutomationStore((s) => s.rules);

  const snapshot = () =>
    JSON.stringify({ schemaVersion: 1, profiles: profiles.filter((p) => !p.builtIn), rules }, null, 2);

  return (
    <AppShell title="Backup & restore" back="/">
      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Create a restore point</h2>
          <p className="text-xs text-on-surface-variant">
            Captures your custom profiles and automation rules. System values are re-read from the
            device on restore rather than trusted from the snapshot.
          </p>
          <div className="flex gap-2">
            <Button
              className="min-h-11 flex-1"
              onClick={() => {
                addRestorePoint(`Snapshot ${new Date().toLocaleString()}`, snapshot());
                toast.success("Restore point created.");
              }}
            >
              <Archive className="mr-1.5 h-4 w-4" aria-hidden />
              Create
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                const blob = new Blob([snapshot()], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "iobattery-backup.json";
                anchor.click();
                URL.revokeObjectURL(url);
                toast.success("Backup exported.");
              }}
            >
              Export file
            </Button>
          </div>
        </CardContent>
      </Card>

      {restorePoints.length === 0 ? (
        <p className="px-1 text-xs text-on-surface-variant">No restore points yet.</p>
      ) : (
        restorePoints.map((point) => (
          <Card key={point.id} className="border-border bg-card py-0">
            <CardContent className="flex items-center gap-3 p-4">
              <RotateCcw className="h-4 w-4 text-primary" aria-hidden />
              <div className="flex-1">
                <p className="text-sm font-medium">{point.label}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {new Date(point.at).toLocaleString()} · {point.payload.length} bytes
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11 text-status-critical"
                aria-label={`Delete ${point.label}`}
                onClick={() => removeRestorePoint(point.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </AppShell>
  );
}
