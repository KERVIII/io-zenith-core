/**
 * Device Doctor — diagnostics engine.
 *
 * Each check owns its own probe, verdict, explanation, recommendation and
 * optional one-tap fix. Checks report "unknown" rather than guessing when the
 * underlying interface cannot be read.
 */
import { exec, isBridgeAvailable, nodeExists, readNode } from "@/features/device/bridge";
import type { CapabilityMap } from "@/features/device/types";

export type DoctorStatus = "pass" | "warn" | "fail" | "unknown";

export interface DoctorFinding {
  id: string;
  title: string;
  category: "environment" | "interfaces" | "system";
  status: DoctorStatus;
  detail: string;
  recommendation: string;
  /** Route the user can jump to for the manual fix. */
  fixRoute?: string | undefined;
  /** Shell repair; returns a human-readable result. */
  fix?: (() => Promise<string>) | undefined;
}

export interface DoctorCheck {
  id: string;
  title: string;
  category: DoctorFinding["category"];
  run: (caps: CapabilityMap) => Promise<Omit<DoctorFinding, "id" | "title" | "category">>;
}

const bridgeMissing = (what: string) => ({
  status: "unknown" as const,
  detail: `${what} could not be verified because no privileged WebUI shell is attached to this session.`,
  recommendation: "Open IoBattery Pro from the KernelSU or Magisk manager WebUI on the device.",
});

export const DOCTOR_CHECKS: DoctorCheck[] = [
  {
    id: "root",
    title: "Root access",
    category: "environment",
    run: async () => {
      if (!isBridgeAvailable()) return bridgeMissing("Root access");
      const result = await exec("id -u", { dedupe: true }).catch(() => null);
      const rooted = result?.stdout.trim() === "0";
      return {
        status: rooted ? "pass" : "fail",
        detail: rooted
          ? "The module shell runs as uid 0."
          : `Shell reported uid ${result?.stdout ?? "unknown"}.`,
        recommendation: rooted
          ? "No action required."
          : "Grant the WebUI root permission in your root manager.",
      };
    },
  },
  {
    id: "kernelsu",
    title: "KernelSU",
    category: "environment",
    run: async () => {
      if (!isBridgeAvailable()) return bridgeMissing("KernelSU");
      const present = await nodeExists("/data/adb/ksu");
      return {
        status: present ? "pass" : "warn",
        detail: present ? "KernelSU installation detected." : "No KernelSU installation found.",
        recommendation: present ? "No action required." : "Magisk is also supported; see the Magisk check.",
      };
    },
  },
  {
    id: "magisk",
    title: "Magisk",
    category: "environment",
    run: async () => {
      if (!isBridgeAvailable()) return bridgeMissing("Magisk");
      const present = await nodeExists("/data/adb/magisk");
      return {
        status: present ? "pass" : "warn",
        detail: present ? "Magisk installation detected." : "No Magisk installation found.",
        recommendation: present ? "No action required." : "KernelSU is also supported.",
      };
    },
  },
  {
    id: "module",
    title: "IoBattery module",
    category: "environment",
    run: async () => {
      if (!isBridgeAvailable()) return bridgeMissing("The IoBattery module");
      const present = await nodeExists("/data/adb/modules/iobattery");
      const disabled = await nodeExists("/data/adb/modules/iobattery/disable");
      return {
        status: present && !disabled ? "pass" : present ? "warn" : "fail",
        detail: !present
          ? "Module directory /data/adb/modules/iobattery is missing."
          : disabled
            ? "The module is installed but disabled."
            : "Module installed and enabled.",
        recommendation: !present
          ? "Reinstall the IoBattery module ZIP and reboot."
          : disabled
            ? "Re-enable the module, then reboot."
            : "No action required.",
        fix: disabled
          ? async () => {
              const r = await exec("rm -f /data/adb/modules/iobattery/disable");
              return r.code === 0 ? "Module re-enabled. Reboot to apply." : r.stderr;
            }
          : undefined,
      };
    },
  },
  {
    id: "permissions",
    title: "Permission set",
    category: "environment",
    run: async () => {
      if (!isBridgeAvailable()) return bridgeMissing("Module permissions");
      const r = await exec("ls -ld /data/adb/modules/iobattery", { dedupe: true }).catch(() => null);
      return {
        status: r && r.code === 0 ? "pass" : "warn",
        detail: r?.stdout || "Module directory could not be listed.",
        recommendation:
          r && r.code === 0 ? "No action required." : "Verify the module installed correctly.",
      };
    },
  },
  {
    id: "charging",
    title: "Charging interface",
    category: "interfaces",
    run: async (caps) => interfaceVerdict(caps, "charging.limit", "charge control", "/battery"),
  },
  {
    id: "battery",
    title: "Battery interface",
    category: "interfaces",
    run: async (caps) => interfaceVerdict(caps, "battery.level", "battery readings", "/battery"),
  },
  {
    id: "thermal",
    title: "Thermal interface",
    category: "interfaces",
    run: async (caps) => interfaceVerdict(caps, "thermal.zones", "thermal zones", "/performance"),
  },
  {
    id: "governor",
    title: "Governor detection",
    category: "interfaces",
    run: async (caps) => {
      const capability = caps["cpu.governor"];
      if (!capability?.supported) {
        return {
          status: "unknown",
          detail: "The CPU governor node was not found on this kernel.",
          recommendation: "Governor tuning will stay hidden on this device.",
          fixRoute: "/performance",
        };
      }
      const current = await readNode(capability.source!);
      return {
        status: current ? "pass" : "warn",
        detail: current ? `Active governor: ${current}.` : "Governor node exists but returned no value.",
        recommendation: current ? "No action required." : "Re-run the scan after a reboot.",
        fixRoute: "/performance",
      };
    },
  },
  {
    id: "filesystem",
    title: "Filesystem",
    category: "system",
    run: async () => {
      if (!isBridgeAvailable()) return bridgeMissing("The filesystem");
      const r = await exec("df -h /data | tail -1", { dedupe: true }).catch(() => null);
      return {
        status: r && r.code === 0 ? "pass" : "unknown",
        detail: r?.stdout || "Could not query /data usage.",
        recommendation: "Keep at least 1 GB free for logs and backups.",
      };
    },
  },
  {
    id: "selinux",
    title: "SELinux",
    category: "system",
    run: async () => {
      if (!isBridgeAvailable()) return bridgeMissing("SELinux");
      const value = await readNode("/sys/fs/selinux/enforce");
      if (value === null)
        return {
          status: "unknown",
          detail: "SELinux state node is not readable.",
          recommendation: "No action required, but policy state cannot be confirmed.",
        };
      const enforcing = value.trim() === "1";
      return {
        status: enforcing ? "pass" : "warn",
        detail: enforcing ? "SELinux is Enforcing." : "SELinux is Permissive.",
        recommendation: enforcing
          ? "No action required."
          : "Permissive mode weakens system isolation; restore Enforcing when possible.",
      };
    },
  },
];

async function interfaceVerdict(
  caps: CapabilityMap,
  id: keyof CapabilityMap,
  label: string,
  route: string,
): Promise<Omit<DoctorFinding, "id" | "title" | "category">> {
  const capability = caps[id];
  if (capability?.supported) {
    return {
      status: "pass",
      detail: `Backed by ${capability.source}.`,
      recommendation: "No action required.",
      fixRoute: route,
    };
  }
  return {
    status: capability?.reason === "no-webui-bridge" ? "unknown" : "warn",
    detail: `No usable node for ${label} was found on this device.`,
    recommendation: `Features depending on ${label} are hidden rather than shown as broken toggles.`,
    fixRoute: route,
  };
}
