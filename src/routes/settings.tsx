import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { THEMES, useThemeStore } from "@/stores/theme-store";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — IoBattery Pro" },
      {
        name: "description",
        content:
          "Choose one of six themes, set density and font scale, reduce motion, and replay onboarding.",
      },
      { property: "og:title", content: "Settings — IoBattery Pro" },
      { property: "og:description", content: "Themes, density, accessibility and onboarding." },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const navigate = useNavigate();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const density = useThemeStore((s) => s.density);
  const setDensity = useThemeStore((s) => s.setDensity);
  const reduceMotion = useThemeStore((s) => s.reduceMotion);
  const setReduceMotion = useThemeStore((s) => s.setReduceMotion);
  const fontScale = useThemeStore((s) => s.fontScale);
  const setFontScale = useThemeStore((s) => s.setFontScale);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);

  return (
    <AppShell title="Settings" back="/" stream={false}>
      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Theme</h2>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((item) => (
              <button
                key={item.id}
                onClick={() => setTheme(item.id)}
                aria-pressed={theme === item.id}
                className={cn(
                  "min-h-11 rounded-xl border p-3 text-left text-sm",
                  theme === item.id ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                <span className="font-medium">{item.name}</span>
                <span className="block text-xs text-on-surface-variant">{item.description}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-4 p-4">
          <h2 className="text-sm font-semibold">Display & accessibility</h2>

          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm">Compact density</span>
            <Switch
              checked={density === "compact"}
              onCheckedChange={(value) => setDensity(value ? "compact" : "comfortable")}
              aria-label="Compact density"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="flex-1 text-sm">Reduce motion</span>
            <Switch
              checked={reduceMotion}
              onCheckedChange={setReduceMotion}
              aria-label="Reduce motion"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Font scale</span>
              <span className="tabular-nums text-on-surface-variant">
                {Math.round(fontScale * 100)}%
              </span>
            </div>
            <Slider
              value={[fontScale]}
              min={0.9}
              max={2}
              step={0.1}
              onValueChange={([value]) => setFontScale(value ?? 1)}
              aria-label="Font scale"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Onboarding</h2>
          <Button
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => {
              resetOnboarding();
              void navigate({ to: "/onboarding" });
            }}
          >
            Replay onboarding
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
