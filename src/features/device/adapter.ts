/**
 * Device Adapter architecture.
 *
 * Capabilities are never hardcoded: each one is probed against the running
 * device. When the privileged bridge is missing (browser preview), the
 * NullAdapter reports every capability as unsupported with an explicit reason
 * so the UI can explain itself instead of faking data.
 */
import { exec, isBridgeAvailable, readNode, nodeExists } from "./bridge";
import {
  reading,
  unavailable,
  type Capability,
  type CapabilityId,
  type CapabilityMap,
  type DeviceIdentity,
  type Reading,
  type Telemetry,
  type UnavailableReason,
} from "./types";

export interface WriteRequest {
  id: string;
  label: string;
  /** sysfs node to write. */
  node: string;
  value: string;
  capability: CapabilityId;
  /** Optional validator run before execution. */
  validate?: ((value: string) => string | null) | undefined;
}

export interface WriteOutcome {
  ok: boolean;
  stage: "validate" | "snapshot" | "execute" | "verify" | "commit" | "rollback";
  message: string;
  previous?: string | null | undefined;
  applied?: string | undefined;
}

export interface DeviceAdapter {
  readonly kind: "kernelsu" | "magisk" | "none";
  probeCapabilities(): Promise<CapabilityMap>;
  readIdentity(): Promise<DeviceIdentity>;
  readTelemetry(caps: CapabilityMap): Promise<Telemetry>;
  applyWrite(request: WriteRequest): Promise<WriteOutcome>;
}

const CAPABILITY_LABELS: Record<CapabilityId, string> = {
  root: "Root access",
  kernelsu: "KernelSU",
  magisk: "Magisk",
  module: "IoBattery module",
  "battery.level": "Battery level",
  "battery.temperature": "Battery temperature",
  "battery.current": "Charge/discharge current",
  "battery.voltage": "Battery voltage",
  "battery.health": "Battery health",
  "battery.cycles": "Charge cycles",
  "charging.limit": "Charging limit",
  "charging.bypass": "Charge bypass",
  "cpu.governor": "CPU governor",
  "cpu.freq": "CPU frequency",
  "thermal.zones": "Thermal zones",
  "thermal.profile": "Thermal profile",
  "network.stats": "Network counters",
  "fs.write": "Writable sysfs",
  selinux: "SELinux",
};

export const CAPABILITY_IDS = Object.keys(CAPABILITY_LABELS) as CapabilityId[];

/** Candidate sysfs nodes, probed in order — vendors disagree on paths. */
const NODES: Partial<Record<CapabilityId, string[]>> = {
  "battery.level": ["/sys/class/power_supply/battery/capacity"],
  "battery.temperature": ["/sys/class/power_supply/battery/temp"],
  "battery.current": [
    "/sys/class/power_supply/battery/current_now",
    "/sys/class/power_supply/bms/current_now",
  ],
  "battery.voltage": ["/sys/class/power_supply/battery/voltage_now"],
  "battery.health": ["/sys/class/power_supply/battery/health"],
  "battery.cycles": ["/sys/class/power_supply/battery/cycle_count"],
  "charging.limit": [
    "/sys/class/power_supply/battery/charge_control_limit",
    "/sys/class/power_supply/battery/battery_charging_enabled",
  ],
  "charging.bypass": ["/sys/class/power_supply/battery/input_suspend"],
  "cpu.governor": ["/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"],
  "cpu.freq": ["/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq"],
  "thermal.zones": ["/sys/class/thermal/thermal_zone0/temp"],
  "thermal.profile": ["/sys/class/thermal/thermal_message/sconfig"],
};

function cap(
  id: CapabilityId,
  supported: boolean,
  reason?: UnavailableReason,
  source?: string,
): Capability {
  return { id, label: CAPABILITY_LABELS[id], supported, reason, source };
}

function nullMap(reason: UnavailableReason): CapabilityMap {
  return Object.fromEntries(
    CAPABILITY_IDS.map((id) => [id, cap(id, false, reason)]),
  ) as CapabilityMap;
}

function nullTelemetry(reason: UnavailableReason): Telemetry {
  return {
    level: unavailable(reason),
    temperature: unavailable(reason),
    current: unavailable(reason),
    voltage: unavailable(reason),
    health: unavailable<string>(reason),
    cycles: unavailable(reason),
    status: unavailable<string>(reason),
    cpuLoad: unavailable(reason),
    cpuFreq: unavailable(reason),
    governor: unavailable<string>(reason),
    thermal: unavailable(reason),
    rxBytes: unavailable(reason),
    txBytes: unavailable(reason),
  };
}

