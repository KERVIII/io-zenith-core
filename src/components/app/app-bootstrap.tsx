import { useEffect } from "react";
import { applyThemeToDocument, useThemeStore } from "@/stores/theme-store";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import { useAutomationStore } from "@/stores/automation-store";
import { useLearnStore } from "@/stores/learn-store";
import { useAutomationEngine } from "@/hooks/use-automation-engine";

/**
 * Hydrates persisted stores on the client, applies the theme to <html>, and
 * routes first-run users into onboarding. Renders nothing.
 */
export function AppBootstrap() {
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const hydrateApp = useAppStore((s) => s.hydrate);
  const hydrateProfiles = useProfileStore((s) => s.hydrate);
  const hydrateAutomation = useAutomationStore((s) => s.hydrate);
  const hydrateLearn = useLearnStore((s) => s.hydrate);

  const themeHydrated = useThemeStore((s) => s.hydrated);
  const theme = useThemeStore((s) => s.theme);
  const density = useThemeStore((s) => s.density);
  const reduceMotion = useThemeStore((s) => s.reduceMotion);
  const fontScale = useThemeStore((s) => s.fontScale);

  useAutomationEngine();

  useEffect(() => {
    hydrateTheme();
    hydrateApp();
    hydrateProfiles();
    hydrateAutomation();
    hydrateLearn();
  }, [hydrateTheme, hydrateApp, hydrateProfiles, hydrateAutomation, hydrateLearn]);

  useEffect(() => {
    if (!themeHydrated) return;
    applyThemeToDocument({ theme, density, reduceMotion, fontScale });
  }, [themeHydrated, theme, density, reduceMotion, fontScale]);

  /* The first-run redirect lives in the root route's beforeLoad — see
     src/routes/__root.tsx. Redirecting from an effect here tore down the
     freshly committed match and tripped a router invariant. */


  return null;
}
