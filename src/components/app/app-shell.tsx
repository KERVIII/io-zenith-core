import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { FloatingNav } from "./floating-nav";
import { TopBar } from "./top-bar";
import { useTelemetryStream } from "@/hooks/use-telemetry-stream";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Standard screen scaffold: top app bar, animated page body, floating nav.
 * Mounting the shell starts the telemetry stream and stops it on unmount.
 */
export function AppShell({
  title,
  back,
  children,
  stream = true,
}: {
  title: string;
  back?: string | undefined;
  children: ReactNode;
  stream?: boolean;
}) {
  useTelemetryStream(stream);
  const reduced = useReducedMotion();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background pb-32 text-foreground">
      <a
        href="#main-content"
        className="sr-only rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to main content
      </a>
      <TopBar title={title} back={back} />
      <motion.main
        id="main-content"
        key={pathname}
        tabIndex={-1}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 260, damping: 30, mass: 0.7 }
        }
        className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 outline-none"
      >
        {children}
      </motion.main>
      <FloatingNav />
    </div>
  );
}
