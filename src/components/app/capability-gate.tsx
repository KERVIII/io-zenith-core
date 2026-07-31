import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { REASON_TEXT, type CapabilityId } from "@/features/device/types";
import { useDeviceStore } from "@/stores/device-store";

/**
 * Renders `children` only when the device supports the capability. Otherwise
 * it explains why — an unsupported control is never shown as a dead toggle.
 */
export function CapabilityGate({
  capability,
  title,
  children,
}: {
  capability: CapabilityId;
  title: string;
  children: ReactNode;
}) {
  const cap = useDeviceStore((s) => s.capabilities[capability]);

  if (cap?.supported) return <>{children}</>;

  return (
    <Card className="border-dashed border-border bg-surface-container py-0">
      <CardContent className="flex gap-3 p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium">{title} is unavailable</p>
          <p className="text-xs leading-snug text-on-surface-variant">
            {REASON_TEXT[cap?.reason ?? "not-probed"]}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
