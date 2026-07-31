import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  BatteryCharging,
  Gauge,
  LayoutDashboard,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/battery", label: "Battery", icon: BatteryCharging },
  { to: "/performance", label: "Monitor", icon: Gauge },
  { to: "/doctor", label: "Doctor", icon: Stethoscope },
] as const;

/** Material 3 style bottom navigation with an animated active pill. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="glass-surface fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className="flex min-h-12 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium"
              >
                <span className="relative flex h-8 w-16 items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-primary/20"
                    />
                  )}
                  <Icon
                    aria-hidden
                    className={cn(
                      "relative h-5 w-5 transition-colors",
                      active ? "text-primary" : "text-on-surface-variant",
                    )}
                  />
                </span>
                <span className={active ? "text-primary" : "text-on-surface-variant"}>{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <Link
            to="/assistant"
            aria-current={pathname.startsWith("/assistant") ? "page" : undefined}
            className="flex min-h-12 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium"
          >
            <span className="relative flex h-8 w-16 items-center justify-center">
              {pathname.startsWith("/assistant") && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-primary/20"
                />
              )}
              <Activity
                aria-hidden
                className={cn(
                  "relative h-5 w-5",
                  pathname.startsWith("/assistant") ? "text-primary" : "text-on-surface-variant",
                )}
              />
            </span>
            <span
              className={
                pathname.startsWith("/assistant") ? "text-primary" : "text-on-surface-variant"
              }
            >
              IoMakima
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
