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
  const routerIdle = useRouterState({ select: (s) => s.status === "idle" && !s.isLoading });
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const appHydrated = useAppStore((s) => s.hydrated);

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

  /* First-run gate. The redirect waits for hydration to settle and the router
     to go idle: navigating while the initial match is still committing tears
     that match down mid-render and trips a router invariant. */
  useEffect(() => {
    if (!appHydrated || !routerIdle) return;
    if (onboardingComplete || pathname === "/onboarding") return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        void navigate({ to: "/onboarding", replace: true });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [appHydrated, routerIdle, onboardingComplete, pathname, navigate]);

  return null;
}
