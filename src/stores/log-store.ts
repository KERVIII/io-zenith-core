/**
 * Log state — the single sink for every shell command, write outcome, and
 * lifecycle event in the app. The Developer Console renders straight from it.
 */
import { create } from "zustand";

export type LogLevel = "debug" | "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  at: number;
  level: LogLevel;
  tag: string;
  message: string;
  /** Raw shell output, shown when the row is expanded. */
  detail?: string | undefined;
}

const MAX_ENTRIES = 500;

interface LogState {
  entries: LogEntry[];
  autoScroll: boolean;
  push: (entry: Omit<LogEntry, "id" | "at">) => void;
  clear: () => void;
  setAutoScroll: (value: boolean) => void;
}

let seq = 0;

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  autoScroll: true,
  push: (entry) =>
    set((state) => ({
      entries: [
        ...state.entries.slice(-(MAX_ENTRIES - 1)),
        { ...entry, id: `log_${++seq}`, at: Date.now() },
      ],
    })),
  clear: () => set({ entries: [] }),
  setAutoScroll: (autoScroll) => set({ autoScroll }),
}));

export const log = {
  debug: (tag: string, message: string, detail?: string) =>
    useLogStore.getState().push({ level: "debug", tag, message, detail }),
  info: (tag: string, message: string, detail?: string) =>
    useLogStore.getState().push({ level: "info", tag, message, detail }),
  success: (tag: string, message: string, detail?: string) =>
    useLogStore.getState().push({ level: "success", tag, message, detail }),
  warn: (tag: string, message: string, detail?: string) =>
    useLogStore.getState().push({ level: "warn", tag, message, detail }),
  error: (tag: string, message: string, detail?: string) =>
    useLogStore.getState().push({ level: "error", tag, message, detail }),
};

export function exportLogs(entries: LogEntry[], format: "json" | "txt"): string {
  if (format === "json") return JSON.stringify(entries, null, 2);
  return entries
    .map(
      (entry) =>
        `[${new Date(entry.at).toISOString()}] ${entry.level.toUpperCase().padEnd(7)} ${entry.tag}: ${entry.message}${entry.detail ? `\n    ${entry.detail.replace(/\n/g, "\n    ")}` : ""}`,
    )
    .join("\n");
}
