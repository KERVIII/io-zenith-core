import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  BatteryCharging,
  Gauge,
  LayoutDashboard,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/battery", label: "Battery", icon: BatteryCharging },
  { to: "/performance", label: "Monitor", icon: Gauge },
  { to: "/doctor", label: "Doctor", icon: Stethoscope },
  { to: "/assistant", label: "IoMakima", icon: Sparkles },
] as const;

/** Short, non-intrusive haptic tick where the platform supports it. */
function haptic() {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate === "function") navigator.vibrate(8);
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

function NavTab({
  to,
  label,
  Icon,
  active,
  reduced,
}: {
  to: string;
  label: string;
  Icon: typeof LayoutDashboard;
  active: boolean;
  reduced: boolean;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const seed = useRef(0);

  return (
    <li className="flex-1">
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        onPointerDown={(event) => {
          if (reduced) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const id = ++seed.current;
          setRipples((prev) => [
            ...prev,
            { id, x: event.clientX - rect.left, y: event.clientY - rect.top },
          ]);
          window.setTimeout(
            () => setRipples((prev) => prev.filter((r) => r.id !== id)),
            520,
          );
        }}
        onClick={() => {
          if (!active) haptic();
        }}
        className={cn(
          "relative flex min-h-12 min-w-11 flex-col items-center justify-center gap-1 overflow-hidden rounded-full px-1 py-2",
          "text-[0.7rem] font-medium outline-offset-2 transition-colors",
          active ? "text-primary" : "text-on-surface-variant hover:text-foreground",
        )}
      >
        {/* ripple feedback */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              aria-hidden
              initial={{ opacity: 0.28, scale: 0 }}
              animate={{ opacity: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ left: ripple.x - 44, top: ripple.y - 44 }}
              className="pointer-events-none absolute h-22 w-22 rounded-full bg-primary/40"
            />
          ))}
        </AnimatePresence>

        <span className="relative flex h-8 w-12 items-center justify-center">
          {active && (
            <motion.span
              aria-hidden
              layoutId="floating-nav-indicator"
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 260, damping: 30, mass: 0.7 }
              }
              className="absolute inset-0 rounded-full bg-primary/18 ring-1 ring-primary/25"
            />
          )}
          <motion.span
            aria-hidden
            animate={reduced ? {} : { scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="relative"
          >
            <Icon className="h-5 w-5" aria-hidden />
          </motion.span>
        </span>
        <span className="max-w-full truncate">{label}</span>
      </Link>
    </li>
  );
}

/**
 * Premium floating navigation: a glass pill that hovers above the content with
 * a morphing active indicator, gentle buoyancy and ripple feedback. All motion
 * collapses to instant state changes when reduced motion is requested.
 */
export function FloatingNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduced = useReducedMotion();
  const controls = useAnimationControls();

  /* Buoyancy: a single gentle lift-and-settle on each tab change, never a
     perpetual loop (which would fight assistive tech and burn battery on an
     always-visible surface). */
  useEffect(() => {
    if (reduced) {
      void controls.set({ opacity: 1, y: 0, scale: 1 });
      return;
    }
    void controls.start({
      opacity: 1,
      y: [4, -2, 0],
      scale: [0.99, 1.005, 1],
      transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] },
    });
  }, [pathname, reduced, controls]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
      <motion.nav
        aria-label="Primary"
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={controls}


        className={cn(
          "glass-surface pointer-events-auto w-[min(28rem,calc(100%-1.5rem))] rounded-full",
          "border border-border bg-card/95 shadow-[0_18px_45px_-16px_rgba(0,0,0,0.65),0_2px_8px_-2px_rgba(0,0,0,0.4)]",
        )}
      >
        <ul className="flex items-stretch justify-between gap-0.5 px-1.5 py-1.5">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavTab
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              active={to === "/" ? pathname === "/" : pathname.startsWith(to)}
              reduced={reduced}
            />
          ))}
        </ul>
      </motion.nav>
    </div>
  );
}
