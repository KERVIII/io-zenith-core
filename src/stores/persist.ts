/**
 * Tiny SSR-safe localStorage persistence helper used by the app stores.
 * Reads are deferred to hydration so server and client markup agree.
 */
export function loadPersisted<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { version: number; data: T };
    return parsed?.data ?? fallback;
  } catch {
    return fallback;
  }
}

export function savePersisted<T>(key: string, data: T, version = 1): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ version, data }));
  } catch {
    /* storage full or blocked — non fatal */
  }
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
