# IoBattery Pro — Product Requirements Document

Planning only. No code, no UI, no components produced in this phase.

Baseline reviewed: the uploaded `index.html` (v4.1, ~5.3k lines) — a single-file WebUI prototype with hero card, stat cards, performance monitor, profiles, apps list, log terminal, chat panel, theme presets (mahiru/pikky/gaming/ultimate), glass/blur tokens and custom wallpaper/video hero. It is a useful feature inventory but not a shippable architecture: it mixes presentation and shell logic, uses decorative glass/glow heavily, and carries anime-branded theming that conflicts with the stated flagship-utility positioning.

## 1. Product Vision

One trustworthy control center for a KernelSU/Magisk optimization module: manage, monitor, diagnose, optimize and automate an Android device, where every state shown is real and every change is reversible. Success is measured in user confidence, not in feature count.

### Positioning challenges (product team pushback)

- **"IoMakima" as a name is a liability.** The product explicitly rejects anime identity, then names its core intelligence layer after an anime character. Recommend renaming the assistant to a neutral system name (e.g. "Insight" / "IO Assistant") and keeping "Makima Edition" only as an optional cosmetic theme pack. Decision needed from the user.
- **Solo Leveling motion influence should be dropped as a stated principle.** Keep "energy pulse on activation" as a Material Motion accent; a fictional-IP-derived motion language will drift toward the exact look the brief forbids.
- **Weekly AI reports and performance predictions are v2, not v1.** They require weeks of historical telemetry to be non-fabricated. Shipping them early forces the assistant to guess, violating the no-fabrication rule.
- **Cloud-ready profile sync is architecture debt in v1.** Design the profile format as portable JSON with a schema version; do not build sync.
- **The prototype's live video/wallpaper hero should not ship in v1.** It is the single largest battery and jank cost in a utility whose selling point is efficiency.

## 2. User Personas

| Persona | Goal | Risk tolerance | Primary surfaces |
| --- | --- | --- | --- |
| Enthusiast tuner (primary) | Squeeze battery/thermals, tune governors | High | Control Center, Profiles, Logs |
| Cautious rooted user | "Just make it better, don't brick it" | Low | Dashboard, Wizard, one-tap fixes |
| Power gamer | Stable frames, thermal headroom | Medium | Gaming profile, live monitor |
| Module developer / support | Diagnose user reports | High | Device Doctor, Log console, export |
| Accessibility-dependent user | Full control with TalkBack + large text | Low | All (must be non-negotiable) |

## 3. Feature Priorities

**P0 (v1.0 must ship):** Device Adapter + capability gating; real telemetry read layer; Dashboard; Control Center (battery, charging limit, performance, thermal); Profiles (Eco/Balanced/Gaming/Extreme + custom, save/restore/rename/duplicate/delete/import/export); Device Doctor with one-tap repair; Safety pipeline (validate → backup → execute → verify → commit → rollback); Onboarding + Permission Center; Log console; Backup/restore; Theme system; Accessibility baseline.

**P1 (v1.1–1.2):** Automation engine; historical graphs and retention; universal search; favorites and customizable dashboard widgets; assistant Q&A grounded in live telemetry + feature docs.

**P2 (v2):** Weekly reports, trend analysis, automation suggestions, natural-language commands that mutate state, learning center, cloud sync.

**Explicitly out of scope:** RAM "boosters", generic battery-saver claims, fake wattage/health math, any metric the kernel does not expose.

## 4. Navigation Map

```text
Splash → Welcome → What is IoBattery Pro → Supported Features →
Compatibility Check → Permission Setup → Optimization Wizard → Ready → Dashboard

Bottom nav (4 tabs, no more):
  Dashboard | Control | Monitor | Doctor
Persistent: search entry + assistant entry in the top app bar
Settings, Logs, Backup, Profiles, Automation, Onboarding replay live under Settings
  and are deep-linkable from search and Doctor findings.
```

Rationale: 4 destinations keeps One UI/Pixel-grade clarity. Profiles are reachable from both Dashboard (active-profile chip) and Control.

## 5. Screen Inventory

Onboarding (8 steps) · Dashboard · Control Center (+ Battery, Charging, Performance, Gaming, Network sub-screens) · Monitor (live + history, per-metric detail) · Device Doctor (scan, finding detail, repair sheet) · Profiles (list, editor, import/export) · Automation (rule list, rule builder, priority ordering) · Assistant · Universal Search · Log Console (+ entry detail, export sheet) · Backup & Restore (+ restore points) · Settings (theme, refresh policy, permissions, about, onboarding replay) · Permission Center · Empty/unsupported-capability state · Error/rollback state.

## 6. Component Inventory

Status hero (health verdict + active profile + one primary action) · metric card (value, trend sparkline, unit, staleness indicator) · capability-gated toggle (never rendered when unsupported) · confirm sheet with impact summary · repair card (explanation, cause, recommended fix, Fix button) · profile chip/row · rule builder condition & action rows · log row (level color, timestamp, module tag, expandable shell output) · filter bar · search result row (typed: setting/profile/log/doc) · graph card with range selector · permission row with rationale · progress/verification stepper · toast + persistent banner for rollback events.

Guideline: no card exists unless it answers a question the dashboard philosophy lists. Duplicate metrics across cards are a review-blocking defect.

## 7. Theme System

- Material Design 3 Expressive tokens; dynamic color (Material You) sourced from wallpaper where available, with fixed fallback palettes.
- Semantic tokens only: `surface`, `surface-container`, `on-surface`, `primary`, `status-healthy/warning/critical`. No hard-coded hex in components.
- Light, dark, and true-black (OLED) modes; status colors verified for deuteranopia/protanopia and never used as the sole signal (pair with icon + text).
- Optional cosmetic theme packs (including the existing "Makima" accent) are user-selectable, off by default, and cannot alter layout, density or type scale.
- Type: Google Sans / Inter; 8dp grid; density comfortable/compact toggle. Glass blur allowed at most on the top app bar and bottom nav, and is auto-disabled in battery-saver mode.

