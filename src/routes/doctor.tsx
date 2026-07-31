import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleX,
  Loader2,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DOCTOR_CHECKS, type DoctorFinding, type DoctorStatus } from "@/features/doctor/checks";
import { useDeviceStore } from "@/stores/device-store";
import { log } from "@/stores/log-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Device Doctor — IoBattery Pro" },
      {
        name: "description",
        content:
          "Scan root access, module health, kernel interfaces and SELinux state, then repair issues with one tap.",
      },
      { property: "og:title", content: "Device Doctor — IoBattery Pro" },
      {
        property: "og:description",
        content: "Twelve diagnostics with explanations and one-tap repairs.",
      },
    ],
  }),
  component: DoctorScreen,
});

const STATUS_META: Record<DoctorStatus, { icon: typeof CircleCheck; tone: string; label: string }> = {
  pass: { icon: CircleCheck, tone: "text-status-healthy", label: "Pass" },
  warn: { icon: CircleAlert, tone: "text-status-warning", label: "Warning" },
  fail: { icon: CircleX, tone: "text-status-critical", label: "Failed" },
  unknown: { icon: CircleHelp, tone: "text-status-unknown", label: "Unknown" },
};

function DoctorScreen() {
  const capabilities = useDeviceStore((s) => s.capabilities);
  const [findings, setFindings] = useState<DoctorFinding[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setRunning(true);
    setFindings([]);
    setProgress(0);
    log.info("doctor", `Starting diagnostic scan — ${DOCTOR_CHECKS.length} checks.`);
    const collected: DoctorFinding[] = [];
    for (let i = 0; i < DOCTOR_CHECKS.length; i++) {
      const check = DOCTOR_CHECKS[i]!;
      const result = await check.run(capabilities);
      const finding: DoctorFinding = {
        id: check.id,
        title: check.title,
        category: check.category,
        ...result,
      };
      collected.push(finding);
      setFindings([...collected]);
      setProgress(((i + 1) / DOCTOR_CHECKS.length) * 100);
    }
    const failed = collected.filter((f) => f.status === "fail").length;
    log.success("doctor", `Scan complete — ${failed} failures across ${collected.length} checks.`);
    setRunning(false);
  }, [capabilities]);

  useEffect(() => {
    void scan();
  }, [scan]);

  const counts = {
    pass: findings.filter((f) => f.status === "pass").length,
    warn: findings.filter((f) => f.status === "warn").length,
    fail: findings.filter((f) => f.status === "fail").length,
    unknown: findings.filter((f) => f.status === "unknown").length,
  };

  const runFix = async (finding: DoctorFinding) => {
    if (!finding.fix) return;
    setFixing(finding.id);
    try {
      const message = await finding.fix();
      log.success("doctor", `Repair applied: ${finding.title}`, message);
      toast.success(message);
      await scan();
    } catch (error) {
      log.error("doctor", `Repair failed: ${finding.title}`, String(error));
      toast.error("The repair could not be completed.");
    } finally {
      setFixing(null);
    }
  };

  return (
    <AppShell title="Device Doctor" back="/">
      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
              <Stethoscope className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">
                {running ? "Scanning…" : `${findings.length} checks completed`}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {counts.pass} pass · {counts.warn} warnings · {counts.fail} failed ·{" "}
                {counts.unknown} unknown
              </p>
            </div>
            <Button size="sm" className="min-h-11" onClick={() => void scan()} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Rescan"}
            </Button>
          </div>
          <Progress value={progress} className="h-1" aria-label="Scan progress" />
        </CardContent>
      </Card>

      {(["environment", "interfaces", "system"] as const).map((category) => {
        const group = findings.filter((f) => f.category === category);
        if (group.length === 0) return null;
        return (
          <section key={category} className="space-y-2" aria-labelledby={`doctor-${category}`}>
            <h2 id={`doctor-${category}`} className="px-1 text-sm font-semibold capitalize">
              {category}
            </h2>
            {group.map((finding) => {
              const meta = STATUS_META[finding.status];
              const Icon = meta.icon;
              const open = expanded === finding.id;
              return (
                <motion.div key={finding.id} layout>
                  <Card className="border-border bg-card py-0">
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpanded(open ? null : finding.id)}
                        aria-expanded={open}
                        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <Icon className={cn("h-5 w-5 shrink-0", meta.tone)} aria-hidden />
                        <span className="flex-1 text-sm font-medium">{finding.title}</span>
                        <span className={cn("text-xs", meta.tone)}>{meta.label}</span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 border-t border-border px-4 py-3">
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
                                  What was found
                                </p>
                                <p className="text-xs leading-snug">{finding.detail}</p>
                              </div>
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
                                  Recommendation
                                </p>
                                <p className="text-xs leading-snug">{finding.recommendation}</p>
                              </div>
                              <div className="flex gap-2">
                                {finding.fix && (
                                  <Button
                                    size="sm"
                                    className="min-h-11"
                                    disabled={fixing === finding.id}
                                    onClick={() => void runFix(finding)}
                                  >
                                    <Wrench className="mr-1.5 h-4 w-4" aria-hidden />
                                    {fixing === finding.id ? "Repairing…" : "Fix it"}
                                  </Button>
                                )}
                                {finding.fixRoute && (
                                  <Button asChild size="sm" variant="outline" className="min-h-11">
                                    <Link to={finding.fixRoute}>Open the related screen</Link>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </section>
        );
      })}
    </AppShell>
  );
}
