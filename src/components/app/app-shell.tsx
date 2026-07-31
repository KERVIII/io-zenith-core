import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "./bottom-nav";
import { TopBar } from "./top-bar";
import { useTelemetryStream } from "@/hooks/use-telemetry-stream";

/**
 * Standard screen scaffold: top app bar, animated page body, bottom nav.
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

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <TopBar title={title} back={back} />
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4"
      >
        {children}
      </motion.main>
      <BottomNav />
    </div>
  );
}
