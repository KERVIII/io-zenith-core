/**
 * Learning centre content + progress state.
 *
 * Lessons are authored, versioned content that ships with the app — they are
 * documentation, not device telemetry, so they are legitimately static. Every
 * lesson has a plain-language body and an advanced body for power users.
 */
import { create } from "zustand";
import { loadPersisted, savePersisted } from "./persist";

export type LessonCategory =
  | "Battery"
  | "Charging"
  | "Thermals"
  | "CPU"
  | "GPU"
  | "Root"
  | "Optimization";

export interface Lesson {
  id: string;
  title: string;
  category: LessonCategory;
  minutes: number;
  summary: string;
  /** Plain-language explanation. */
  basic: string[];
  /** Deeper detail: sysfs nodes, kernel behaviour, trade-offs. */
  advanced: string[];
  keywords: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: "battery-health",
    title: "What battery health actually measures",
    category: "Battery",
    minutes: 4,
    summary: "Design capacity versus the charge your cell can still hold today.",
    basic: [
      "A battery's health is the ratio between the energy it can hold now and the energy it could hold when it left the factory.",
      "Lithium cells lose capacity through calendar ageing (simply getting older) and cycle ageing (charge/discharge passes). Heat accelerates both.",
      "A phone at 85% health after two years is normal. A sudden drop usually means a bad reading, not a bad cell.",
    ],
    advanced: [
      "Android exposes health through /sys/class/power_supply/battery/. `charge_full` and `charge_full_design` (µAh) give the capacity ratio; `cycle_count` is maintained by the fuel gauge, not the OS.",
      "Many vendors report a smoothed or clamped value. If charge_full never moves, the gauge is estimating, and health percentages derived from it should be treated as indicative only.",
      "A full 0→100 learning cycle lets the gauge recalibrate. Doing this often is worse for the cell than the calibration is worth.",
    ],
    keywords: ["capacity", "cycle count", "degradation", "charge_full"],
  },
  {
    id: "charging-myths",
    title: "Charging myths, retired",
    category: "Charging",
    minutes: 5,
    summary: "Overnight charging, 100%, and whether fast charging kills cells.",
    basic: [
      "You cannot overcharge a modern phone. The charger stops at full and the phone then runs from the wall.",
      "Sitting at 100% at high temperature is the real stressor — not the act of charging overnight in a cool room.",
      "Keeping the charge between roughly 20% and 80% measurably slows ageing, which is exactly what a charge limit does for you.",
    ],
    advanced: [
      "High state-of-charge raises cathode potential, accelerating electrolyte oxidation. The damage scales with both voltage and temperature, which is why 100% + heat is the worst combination.",
      "Fast charging is mostly harmless while the cell is cool: charge current tapers in CV phase anyway. The harm comes from the thermal load, so a device that throttles charge current when warm is protecting the cell correctly.",
      "Charge-limit nodes vary by vendor: battery/charge_control_limit, battery/batt_slate_mode, or a bypass switch. Always verify the write took effect by reading the node back.",
    ],
    keywords: ["overnight", "80 percent", "fast charging", "charge limit"],
  },
  {
    id: "thermal-basics",
    title: "How thermal throttling protects your phone",
    category: "Thermals",
    minutes: 4,
    summary: "Why sustained performance drops, and why that is the system working.",
    basic: [
      "Phones have no fans. The only way to shed heat is through the frame and screen, so sustained heavy load always ends in reduced clocks.",
      "Throttling is a protection, not a defect. Blocking it damages the battery and shortens the life of the SoC.",
      "If your device gets hot while idle, that is a software problem — a wakelock or a runaway process — not a thermal one.",
    ],
    advanced: [
      "Thermal zones live in /sys/class/thermal/thermal_zone*/ with a `type` and `temp` (usually milli-degrees C). Vendors expose dozens; only a few map to real sensors of interest (skin, battery, cpu-cluster).",
      "Thermal HAL profiles change the trip-point table rather than disabling protection. Choosing a cooler profile lowers the trip points, trading peak clocks for sustained ones.",
      "Battery temperature above ~43 °C during charging is a strong signal to cut charge current, and most kernels already do so.",
    ],
    keywords: ["throttle", "thermal zone", "temperature", "heat"],
  },
  {
    id: "cpu-governors",
    title: "CPU governors and frequency scaling",
    category: "CPU",
    minutes: 6,
    summary: "What schedutil, performance, and powersave really change.",
    basic: [
      "A governor decides how quickly your CPU ramps up when you touch the screen and how quickly it calms back down.",
      "`schedutil` is the modern default and is right for almost everyone — it takes its cue from the scheduler itself.",
      "`performance` pins clocks high. It rarely feels faster in daily use, but it always costs battery and heat.",
    ],
    advanced: [
      "Governors are per-policy: /sys/devices/system/cpu/cpufreq/policy*/scaling_governor, with allowed values in scaling_available_governors.",
      "schedutil derives frequency from per-CPU utilisation signals (PELT), so it reacts in the scheduler tick rather than a sampling window — lower latency than the legacy interactive governor it replaced.",
      "Clamping scaling_max_freq on the big cluster is usually a better efficiency lever than switching governor, because it caps the least efficient part of the frequency/voltage curve.",
    ],
    keywords: ["schedutil", "governor", "frequency", "scaling"],
  },
  {
    id: "gpu-load",
    title: "Reading GPU load and gaming performance",
    category: "GPU",
    minutes: 4,
    summary: "Frame pacing beats peak clocks for how a game actually feels.",
    basic: [
      "A steady 60 fps feels far better than a game that swings between 90 and 45.",
      "Sustained GPU load heats the device quickly, so a gaming profile should manage heat, not just raise limits.",
      "Lowering resolution scale usually buys more smoothness than any system tweak.",
    ],
    advanced: [
      "Adreno exposes load through /sys/class/kgsl/kgsl-3d0/gpubusy and gpuclk; Mali uses devfreq under /sys/class/devfreq/*.gpu/.",
      "GPU devfreq governors (simple_ondemand, msm-adreno-tz) target a busy-time ratio. Raising min_freq stabilises frame pacing at a real power cost.",
      "Frame drops that correlate with a big-cluster frequency dip are a CPU-bound render thread, not a GPU limit.",
    ],
    keywords: ["fps", "gaming", "adreno", "mali", "devfreq"],
  },
  {
    id: "root-kernelsu",
    title: "KernelSU, Magisk and APatch compared",
    category: "Root",
    minutes: 6,
    summary: "Three ways to get privileged access, with different trade-offs.",
    basic: [
      "Magisk patches the boot ramdisk from user space; it is the most widely supported and the easiest to revert.",
      "KernelSU builds the root manager into the kernel itself, which makes it harder to detect and more robust — but it needs a compatible kernel.",
      "APatch patches the kernel image directly, sitting between the two in both capability and risk.",
    ],
    advanced: [
      "KernelSU gates su by uid allow-list in kernel space and provides its own overlayfs-based module system; WebUI modules receive a JS bridge with exec privileges.",
      "Magisk's magic mount uses bind mounts over /system; it is user-space, so it is visible to mount-namespace inspection unless DenyList is configured.",
      "All three break Play Integrity's strong verdict. Any claim otherwise is a temporary workaround, not a property of the tool.",
    ],
    keywords: ["magisk", "kernelsu", "apatch", "su", "root"],
  },
  {
    id: "android-optimization",
    title: "Optimising Android without breaking it",
    category: "Optimization",
    minutes: 5,
    summary: "What actually helps, and what is cargo cult.",
    basic: [
      "RAM cleaners and 'boosters' hurt: Android deliberately keeps apps in memory, and killing them forces expensive cold starts.",
      "The two changes that genuinely help are limiting charge level and keeping the device cool.",
      "Fewer background sync accounts and fewer always-on radios beat any kernel tweak.",
    ],
    advanced: [
      "lmkd already manages memory pressure with PSI signals; manual killing only churns the page cache.",
      "Doze and App Standby buckets do most of the idle-drain work. Wakelock inspection (`dumpsys power`) finds the true offenders.",
      "Any sysfs write should be reversible and verified by read-back; unverified writes are how people brick a boot cycle.",
    ],
    keywords: ["ram", "booster", "doze", "wakelock", "background"],
  },
  {
    id: "performance-tuning",
    title: "Safe performance tuning workflow",
    category: "Optimization",
    minutes: 5,
    summary: "Measure, change one thing, verify, keep a way back.",
    basic: [
      "Record a baseline before you change anything, or you cannot tell whether a tweak helped.",
      "Change exactly one setting at a time and use the device normally for a day.",
      "Keep a restore point. If a change makes things worse, revert it rather than stacking another tweak on top.",
    ],
    advanced: [
      "Every write in this app runs validate → execute → verify: the node is checked for existence and permitted values, written, then read back before the change is reported as applied.",
      "Prefer profile-level changes over ad-hoc node writes so the whole set can be reverted atomically.",
      "Session recordings in Live Monitoring give you before/after series for temperature and drain rate — the only honest way to judge a tweak.",
    ],
    keywords: ["baseline", "tuning", "verify", "restore point"],
  },
];