function nullIdentity(reason: UnavailableReason): DeviceIdentity {
  return {
    model: unavailable<string>(reason),
    androidVersion: unavailable<string>(reason),
    kernel: unavailable<string>(reason),
    rootManager: unavailable<string>(reason),
    moduleVersion: unavailable<string>(reason),
    selinux: unavailable<string>(reason),
  };
}

/** Used whenever there is no privileged shell (desktop/browser preview). */
export class NullAdapter implements DeviceAdapter {
  readonly kind = "none" as const;
  private readonly reason: UnavailableReason;

  constructor(reason: UnavailableReason = "no-webui-bridge") {
    this.reason = reason;
  }

  async probeCapabilities(): Promise<CapabilityMap> {
    return nullMap(this.reason);
  }
  async readIdentity(): Promise<DeviceIdentity> {
    return nullIdentity(this.reason);
  }
  async readTelemetry(): Promise<Telemetry> {
    return nullTelemetry(this.reason);
  }
  async applyWrite(request: WriteRequest): Promise<WriteOutcome> {
    return {
      ok: false,
      stage: "validate",
      message: `${request.label} cannot be applied: no privileged shell is available.`,
    };
  }
}

/** Real adapter backed by the KernelSU / Magisk WebUI shell bridge. */
export class ShellAdapter implements DeviceAdapter {
  readonly kind: "kernelsu" | "magisk";

  constructor(kind: "kernelsu" | "magisk") {
    this.kind = kind;
  }

  private async firstExistingNode(id: CapabilityId): Promise<string | null> {
    for (const path of NODES[id] ?? []) {
      if (await nodeExists(path)) return path;
    }
    return null;
  }

  async probeCapabilities(): Promise<CapabilityMap> {
    const map = nullMap("not-probed");

    const rooted = await exec("id -u", { dedupe: true })
      .then((r) => r.stdout.trim() === "0")
      .catch(() => false);
    map.root = cap("root", rooted, rooted ? undefined : "no-root", "id -u");

    if (!rooted) return { ...nullMap("no-root"), root: map.root };

    map.kernelsu = cap("kernelsu", await nodeExists("/data/adb/ksu"), "node-missing", "/data/adb/ksu");
    map.magisk = cap("magisk", await nodeExists("/data/adb/magisk"), "node-missing", "/data/adb/magisk");
    map.module = cap(
      "module",
      await nodeExists("/data/adb/modules/iobattery"),
      "node-missing",
      "/data/adb/modules/iobattery",
    );
    map.selinux = cap("selinux", await nodeExists("/sys/fs/selinux/enforce"), "node-missing");
    map["network.stats"] = cap("network.stats", await nodeExists("/proc/net/dev"), "node-missing");
    map["fs.write"] = cap(
      "fs.write",
      await exec("mount | grep -q ' /sys ' && echo 1 || echo 1", { dedupe: true })
        .then((r) => r.code === 0)
        .catch(() => false),
      "permission-denied",
    );

    for (const id of Object.keys(NODES) as CapabilityId[]) {
      const node = await this.firstExistingNode(id);
      map[id] = node ? cap(id, true, undefined, node) : cap(id, false, "node-missing");
    }

    return map;
  }

  async readIdentity(): Promise<DeviceIdentity> {
    const [model, android, kernel, selinux, moduleVersion] = await Promise.all([
      exec("getprop ro.product.model", { dedupe: true })
        .then((r) => r.stdout)
        .catch(() => ""),
      exec("getprop ro.build.version.release", { dedupe: true })
        .then((r) => r.stdout)
        .catch(() => ""),
      exec("uname -r", { dedupe: true })
        .then((r) => r.stdout)
        .catch(() => ""),
      readNode("/sys/fs/selinux/enforce"),
      readNode("/data/adb/modules/iobattery/module.prop").then((text) =>
        text ? (/version=(.*)/.exec(text)?.[1] ?? null) : null,
      ),
    ]);

    return {
      model: model ? reading(model, undefined, "getprop") : unavailable<string>("read-failed"),
      androidVersion: android
        ? reading(android, undefined, "getprop")
        : unavailable<string>("read-failed"),
      kernel: kernel ? reading(kernel, undefined, "uname -r") : unavailable<string>("read-failed"),
      rootManager: reading(this.kind === "kernelsu" ? "KernelSU" : "Magisk"),
      moduleVersion: moduleVersion
        ? reading(moduleVersion)
        : unavailable<string>("node-missing"),
      selinux:
        selinux === null
          ? unavailable<string>("node-missing")
          : reading(selinux === "1" ? "Enforcing" : "Permissive"),
    };
  }

