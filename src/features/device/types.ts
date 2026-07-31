/**
 * Core domain types for the device abstraction layer.
 *
 * Rule from the PRD: the UI never invents a value. Every reading is either a
 * real number sourced from the device, or `null` with a machine-readable
 * `reason` describing why it is unavailable.
 */

export type CapabilityId =
  | "root"
  | "kernelsu"
  | "magisk"
  | "module"
  | "battery.level"
  | "battery.temperature"
  | "battery.current"
  | "battery.voltage"
  | "battery.health"
  | "battery.cycles"
  | "charging.limit"
  | "charging.bypass"
  | "cpu.governor"
  | "cpu.freq"
  | "thermal.zones"
  | "thermal.profile"
  | "network.stats"
  | "fs.write"
  | "selinux";

export type UnavailableReason =
  | "no-webui-bridge"
  | "no-root"
  | "node-missing"
  | "permission-denied"
  | "not-probed"
  | "read-failed";

export const REASON_TEXT: Record<UnavailableReason, string> = {
  "no-webui-bridge":
    "This build is not running inside the KernelSU/Magisk WebUI, so no privileged shell is reachable.",
  "no-root": "Root access was not granted to this module.",
  "node-missing": "The kernel on this device does not expose the required sysfs node.",
  "permission-denied": "The shell returned a permission error while reading this interface.",
  "not-probed": "Not probed yet. Run a capability scan.",
  "read-failed": "The interface exists but returned an unparsable value.",
};

export interface Capability {
  id: CapabilityId;
  label: string;
  supported: boolean;
  /** Present only when `supported` is false. */
  reason?: UnavailableReason | undefined;
  /** sysfs node or command backing this capability, when known. */
  source?: string | undefined;
}

export type CapabilityMap = Record<CapabilityId, Capability>;

/** A telemetry reading: value or an explicit explanation of its absence. */
export interface Reading<T = number> {
  value: T | null;
  unit?: string | undefined;
  reason?: UnavailableReason | undefined;
  source?: string | undefined;
  /** Epoch ms of the read that produced this value. */
  at: number;
}

export interface Telemetry {
  level: Reading;
  temperature: Reading;
  current: Reading;
  voltage: Reading;
  health: Reading<string>;
  cycles: Reading;
  status: Reading<string>;
  cpuLoad: Reading;
  cpuFreq: Reading;
  governor: Reading<string>;
  thermal: Reading;
  rxBytes: Reading;
  txBytes: Reading;
}

export interface DeviceIdentity {
  model: Reading<string>;
  androidVersion: Reading<string>;
  kernel: Reading<string>;
  rootManager: Reading<string>;
  moduleVersion: Reading<string>;
  selinux: Reading<string>;
}

export interface ShellResult {
  command: string;
  code: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export class ShellUnavailableError extends Error {
  readonly reason: UnavailableReason;
  constructor(reason: UnavailableReason = "no-webui-bridge") {
    super(REASON_TEXT[reason]);
    this.name = "ShellUnavailableError";
    this.reason = reason;
  }
}

export function unavailable<T = number>(reason: UnavailableReason, source?: string): Reading<T> {
  return { value: null, reason, source, at: Date.now() };
}

export function reading<T>(value: T, unit?: string, source?: string): Reading<T> {
  return { value, unit, source, at: Date.now() };
}
