import { useEffect, useRef } from "react";
import { useAutomationStore, type AutomationRule } from "@/stores/automation-store";
import { useDeviceStore } from "@/stores/device-store";
import { useProfileStore } from "@/stores/profile-store";
import { log } from "@/stores/log-store";
import type { Telemetry } from "@/features/device/types";

const COOLDOWN_MS = 60_000;

/** Returns true only when the trigger can be evaluated against real data. */
function matches(rule: AutomationRule, telemetry: Telemetry, screenOff: boolean): boolean {
  const { type, value } = rule.trigger;
  const threshold = Number(value);
  switch (type) {
    case "battery-below":
      return telemetry.level.value !== null && telemetry.level.value < threshold;
    case "battery-above":
      return telemetry.level.value !== null && telemetry.level.value > threshold;
    case "temperature-above":
      return telemetry.temperature.value !== null && telemetry.temperature.value > threshold;
    case "charging":
      return telemetry.status.value !== null &&
        telemetry.status.value.toLowerCase().includes(value.toLowerCase());
    case "screen-off":
      return screenOff;
    case "app-foreground":
      // Requires usage access; never guessed.
      return false;
    default:
      return false;
  }
}

/**
 * Evaluates automation rules against live telemetry, highest priority first.
 * Rules only fire when their trigger is backed by a real reading.
 */
export function useAutomationEngine() {
  const engineEnabled = useAutomationStore((s) => s.engineEnabled);
  const rules = useAutomationStore((s) => s.rules);
  const markFired = useAutomationStore((s) => s.markFired);
  const telemetry = useDeviceStore((s) => s.telemetry);
  const applyWrite = useDeviceStore((s) => s.applyWrite);
  const setActive = useProfileStore((s) => s.setActive);
  const profiles = useProfileStore((s) => s.profiles);
  const lastFired = useRef<Record<string, number>>({});
  const screenOff = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      screenOff.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!engineEnabled) return;
    const ordered = [...rules].filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

    for (const rule of ordered) {
      if (!matches(rule, telemetry, screenOff.current)) continue;
      const previous = lastFired.current[rule.id] ?? 0;
      if (Date.now() - previous < COOLDOWN_MS) continue;
      lastFired.current[rule.id] = Date.now();
      markFired(rule.id);

      const { type, value } = rule.action;
      if (type === "apply-profile") {
        const profile = profiles.find((p) => p.id === value || p.name.toLowerCase() === value);
        if (profile) {
          setActive(profile.id);
          log.info("automation", `Rule "${rule.name}" applied profile ${profile.name}.`);
        } else {
          log.warn("automation", `Rule "${rule.name}" references a missing profile.`);
        }
      } else if (type === "set-charge-limit") {
        void applyWrite({
          id: `automation-${rule.id}`,
          label: `Automation: charge limit ${value}%`,
          capability: "charging.limit",
          node: "/sys/class/power_supply/battery/charge_control_limit",
          value,
        });
      } else if (type === "thermal-guard") {
        void applyWrite({
          id: `automation-${rule.id}`,
          label: `Automation: thermal guard`,
          capability: "thermal.profile",
          node: "/sys/class/thermal/thermal_message/sconfig",
          value: "0",
        });
      } else {
        log.info("automation", `Rule "${rule.name}" fired: ${value}`);
      }
      break; // one action per evaluation pass keeps writes serialized
    }
  }, [engineEnabled, rules, telemetry, markFired, applyWrite, setActive, profiles]);
}
