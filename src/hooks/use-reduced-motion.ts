import { useEffect, useState } from "react";
import { useThemeStore } from "@/stores/theme-store";

/**
 * True when the user asked for reduced motion, either in app settings or via
 * the OS-level `prefers-reduced-motion` media query.
 */
export function useReducedMotion(): boolean {
  const setting = useThemeStore((s) => s.reduceMotion);
  const [system, setSystem] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystem(query.matches);
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return setting || system;
}
