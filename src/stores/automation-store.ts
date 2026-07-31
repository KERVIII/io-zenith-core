/** Automation state — condition → action rules evaluated against telemetry. */
import { create } from "zustand";
import { loadPersisted, savePersisted, uid } from "./persist";

export type TriggerType =
  | "battery-below"
  | "battery-above"
  | "temperature-above"
  | "charging"
  | "screen-off"
  | "app-foreground";

export type ActionType = "apply-profile" | "set-charge-limit" | "thermal-guard" | "notify";

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  trigger: { type: TriggerType; value: string };
  action: { type: ActionType; value: string };
  lastFiredAt: number | null;
}

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  "battery-below": "Battery level below (%)",
  "battery-above": "Battery level above (%)",
  "temperature-above": "Battery temperature above (°C)",
  charging: "Charger state is",
  "screen-off": "Screen turns off",
  "app-foreground": "App in foreground (package)",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  "apply-profile": "Apply profile",
  "set-charge-limit": "Set charge limit (%)",
  "thermal-guard": "Engage thermal guard",
  notify: "Show notification",
};

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: "rule_charge_limit",
    name: "Cap charging at 80%",
    enabled: false,
    priority: 1,
    trigger: { type: "battery-above", value: "80" },
    action: { type: "set-charge-limit", value: "80" },
    lastFiredAt: null,
  },
  {
    id: "rule_thermal",
    name: "Thermal guard above 42°C",
    enabled: false,
    priority: 2,
    trigger: { type: "temperature-above", value: "42" },
    action: { type: "thermal-guard", value: "on" },
    lastFiredAt: null,
  },
  {
    id: "rule_screen_off",
    name: "Eco when the screen turns off",
    enabled: false,
    priority: 3,
    trigger: { type: "screen-off", value: "" },
    action: { type: "apply-profile", value: "eco" },
    lastFiredAt: null,
  },
  {
    id: "rule_game",
    name: "Gaming profile when a game is detected",
    enabled: false,
    priority: 4,
    trigger: { type: "app-foreground", value: "com.example.game" },
    action: { type: "apply-profile", value: "gaming" },
    lastFiredAt: null,
  },
];

interface AutomationState {
  rules: AutomationRule[];
  engineEnabled: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggleEngine: (value: boolean) => void;
  toggleRule: (id: string, value: boolean) => void;
  upsert: (rule: Omit<AutomationRule, "id" | "lastFiredAt"> & { id?: string }) => string;
  remove: (id: string) => void;
  reorder: (id: string, direction: -1 | 1) => void;
  markFired: (id: string) => void;
}

const KEY = "iobattery.automation";
type Snapshot = { rules: AutomationRule[]; engineEnabled: boolean };

function persist(state: AutomationState) {
  savePersisted<Snapshot>(KEY, { rules: state.rules, engineEnabled: state.engineEnabled });
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  rules: DEFAULT_RULES,
  engineEnabled: false,
  hydrated: false,

  hydrate: () => {
    const stored = loadPersisted<Snapshot>(KEY, { rules: DEFAULT_RULES, engineEnabled: false });
    set({ rules: stored.rules, engineEnabled: stored.engineEnabled, hydrated: true });
  },

  toggleEngine: (engineEnabled) => {
    set({ engineEnabled });
    persist(get());
  },

  toggleRule: (id, value) => {
    set((state) => ({
      rules: state.rules.map((rule) => (rule.id === id ? { ...rule, enabled: value } : rule)),
    }));
    persist(get());
  },

  upsert: (rule) => {
    const id = rule.id ?? uid("rule");
    set((state) => {
      const exists = state.rules.some((r) => r.id === id);
      return {
        rules: exists
          ? state.rules.map((r) => (r.id === id ? { ...r, ...rule, id } : r))
          : [...state.rules, { ...rule, id, lastFiredAt: null }],
      };
    });
    persist(get());
    return id;
  },

  remove: (id) => {
    set((state) => ({ rules: state.rules.filter((rule) => rule.id !== id) }));
    persist(get());
  },

  reorder: (id, direction) => {
    set((state) => {
      const sorted = [...state.rules].sort((a, b) => a.priority - b.priority);
      const index = sorted.findIndex((rule) => rule.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return state;
      const a = sorted[index]!;
      const b = sorted[target]!;
      const swapped = state.rules.map((rule) => {
        if (rule.id === a.id) return { ...rule, priority: b.priority };
        if (rule.id === b.id) return { ...rule, priority: a.priority };
        return rule;
      });
      return { rules: swapped };
    });
    persist(get());
  },

  markFired: (id) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === id ? { ...rule, lastFiredAt: Date.now() } : rule,
      ),
    }));
  },
}));
