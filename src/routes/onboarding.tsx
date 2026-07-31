import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BatteryCharging,
  Check,
  CircleAlert,
  Cpu,
  Rocket,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { REASON_TEXT } from "@/features/device/types";
import { useDeviceStore } from "@/stores/device-store";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import { THEMES, useThemeStore } from "@/stores/theme-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — IoBattery Pro" },
      {
        name: "description",
        content:
          "Set up IoBattery Pro: check compatibility, grant the privileged shell, and pick your first optimization profile.",
      },
      { property: "og:title", content: "Get started — IoBattery Pro" },
      {
        property: "og:description",
        content: "Compatibility check, permissions and your first optimization profile.",
      },
    ],
  }),
  component: Onboarding,
});

const STEP_COUNT = 8;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const initialize = useDeviceStore((s) => s.initialize);
  const status = useDeviceStore((s) => s.status);
  const bridge = useDeviceStore((s) => s.bridge);
  const capabilities = useDeviceStore((s) => s.capabilities);
  const identity = useDeviceStore((s) => s.identity);
  const permissions = useAppStore((s) => s.permissions);
  const setPermission = useAppStore((s) => s.setPermission);
  const complete = useAppStore((s) => s.completeOnboarding);
  const setActive = useProfileStore((s) => s.setActive);
  const profiles = useProfileStore((s) => s.profiles);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [picked, setPicked] = useState("balanced");

  useEffect(() => {
    if (status === "idle") void initialize();
  }, [status, initialize]);

  const supported = Object.values(capabilities).filter((c) => c.supported);
  const unsupported = Object.values(capabilities).filter((c) => !c.supported);

  const finish = () => {
    setActive(picked);
    complete();
    void navigate({ to: "/", replace: true });
  };

  const steps = [
    {
      key: "splash",
      icon: Sparkles,
      title: "IoBattery Pro",
      body: "A control center for your rooted device. Real values, reversible changes, nothing invented.",
      content: null,
    },
    {
      key: "welcome",
      icon: Rocket,
      title: "Welcome",
      body: "Eight short steps. You can replay this at any time from Settings.",
      content: null,
    },
    {
      key: "what",
      icon: BatteryCharging,
      title: "What IoBattery Pro does",
      body: "Monitors battery, thermals and CPU straight from kernel interfaces, applies optimization profiles through a verified write pipeline, and diagnoses problems with Device Doctor.",
      content: (
        <ul className="space-y-2 text-sm text-on-surface-variant">
          <li>• Every write is validated, snapshotted, verified and rolled back on mismatch.</li>
          <li>• Unsupported controls are hidden, never shown as dead toggles.</li>
          <li>• Nothing leaves your device.</li>
        </ul>
      ),
    },
    {
      key: "features",
      icon: Cpu,
      title: "Supported features",
      body: "These are the interfaces detected on this device right now.",
      content: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {supported.map((cap) => (
              <span
                key={cap.id}
                className="rounded-full bg-status-healthy/15 px-2.5 py-1 text-xs text-status-healthy"
              >
                {cap.label}
              </span>
            ))}
            {supported.length === 0 && (
              <p className="text-sm text-on-surface-variant">
                No privileged interfaces detected yet.
              </p>
            )}
          </div>
          {unsupported.length > 0 && (
            <p className="text-xs text-on-surface-variant">
              {unsupported.length} interfaces are unavailable and their controls stay hidden.
            </p>
          )}
        </div>
      ),
    },
    {
      key: "compat",
      icon: ShieldCheck,
      title: "Compatibility check",
      body: bridge
        ? "A privileged WebUI shell is attached. Full functionality is available."
        : "No privileged shell is attached to this session.",
      content: (
        <div className="space-y-2 text-sm">
          <Row label="Privileged shell" value={bridge ? "Attached" : "Not attached"} ok={bridge} />
          <Row
            label="Root manager"
            value={identity.rootManager.value ?? "Unavailable"}
            ok={identity.rootManager.value !== null}
          />
          <Row
            label="Kernel"
            value={identity.kernel.value ?? "Unavailable"}
            ok={identity.kernel.value !== null}
          />
          {!bridge && (
            <p className="rounded-lg bg-status-warning/10 p-3 text-xs text-status-warning">
              {REASON_TEXT["no-webui-bridge"]} You can still explore the interface; every metric
              will state that it is unavailable rather than showing a fake number.
            </p>
          )}
        </div>
      ),
    },
    {
      key: "permissions",
      icon: ShieldCheck,
      title: "Permissions",
      body: "Each permission is requested for a specific reason. Grant only what you need.",
      content: (
        <div className="space-y-3">
          {permissions.map((permission) => (
            <div key={permission.id} className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{permission.label}</p>
                <p className="text-xs text-on-surface-variant">{permission.rationale}</p>
              </div>
              <Switch
                checked={permission.granted}
                onCheckedChange={(value) => setPermission(permission.id, value)}
                aria-label={`Grant ${permission.label}`}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "wizard",
      icon: Stethoscope,
      title: "Choose your starting profile",
      body: "You can change, duplicate or build your own profile later.",
      content: (
        <div className="grid gap-2">
          {profiles
            .filter((p) => p.builtIn)
            .map((profile) => (
              <button
                key={profile.id}
                onClick={() => setPicked(profile.id)}
                aria-pressed={picked === profile.id}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  picked === profile.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface-container",
                )}
              >
                <p className="text-sm font-medium">{profile.name}</p>
                <p className="text-xs text-on-surface-variant">{profile.description}</p>
              </button>
            ))}
        </div>
      ),
    },
    {
      key: "ready",
      icon: Check,
      title: "You're ready",
      body: "Pick a look and open the dashboard.",
      content: (
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((item) => (
            <button
              key={item.id}
              onClick={() => setTheme(item.id)}
              aria-pressed={theme === item.id}
              className={cn(
                "rounded-xl border p-3 text-left text-sm transition-colors",
                theme === item.id ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <span className="font-medium">{item.name}</span>
              <span className="block text-xs text-on-surface-variant">{item.description}</span>
            </button>
          ))}
        </div>
      ),
    },
  ];

  const current = steps[step]!;
  const Icon = current.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6 text-foreground">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <Progress value={((step + 1) / STEP_COUNT) * 100} className="h-1" />
        <p className="mt-2 text-xs text-on-surface-variant">
          Step {step + 1} of {STEP_COUNT}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="flex flex-1 flex-col justify-center py-8"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
              <Icon className="h-7 w-7 text-primary" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{current.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{current.body}</p>
            {current.content && (
              <Card className="mt-5 border-border bg-card py-0">
                <CardContent className="p-4">{current.content}</CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-2 pb-4">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={finish}>
            Skip
          </Button>
          {step < STEP_COUNT - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={finish}>Open dashboard</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-on-surface-variant">{label}</span>
      <span className={cn("flex items-center gap-1.5 font-medium", ok ? "text-status-healthy" : "text-status-warning")}>
        {ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <CircleAlert className="h-3.5 w-3.5" aria-hidden />}
        {value}
      </span>
    </div>
  );
}
