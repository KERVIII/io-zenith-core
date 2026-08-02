import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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

  const appHydrated = useAppStore((s) => s.hydrated);
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

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

  /* Defer the first-run redirect to a task after commit: navigating while the
     router is still committing the initial match tears that match down
     mid-render and trips an internal match-lookup invariant. */
  useEffect(() => {
    if (!appHydrated) return;
    if (onboardingComplete || pathname === "/onboarding") return;
    const timer = window.setTimeout(() => {
      void navigate({ to: "/onboarding", replace: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [appHydrated, onboardingComplete, pathname, navigate]);

  return null;
}
