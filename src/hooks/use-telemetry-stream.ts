import { useEffect } from "react";
import { useDeviceStore } from "@/stores/device-store";

/**
 * Cold telemetry stream. Polling exists only while at least one screen is
 * mounted with `enabled`, and is paused when the tab is hidden.
 */
export function useTelemetryStream(enabled = true) {
  const initialize = useDeviceStore((s) => s.initialize);
  const status = useDeviceStore((s) => s.status);
  const subscribe = useDeviceStore((s) => s.subscribe);

  useEffect(() => {
    if (status === "idle") void initialize();
  }, [status, initialize]);

  useEffect(() => {
    if (!enabled) return;
    return subscribe();
  }, [enabled, subscribe]);
}
