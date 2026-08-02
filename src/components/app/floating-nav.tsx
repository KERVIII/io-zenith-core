import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  BatteryCharging,
  Gauge,
  GraduationCap,
  Home,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/performance", label: "Performance", icon: Gauge },
  { to: "/battery", label: "Battery", icon: BatteryCharging },
  { to: "/automation", label: "Automation", icon: Workflow },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/settings", label: "Settings", icon: Settings2 },
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
  Icon: typeof Home;
  active: boolean;
  reduced: boolean;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const seed = useRef(0);

  return (
    <li className={cn("min-w-0", active ? "flex-1" : "shrink-0")}>
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        title={label}
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
          "group relative flex min-h-12 items-center justify-center gap-1.5 overflow-hidden rounded-full px-2",
          "text-[0.72rem] font-medium outline-offset-2 transition-colors",
          active
            ? "text-primary"
            : "w-10 text-on-surface-variant hover:text-foreground",
        )}
      >
        {/* morphing active indicator */}
        {active && (
          <motion.span
            aria-hidden
            layoutId="floating-nav-indicator"
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 300, damping: 32, mass: 0.7 }
            }
            className="absolute inset-0 rounded-full bg-primary/18 ring-1 ring-primary/25"
          />
        )}

        {/* ripple feedback */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              aria-hidden
              initial={{ opacity: 0.26, scale: 0 }}
              animate={{ opacity: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ left: ripple.x - 40, top: ripple.y - 40 }}
              className="pointer-events-none absolute h-20 w-20 rounded-full bg-primary/40"
            />
          ))}
        </AnimatePresence>

        {/* magnetic press + gentle lift on the icon */}
        <motion.span
          aria-hidden
          className="relative"
          animate={reduced ? {} : { scale: active ? 1.06 : 1, y: active ? -0.5 : 0 }}
          whileTap={reduced ? {} : { scale: 0.88 }}
          transition={{ type: "spring", stiffness: 340, damping: 24 }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </motion.span>

        <AnimatePresence initial={false}>
          {active && (
            <motion.span
              key="label"
              initial={reduced ? false : { opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="relative overflow-hidden whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </li>
  );
}

/**
 * Premium floating navigation island: a glass pill hovering over the content
 * with a morphing active indicator, breathing idle motion, ripple + magnetic
 * press feedback and scroll-aware auto-hide. Every motion collapses to an
 * instant state change under reduced motion.
 */
export function FloatingNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const [hidden, setHidden] = useState(false);

  /* Scroll-aware auto-hide: sink out of the way going down, resurface on the
     smallest upward intent or when the page settles at the bottom. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - last;
        if (Math.abs(delta) > 6) {
          const atBottom =
            y + window.innerHeight >= document.documentElement.scrollHeight - 24;
          setHidden(delta > 0 && y > 96 && !atBottom);
          last = y;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    setHidden(false);
  }, [pathname]);

  /* Buoyancy: one gentle lift-and-settle per tab change, never a perpetual
     loop that would burn battery on an always-visible surface. */
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
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
      animate={
        reduced
          ? { y: 0, opacity: 1 }
          : hidden
            ? { y: 120, opacity: 0 }
            : { y: 0, opacity: 1 }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 220, damping: 30, mass: 0.8 }
      }
    >
      <motion.nav
        aria-label="Primary"
        aria-hidden={hidden ? true : undefined}
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={controls}
        className={cn(
          "glass-surface pointer-events-auto w-[min(30rem,calc(100%-1.25rem))] rounded-full",
          "border border-border bg-card/85 shadow-[0_18px_45px_-16px_rgba(0,0,0,0.65),0_2px_8px_-2px_rgba(0,0,0,0.4)]",
        )}
      >
        {/* breathing highlight — a slow, barely-there swell, not a pulse */}
        {!reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-primary/10"
            animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.006, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <ul className="relative flex items-stretch justify-between gap-0.5 px-1.5 py-1.5">
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
    </motion.div>
  );
}