## 8. Animation Guidelines

Material Motion spring physics (standard, emphasized-decelerate for entry); shared-element transitions from card → detail; predictive back on every screen; state-change micro-interactions (toggle commit, verification stepper, repair success pulse); one "energy pulse" accent reserved for optimization activation. Budget: no animation over 400 ms; nothing animates while a scan or shell command is running except the progress indicator; all motion respects `Reduce motion` and drops to cross-fade. Target 120 Hz with no dropped frames on mid-tier hardware.

## 9. Accessibility Rules

TalkBack labels and live regions for every changing metric (announce on meaningful delta, not every poll) · minimum 48dp touch targets · 4.5:1 contrast for text, 3:1 for UI/graph strokes · full support for system font scale to 200% with reflow, no clipping · no color-only status · focus order follows visual order; custom controls expose role/state · every graph has a text summary alternative · haptics for destructive confirmations, never as sole feedback.

## 10. State Management Strategy

Unidirectional: single source of truth per domain (`DeviceCapabilities`, `Telemetry`, `Profiles`, `Automation`, `Doctor`, `Logs`), each exposed as an observable state holder consumed by the UI. Telemetry is a cold stream started only while its screen is visible. Persisted state (profiles, favorites, layout, settings) lives in versioned local storage with migrations. UI holds no derived duplicates; derived values are computed in the state layer so the dashboard and detail screens can never disagree.

## 11. Shell Synchronization Strategy

- Single serialized shell session per privileged operation; a command queue with priorities prevents concurrent writes to the same sysfs node.
- Event-driven first: battery/charging via system broadcasts; thermal and CPU via adaptive polling (1 s while the monitor is foregrounded, 10–30 s in ambient, paused on screen off unless an automation rule needs it).
- Every write is followed by a read-back verification; mismatch triggers rollback.
- Reconciliation on resume, module restart and boot: re-read actual system state and correct the UI rather than trusting cached intent.
- Reboot persistence: profile intent stored declaratively and re-applied post-boot after a capability re-check.

## 12. Error Recovery Strategy

Safety pipeline: validate (capability + value range) → snapshot current node values → execute → verify read-back → commit → rollback on any failure. Rollback failures escalate to a persistent banner with a "restore last known good" restore point and a one-tap log export. Errors are typed: unsupported, permission denied, transient shell failure (retry with backoff), verification mismatch (rollback), unknown (safe abort, never partial-apply). No silent failures; every recovery path writes a tagged log entry.

## 13. Performance Strategy

Cold start to interactive dashboard under 1.5 s (capability detection cached, refreshed in background). Idle CPU near zero: no timers when no monitoring surface is visible. Recomposition/render scoped per metric so one changing value never redraws the screen. History downsampled on write (1 min buckets, 7-day raw / 90-day aggregated retention, configurable). Memory ceiling target < 120 MB. Blur and live wallpaper effects are opt-in and disabled under thermal or battery pressure.

## 14. Security Strategy

Least privilege: request root only when a privileged action is invoked, and explain each permission at the moment of need. Strict allow-list of sysfs paths and value ranges — no arbitrary user-supplied shell execution, including from the assistant, which may only propose actions that map to allow-listed operations requiring explicit user confirmation. Imported profiles are schema-validated and capability-checked before apply. Log exports are redacted of identifiers (serial, IMEI, account data) with a clear pre-share preview. No telemetry leaves the device by default; any future cloud sync is opt-in and end-to-end scoped.

## 15. Testing Strategy

Unit: parsers for every sysfs/battery interface, profile schema migration, automation rule evaluation, rollback logic. Integration: fake device matrix (missing thermal zone, no charge-limit node, Magisk vs KernelSU vs no root, Android 10–16) asserting correct capability gating and no broken toggles. Instrumented UI: onboarding completion, profile apply + rollback, doctor repair, log filter/export. Accessibility: TalkBack traversal and 200% font-scale snapshots per screen. Performance: startup trace, jank/frame-time budget, 24-hour idle battery-drain regression. Manual: real-device gauntlet across Pixel/Samsung/Xiaomi/OnePlus/Nothing before each release.

## 16. Production Readiness Checklist

Capability gating verified on every device tier · zero fabricated metrics (audit each displayed value to a real source or an explicit "unavailable, because…") · rollback proven for every write path · onboarding replayable · all strings externalized and translatable · accessibility audit passed · crash-free session target ≥ 99.5% · log export redaction verified · backup/restore round-trip verified across app versions · no debug shell surfaces in release · battery-drain regression within budget · uninstall leaves no persistent system modification.

## 17. Future Roadmap

v1.1 automation engine + history graphs · v1.2 universal search, favorites, customizable dashboard · v1.3 grounded assistant Q&A and Device Doctor narrative analysis · v2.0 weekly reports, trend analysis, automation suggestions, learning center · v2.1 tile/widget/Wear surfaces · v2.2 opt-in encrypted profile sync and community profile sharing with signature verification.

## 18. Open Questions (need user decisions)

1. Rename the assistant, or keep "IoMakima" as the shipped brand?
2. Is the existing WebUI prototype the delivery target (KernelSU WebUI), or is this a native Android app? This changes the entire architecture section.
3. Minimum supported Android version and root managers (KernelSU only, or Magisk + APatch)?
4. Retention defaults for history — is 7-day raw / 90-day aggregate acceptable on-device?