interface LearnState {
  bookmarks: string[];
  completed: string[];
  recent: string[];
  advanced: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggleBookmark: (id: string) => void;
  toggleCompleted: (id: string) => void;
  markVisited: (id: string) => void;
  setAdvanced: (value: boolean) => void;
}

const KEY = "iobattery.learn";

interface Persisted {
  bookmarks: string[];
  completed: string[];
  recent: string[];
  advanced: boolean;
}

const EMPTY: Persisted = { bookmarks: [], completed: [], recent: [], advanced: false };

function sanitize(value: Persisted): Persisted {
  const ids = new Set(LESSONS.map((l) => l.id));
  const list = (input: unknown) =>
    Array.isArray(input) ? input.filter((id): id is string => typeof id === "string" && ids.has(id)) : [];
  return {
    bookmarks: list(value?.bookmarks),
    completed: list(value?.completed),
    recent: list(value?.recent).slice(0, 6),
    advanced: value?.advanced === true,
  };
}

export const useLearnStore = create<LearnState>((set, get) => {
  const persist = () => {
    const { bookmarks, completed, recent, advanced } = get();
    savePersisted<Persisted>(KEY, { bookmarks, completed, recent, advanced });
  };

  return {
    ...EMPTY,
    hydrated: false,
    hydrate: () => {
      if (get().hydrated) return;
      set({ ...sanitize(loadPersisted<Persisted>(KEY, EMPTY)), hydrated: true });
    },
    toggleBookmark: (id) => {
      set((s) => ({
        bookmarks: s.bookmarks.includes(id)
          ? s.bookmarks.filter((x) => x !== id)
          : [...s.bookmarks, id],
      }));
      persist();
    },
    toggleCompleted: (id) => {
      set((s) => ({
        completed: s.completed.includes(id)
          ? s.completed.filter((x) => x !== id)
          : [...s.completed, id],
      }));
      persist();
    },
    markVisited: (id) => {
      set((s) => ({ recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 6) }));
      persist();
    },
    setAdvanced: (advanced) => {
      set({ advanced });
      persist();
    },
  };
});
