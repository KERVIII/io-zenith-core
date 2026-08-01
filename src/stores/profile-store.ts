/**
 * Profile state — portable, schema-versioned JSON profiles.
 * A profile is a declarative set of target values; applying one runs each
 * setting through the device write pipeline.
 */
import { create } from "zustand";
import type { CapabilityId } from "@/features/device/types";
import { loadPersisted, savePersisted, uid } from "./persist";

export const PROFILE_SCHEMA_VERSION = 1;

export interface ProfileSetting {
  capability: CapabilityId;
  node: string;
  value: string;
  label: string;
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  icon: "leaf" | "scale" | "gamepad" | "zap" | "sliders";
  settings: ProfileSetting[];
  createdAt: number;
}

const BUILT_IN: Profile[] = [
  {
    id: "eco",
    name: "Eco",
    description: "Longest runtime. Conservative governor, capped charge, aggressive thermal guard.",
    builtIn: true,
    icon: "leaf",
    createdAt: 0,
    settings: [
      {
        capability: "cpu.governor",
        node: "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
        value: "powersave",
        label: "CPU governor → powersave",
      },
      {
        capability: "charging.limit",
        node: "/sys/class/power_supply/battery/charge_control_limit",
        value: "80",
        label: "Charge limit → 80%",
      },
    ],
  },
  {
    id: "balanced",
    name: "Balanced",
    description: "Stock behaviour with charge protection. The safe default.",
    builtIn: true,
    icon: "scale",
    createdAt: 0,
    settings: [
      {
        capability: "cpu.governor",
        node: "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
        value: "schedutil",
        label: "CPU governor → schedutil",
      },
      {
        capability: "charging.limit",
        node: "/sys/class/power_supply/battery/charge_control_limit",
        value: "90",
        label: "Charge limit → 90%",
      },
    ],
  },
  {
    id: "gaming",
    name: "Gaming",
    description: "Frame stability first: performance governor and thermal headroom.",
    builtIn: true,
    icon: "gamepad",
    createdAt: 0,
    settings: [
      {
        capability: "cpu.governor",
        node: "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
        value: "performance",
        label: "CPU governor → performance",
      },
      {
        capability: "thermal.profile",
        node: "/sys/class/thermal/thermal_message/sconfig",
        value: "10",
        label: "Thermal profile → gaming",
      },
    ],
  },
  {
    id: "extreme",
    name: "Extreme",
    description: "Maximum throughput, no charge cap. Expect heat and drain.",
    builtIn: true,
    icon: "zap",
    createdAt: 0,
    settings: [
      {
        capability: "cpu.governor",
        node: "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
        value: "performance",
        label: "CPU governor → performance",
      },
      {
        capability: "charging.limit",
        node: "/sys/class/power_supply/battery/charge_control_limit",
        value: "100",
        label: "Charge limit → 100%",
      },
    ],
  },
];

interface ProfileState {
  profiles: Profile[];
  activeId: string | null;
  autoSwitch: boolean;
  hydrated: boolean;
  hydrate: () => void;
  setActive: (id: string) => void;
  create: (profile: Omit<Profile, "id" | "builtIn" | "createdAt">) => string;
  update: (id: string, patch: Partial<Profile>) => void;
  duplicate: (id: string) => string | null;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  importProfile: (json: string) => { ok: boolean; message: string };
  exportProfile: (id: string) => string | null;
  setAutoSwitch: (value: boolean) => void;
}

const KEY = "iobattery.profiles";

type Snapshot = { profiles: Profile[]; activeId: string | null; autoSwitch: boolean };

function persist(state: ProfileState) {
  savePersisted<Snapshot>(KEY, {
    profiles: state.profiles,
    activeId: state.activeId,
    autoSwitch: state.autoSwitch,
  });
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: BUILT_IN,
  activeId: null,
  autoSwitch: false,
  hydrated: false,

  hydrate: () => {
    const stored = loadPersisted<Partial<Snapshot>>(KEY, {
      profiles: BUILT_IN,
      activeId: null,
      autoSwitch: false,
    });
    const custom = Array.isArray(stored?.profiles)
      ? stored.profiles.filter((p) => p && typeof p.id === "string" && !p.builtIn)
      : [];
    const profiles = [...BUILT_IN, ...custom];
    const activeId =
      typeof stored?.activeId === "string" && profiles.some((p) => p.id === stored.activeId)
        ? stored.activeId
        : null;
    set({
      profiles,
      activeId,
      autoSwitch: Boolean(stored?.autoSwitch),
      hydrated: true,
    });
  },


  setActive: (activeId) => {
    set({ activeId });
    persist(get());
  },

  create: (profile) => {
    const id = uid("profile");
    set((state) => ({
      profiles: [...state.profiles, { ...profile, id, builtIn: false, createdAt: Date.now() }],
    }));
    persist(get());
    return id;
  },

  update: (id, patch) => {
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...patch, id, builtIn: p.builtIn } : p)),
    }));
    persist(get());
  },

  duplicate: (id) => {
    const source = get().profiles.find((p) => p.id === id);
    if (!source) return null;
    const newId = uid("profile");
    set((state) => ({
      profiles: [
        ...state.profiles,
        {
          ...source,
          id: newId,
          name: `${source.name} copy`,
          builtIn: false,
          createdAt: Date.now(),
        },
      ],
    }));
    persist(get());
    return newId;
  },

  rename: (id, name) => {
    get().update(id, { name });
  },

  remove: (id) => {
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id || p.builtIn),
      activeId: state.activeId === id ? null : state.activeId,
    }));
    persist(get());
  },

  exportProfile: (id) => {
    const profile = get().profiles.find((p) => p.id === id);
    if (!profile) return null;
    return JSON.stringify({ schemaVersion: PROFILE_SCHEMA_VERSION, profile }, null, 2);
  },

  importProfile: (json) => {
    try {
      const parsed = JSON.parse(json) as { schemaVersion?: number; profile?: Profile };
      if (parsed.schemaVersion !== PROFILE_SCHEMA_VERSION || !parsed.profile) {
        return { ok: false, message: "Unsupported or malformed profile schema." };
      }
      const profile = parsed.profile;
      if (!Array.isArray(profile.settings) || typeof profile.name !== "string") {
        return { ok: false, message: "Profile is missing required fields." };
      }
      get().create({
        name: profile.name,
        description: profile.description ?? "Imported profile",
        icon: profile.icon ?? "sliders",
        settings: profile.settings,
      });
      return { ok: true, message: `Imported "${profile.name}".` };
    } catch (error) {
      return { ok: false, message: `Invalid JSON: ${String(error)}` };
    }
  },

  setAutoSwitch: (autoSwitch) => {
    set({ autoSwitch });
    persist(get());
  },
}));
