import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/stores/app-store";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Permission center — IoBattery Pro" },
      {
        name: "description",
        content:
          "Review every permission IoBattery Pro uses, the exact reason it is needed, and grant or revoke each one.",
      },
      { property: "og:title", content: "Permission center — IoBattery Pro" },
      { property: "og:description", content: "Least-privilege permissions with clear rationale." },
    ],
  }),
  component: PermissionsScreen,
});

function PermissionsScreen() {
  const permissions = useAppStore((s) => s.permissions);
  const setPermission = useAppStore((s) => s.setPermission);

  return (
    <AppShell title="Permission center" back="/">
      {permissions.map((permission) => (
        <Card key={permission.id} className="border-border bg-card py-0">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex-1">
              <p className="text-sm font-medium">{permission.label}</p>
              <p className="text-xs leading-snug text-on-surface-variant">{permission.rationale}</p>
            </div>
            <Switch
              checked={permission.granted}
              onCheckedChange={(value) => setPermission(permission.id, value)}
              aria-label={`Grant ${permission.label}`}
            />
          </CardContent>
        </Card>
      ))}
    </AppShell>
  );
}
