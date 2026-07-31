/** App/UI state: onboarding progress, permissions, favorites, backup points. */
import { create } from "zustand";
import { loadPersisted, savePersisted, uid } from "./persist";

export interface PermissionState {
  id: "root" | "storage" | "notifications" | "usage-access";
  label: string;
  rationale: string;
  granted: boolean;
}

export interface RestorePoint {
  id: string;
  label: string;
  at: number;
  payload: string;
}

interface AppState {
  onboardingComplete: boolean;
  onboardingStep: number;
  permissions: PermissionState[];
  favorites: string[];
  restorePoints: RestorePoint[];
  hydrated: boolean;
  hydrate: () => void;
  setStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setPermission: (id: PermissionState["id"], granted: boolean) => void;
  toggleFavorite: (route: string) => void;
  addRestorePoint: (label: string, payload: string) => void;
  removeRestorePoint: (id: string) => void;
}

const DEFAULT_PERMISSIONS: PermissionState[] = [
  {
    id: "root",
    label: "Privileged shell",
    rationale: "Required to read kernel interfaces and apply optimization settings.",
    granted: false,
  },
  {
    id: "storage",
    label: "Storage",
    rationale: "Used only to export logs, profiles and backups you explicitly share.",
    granted: false,
  },
  {
    id: "notifications",
    label: "Notifications",
    rationale: "Alerts you when an automation rule fires or a write is rolled back.",
    granted: false,
  },
  {
    id: "usage-access",
    label: "Usage access",
    rationale: "Needed only for foreground-app automation triggers such as game detection.",
    granted: false,
  },
];

const KEY = "iobattery.app";
type Snapshot = Pick<
  AppState,
  "onboardingComplete" | "permissions" | "favorites" | "restorePoints"
>;

const DEFAULTS: Snapshot = {
  onboardingComplete: false,
  permissions: DEFAULT_PERMISSIONS,
  favorites: ["/battery", "/profiles"],
  restorePoints: [],
};

function persist(state: AppState) {
  savePersisted<Snapshot>(KEY, {
    onboardingComplete: state.onboardingComplete,
    permissions: state.permissions,
    favorites: state.favorites,
    restorePoints: state.restorePoints,
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  ...DEFAULTS,
  onboardingStep: 0,
  hydrated: false,

  hydrate: () => {
    const stored = loadPersisted<Snapshot>(KEY, DEFAULTS);
    set({ ...stored, hydrated: true });
  },

  setStep: (onboardingStep) => set({ onboardingStep }),

  completeOnboarding: () => {
    set({ onboardingComplete: true });
    persist(get());
  },

  resetOnboarding: () => {
    set({ onboardingComplete: false, onboardingStep: 0 });
    persist(get());
  },

  setPermission: (id, granted) => {
    set((state) => ({
      permissions: state.permissions.map((p) => (p.id === id ? { ...p, granted } : p)),
    }));
    persist(get());
  },

  toggleFavorite: (route) => {
    set((state) => ({
      favorites: state.favorites.includes(route)
        ? state.favorites.filter((f) => f !== route)
        : [...state.favorites, route],
    }));
    persist(get());
  },

  addRestorePoint: (label, payload) => {
    set((state) => ({
      restorePoints: [
        { id: uid("restore"), label, at: Date.now(), payload },
        ...state.restorePoints,
      ].slice(0, 20),
    }));
    persist(get());
  },

  removeRestorePoint: (id) => {
    set((state) => ({ restorePoints: state.restorePoints.filter((r) => r.id !== id) }));
    persist(get());
  },
}));