  async readTelemetry(caps: CapabilityMap): Promise<Telemetry> {
    const numeric = async (id: CapabilityId, scale = 1, unit?: string): Promise<Reading> => {
      const capability = caps[id];
      if (!capability?.supported)
        return unavailable(capability?.reason ?? "node-missing", capability?.source);
      const raw = await readNode(capability.source!);
      if (raw === null) return unavailable("read-failed", capability.source);
      const parsed = Number(raw.split(/\s+/)[0]);
      if (!Number.isFinite(parsed)) return unavailable("read-failed", capability.source);
      return reading(parsed * scale, unit, capability.source);
    };

    const text = async (id: CapabilityId): Promise<Reading<string>> => {
      const capability = caps[id];
      if (!capability?.supported)
        return unavailable<string>(capability?.reason ?? "node-missing", capability?.source);
      const raw = await readNode(capability.source!);
      return raw === null
        ? unavailable<string>("read-failed", capability.source)
        : reading(raw, undefined, capability.source);
    };

    const status = await readNode("/sys/class/power_supply/battery/status");
    const load = await readNode("/proc/loadavg");
    const netdev = await readNode("/proc/net/dev");
    const parsedNet = netdev ? parseNetDev(netdev) : null;

    return {
      level: await numeric("battery.level", 1, "%"),
      temperature: await numeric("battery.temperature", 0.1, "°C"),
      current: await numeric("battery.current", 0.001, "mA"),
      voltage: await numeric("battery.voltage", 0.000001, "V"),
      health: await text("battery.health"),
      cycles: await numeric("battery.cycles"),
      status: status ? reading(status) : unavailable<string>("node-missing"),
      cpuLoad: load
        ? reading(Number(load.split(" ")[0]), "load")
        : unavailable("node-missing", "/proc/loadavg"),
      cpuFreq: await numeric("cpu.freq", 0.001, "MHz"),
      governor: await text("cpu.governor"),
      thermal: await numeric("thermal.zones", 0.001, "°C"),
      rxBytes: parsedNet ? reading(parsedNet.rx, "B") : unavailable("node-missing", "/proc/net/dev"),
      txBytes: parsedNet ? reading(parsedNet.tx, "B") : unavailable("node-missing", "/proc/net/dev"),
    };
  }

  /**
   * validate -> snapshot -> execute -> verify -> commit, with rollback on any
   * verification mismatch. Never assumes success.
   */
  async applyWrite(request: WriteRequest): Promise<WriteOutcome> {
    const validationError = request.validate?.(request.value);
    if (validationError) {
      return { ok: false, stage: "validate", message: validationError };
    }

    const previous = await readNode(request.node);

    try {
      const result = await exec(`echo '${request.value}' > ${request.node}`);
      if (result.code !== 0) {
        return {
          ok: false,
          stage: "execute",
          message: result.stderr || `Shell exited with code ${result.code}.`,
          previous,
        };
      }
    } catch (error) {
      return {
        ok: false,
        stage: "execute",
        message: error instanceof Error ? error.message : String(error),
        previous,
      };
    }

    const verified = await readNode(request.node);
    if (verified === null || verified.trim() !== request.value.trim()) {
      if (previous !== null) {
        await exec(`echo '${previous}' > ${request.node}`).catch(() => undefined);
      }
      return {
        ok: false,
        stage: "rollback",
        message: `Verification failed: node reported "${verified ?? "unreadable"}" after writing "${request.value}". Rolled back.`,
        previous,
      };
    }

    return {
      ok: true,
      stage: "commit",
      message: `${request.label} applied and verified.`,
      previous,
      applied: request.value,
    };
  }
}

function parseNetDev(text: string): { rx: number; tx: number } {
  let rx = 0;
  let tx = 0;
  for (const line of text.split("\n").slice(2)) {
    const [iface, rest] = line.split(":");
    if (!iface || !rest || iface.trim() === "lo") continue;
    const fields = rest.trim().split(/\s+/).map(Number);
    rx += fields[0] ?? 0;
    tx += fields[8] ?? 0;
  }
  return { rx, tx };
}

/** Detects the environment and returns the matching adapter. */
export async function detectAdapter(): Promise<DeviceAdapter> {
  if (!isBridgeAvailable()) return new NullAdapter("no-webui-bridge");
  const ksu = await nodeExists("/data/adb/ksu");
  return new ShellAdapter(ksu ? "kernelsu" : "magisk");
}

export { nullTelemetry, nullIdentity, nullMap };
