/**
 * Device state: capabilities, identity, telemetry, and the write pipeline.
 * Telemetry polling is a cold stream — it only runs while a screen subscribes.
 */
import { create } from "zustand";
import { detectAdapter, nullIdentity, nullMap, nullTelemetry, type DeviceAdapter, type WriteRequest } from "@/features/device/adapter";
import type { CapabilityId, CapabilityMap, DeviceIdentity, Telemetry } from "@/features/device/types";
import { isBridgeAvailable } from "@/features/device/bridge";
import { log } from "./log-store";

export interface HistoryPoint {
  at: number;
  level: number | null;
  temperature: number | null;
  cpuFreq: number | null;
  current: number | null;
}

interface DeviceState {
  adapter: DeviceAdapter | null;
  bridge: boolean;
  status: "idle" | "probing" | "ready" | "error";
  capabilities: CapabilityMap;
  identity: DeviceIdentity;
  telemetry: Telemetry;
  history: HistoryPoint[];
  lastRefresh: number | null;
  subscribers: number;
  pending: Record<string, boolean>;

  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  subscribe: () => () => void;
  applyWrite: (request: WriteRequest) => Promise<boolean>;
  supports: (id: CapabilityId) => boolean;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
const POLL_MS = 2000;
const MAX_HISTORY = 720;

export const useDeviceStore = create<DeviceState>((set, get) => ({
  adapter: null,
  bridge: false,
  status: "idle",
  capabilities: nullMap("not-probed"),
  identity: nullIdentity("not-probed"),
  telemetry: nullTelemetry("not-probed"),
  history: [],
  lastRefresh: null,
  subscribers: 0,
  pending: {},

  supports: (id) => get().capabilities[id]?.supported === true,

  initialize: async () => {
    if (get().status === "probing") return;
    set({ status: "probing" });
    log.info("adapter", "Detecting device adapter…");
    try {
      const adapter = await detectAdapter();
      const capabilities = await adapter.probeCapabilities();
      const identity = await adapter.readIdentity();
      const supported = Object.values(capabilities).filter((c) => c.supported).length;
      set({
        adapter,
        capabilities,
        identity,
        bridge: isBridgeAvailable(),
        status: "ready",
      });
      log.success(
        "adapter",
        `Adapter "${adapter.kind}" ready — ${supported} capabilities available.`,
      );
      await get().refresh();
    } catch (error) {
      set({ status: "error" });
      log.error("adapter", "Capability probe failed.", String(error));
    }
  },

  refresh: async () => {
    const { adapter, capabilities } = get();
    if (!adapter) return;
    const telemetry = await adapter.readTelemetry(capabilities);
    set((state) => ({
      telemetry,
      lastRefresh: Date.now(),
      history: [
        ...state.history.slice(-(MAX_HISTORY - 1)),
        {
          at: Date.now(),
          level: telemetry.level.value,
          temperature: telemetry.temperature.value,
          cpuFreq: telemetry.cpuFreq.value,
          current: telemetry.current.value,
        },
      ],
    }));
  },

  /** Cold stream: the poll timer exists only while a screen is mounted. */
  subscribe: () => {
    set((state) => ({ subscribers: state.subscribers + 1 }));
    if (!pollTimer) {
      pollTimer = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        void get().refresh();
      }, POLL_MS);
    }
    return () => {
      const next = get().subscribers - 1;
      set({ subscribers: Math.max(0, next) });
      if (next <= 0 && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  },

  applyWrite: async (request) => {
    const { adapter, pending } = get();
    if (pending[request.id]) {
      log.warn("shell", `Ignored duplicate execution of "${request.label}".`);
      return false;
    }
    if (!adapter) {
      log.error("shell", "No adapter initialized.");
      return false;
    }

    set({ pending: { ...pending, [request.id]: true } });
    log.info("shell", `validate → execute → verify: ${request.label}`, `${request.node} = ${request.value}`);
    try {
      const outcome = await adapter.applyWrite(request);
      if (outcome.ok) {
        log.success("shell", outcome.message, `stage=${outcome.stage}`);
        await get().refresh();
      } else {
        log.error("shell", outcome.message, `stage=${outcome.stage}`);
      }
      return outcome.ok;
    } finally {
      const current = { ...get().pending };
      delete current[request.id];
      set({ pending: current });
    }
  },
}));
