/**
 * Privileged shell bridge.
 *
 * KernelSU and Magisk WebUI both inject a JS object into the WebView that can
 * execute shell commands with the module's privileges. This module wraps that
 * bridge in a promise API, serializes execution through a single queue (no
 * concurrent writes to the same sysfs node), and de-duplicates identical
 * in-flight reads.
 *
 * If no bridge is present (e.g. the app opened in a desktop browser) every
 * call rejects with ShellUnavailableError — never a fabricated success.
 */
import { ShellUnavailableError, type ShellResult } from "./types";

type KsuBridge = {
  exec?: (cmd: string, options?: string, callbackName?: string) => void;
  spawn?: unknown;
};

declare global {
  interface Window {
    ksu?: KsuBridge;
    $ksu?: KsuBridge;
    mmrl?: KsuBridge;
  }
}

export function getBridge(): KsuBridge | null {
  if (typeof window === "undefined") return null;
  const candidate = window.ksu ?? window.$ksu ?? window.mmrl ?? null;
  return candidate && typeof candidate.exec === "function" ? candidate : null;
}

export function isBridgeAvailable(): boolean {
  return getBridge() !== null;
}

let callbackSeq = 0;

function execRaw(command: string, timeoutMs: number): Promise<ShellResult> {
  const bridge = getBridge();
  if (!bridge?.exec) return Promise.reject(new ShellUnavailableError("no-webui-bridge"));

  const started = Date.now();
  return new Promise<ShellResult>((resolve, reject) => {
    const name = `__iobattery_cb_${++callbackSeq}`;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Shell command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[name];
    }

    (window as unknown as Record<string, unknown>)[name] = (
      code: number,
      stdout: string,
      stderr: string,
    ) => {
      cleanup();
      resolve({
        command,
        code: Number(code ?? 0),
        stdout: String(stdout ?? "").trim(),
        stderr: String(stderr ?? "").trim(),
        durationMs: Date.now() - started,
      });
    };

    try {
      bridge.exec!(command, JSON.stringify({ cwd: "/" }), name);
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** Serialized FIFO queue — one privileged command in flight at a time. */
const queue: Array<() => void> = [];
let running = false;

function pump() {
  if (running) return;
  const next = queue.shift();
  if (!next) return;
  running = true;
  next();
}

const inflight = new Map<string, Promise<ShellResult>>();

export interface ExecOptions {
  /** Reads are de-duplicated; writes never are. */
  dedupe?: boolean | undefined;
  timeoutMs?: number | undefined;
}

export function exec(command: string, options: ExecOptions = {}): Promise<ShellResult> {
  const { dedupe = false, timeoutMs = 8000 } = options;
  if (dedupe) {
    const existing = inflight.get(command);
    if (existing) return existing;
  }

  const promise = new Promise<ShellResult>((resolve, reject) => {
    queue.push(() => {
      execRaw(command, timeoutMs)
        .then(resolve, reject)
        .finally(() => {
          running = false;
          inflight.delete(command);
          pump();
        });
    });
    pump();
  });

  if (dedupe) inflight.set(command, promise);
  return promise;
}

/** Read a single file, returning null when it is missing or unreadable. */
export async function readNode(path: string): Promise<string | null> {
  try {
    const result = await exec(`cat ${path} 2>/dev/null`, { dedupe: true });
    if (result.code !== 0 || result.stdout === "") return null;
    return result.stdout;
  } catch {
    return null;
  }
}

export async function nodeExists(path: string): Promise<boolean> {
  try {
    const result = await exec(`[ -e ${path} ] && echo 1 || echo 0`, { dedupe: true });
    return result.stdout.trim() === "1";
  } catch {
    return false;
  }
}

export function queueDepth(): number {
  return queue.length;
}
