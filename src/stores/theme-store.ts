/** Theme state — six themes, applied instantly via a data attribute. */
import { create } from "zustand";
import { loadPersisted, savePersisted } from "./persist";

export const THEMES = [
  { id: "material-dark", name: "Material Dark", dark: true, description: "Material 3 dark baseline" },
  { id: "material-light", name: "Material Light", dark: false, description: "Material 3 light baseline" },
  { id: "professional-black", name: "Professional Black", dark: true, description: "True black, OLED friendly" },
  { id: "glass", name: "Glass Morphism", dark: true, description: "Translucent surfaces, blur on chrome" },
  { id: "midnight-blue", name: "Midnight Blue", dark: true, description: "Deep navy system palette" },
  { id: "energy", name: "Energy", dark: true, description: "Blue energy accents on graphite" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export type Density = "comfortable" | "compact";

interface ThemeState {
  theme: ThemeId;
  density: Density;
  reduceMotion: boolean;
  fontScale: number;
  hydrated: boolean;
  setTheme: (theme: ThemeId) => void;
  setDensity: (density: Density) => void;
  setReduceMotion: (value: boolean) => void;
  setFontScale: (value: number) => void;
  hydrate: () => void;
}

const KEY = "iobattery.theme";

type Snapshot = Pick<ThemeState, "theme" | "density" | "reduceMotion" | "fontScale">;

const DEFAULTS: Snapshot = {
  theme: "midnight-blue",
  density: "comfortable",
  reduceMotion: false,
  fontScale: 1,
};

function persist(state: ThemeState) {
  savePersisted<Snapshot>(KEY, {
    theme: state.theme,
    density: state.density,
    reduceMotion: state.reduceMotion,
    fontScale: state.fontScale,
  });
}

export function applyThemeToDocument(snapshot: Snapshot) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const meta = THEMES.find((t) => t.id === snapshot.theme) ?? THEMES[0];
  root.dataset['theme'] = snapshot.theme;
  root.dataset['density'] = snapshot.density;
  root.classList.toggle("dark", meta.dark);
  root.style.setProperty("--app-font-scale", String(snapshot.fontScale));
  root.dataset['reduceMotion'] = snapshot.reduceMotion ? "true" : "false";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  hydrate: () => {
    const stored = loadPersisted<Snapshot>(KEY, DEFAULTS);
    set({ ...stored, hydrated: true });
    applyThemeToDocument(stored);
  },
  setTheme: (theme) => {
    set({ theme });
    applyThemeToDocument({ ...get(), theme });
    persist(get());
  },
  setDensity: (density) => {
    set({ density });
    applyThemeToDocument({ ...get(), density });
    persist(get());
  },
  setReduceMotion: (reduceMotion) => {
    set({ reduceMotion });
    applyThemeToDocument({ ...get(), reduceMotion });
    persist(get());
  },
  setFontScale: (fontScale) => {
    set({ fontScale });
    applyThemeToDocument({ ...get(), fontScale });
    persist(get());
  },
}));
