import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Copy,
  Download,
  Gamepad2,
  Leaf,
  Pencil,
  Plus,
  Scale,
  SlidersHorizontal,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ConfirmSheet } from "@/components/app/confirm-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfileStore, type Profile } from "@/stores/profile-store";
import { useDeviceStore } from "@/stores/device-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profiles")({
  head: () => ({
    meta: [
      { title: "Optimization profiles — IoBattery Pro" },
      {
        name: "description",
        content:
          "Apply Eco, Balanced, Gaming or Extreme profiles, build your own, and import or export portable JSON profiles.",
      },
      { property: "og:title", content: "Optimization profiles — IoBattery Pro" },
      {
        property: "og:description",
        content: "Declarative, portable, verified optimization profiles.",
      },
    ],
  }),
  component: ProfilesScreen,
});

const ICONS = { leaf: Leaf, scale: Scale, gamepad: Gamepad2, zap: Zap, sliders: SlidersHorizontal };

function ProfilesScreen() {
  const profiles = useProfileStore((s) => s.profiles);
  const activeId = useProfileStore((s) => s.activeId);
  const setActive = useProfileStore((s) => s.setActive);
  const duplicate = useProfileStore((s) => s.duplicate);
  const remove = useProfileStore((s) => s.remove);
  const rename = useProfileStore((s) => s.rename);
  const exportProfile = useProfileStore((s) => s.exportProfile);
  const importProfile = useProfileStore((s) => s.importProfile);
  const create = useProfileStore((s) => s.create);
  const applyWrite = useDeviceStore((s) => s.applyWrite);
  const supports = useDeviceStore((s) => s.supports);

  const [confirm, setConfirm] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [pulseId, setPulseId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = async (profile: Profile) => {
    setConfirm(null);
    setActive(profile.id);
    setPulseId(profile.id);
    setTimeout(() => setPulseId(null), 900);

    const applicable = profile.settings.filter((setting) => supports(setting.capability));
    if (applicable.length === 0) {
      toast.warning(`${profile.name} selected, but none of its settings are supported here.`);
      return;
    }
    let failures = 0;
    for (const setting of applicable) {
      const ok = await applyWrite({
        id: `${profile.id}-${setting.capability}`,
        label: `${profile.name}: ${setting.label}`,
        capability: setting.capability,
        node: setting.node,
        value: setting.value,
      });
      if (!ok) failures += 1;
    }
    if (failures === 0) toast.success(`${profile.name} applied and verified.`);
    else toast.error(`${failures} of ${applicable.length} settings were rolled back.`);
  };

  const download = (profile: Profile) => {
    const json = exportProfile(profile.id);
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${profile.name.toLowerCase().replace(/\s+/g, "-")}.iobattery.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Profile exported.");
  };

  return (
    <AppShell title="Profiles" back="/">
      <div className="flex gap-2">
        <Button
          className="min-h-11 flex-1"
          onClick={() => {
            const id = create({
              name: "Custom profile",
              description: "Your own set of target values.",
              icon: "sliders",
              settings: [],
            });
            const created = useProfileStore.getState().profiles.find((p) => p.id === id) ?? null;
            setEditing(created);
            setName(created?.name ?? "");
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          New profile
        </Button>
        <Button variant="outline" className="min-h-11" onClick={() => setImportOpen(true)}>
          <Upload className="mr-1.5 h-4 w-4" aria-hidden />
          Import
        </Button>
      </div>

      {profiles.map((profile) => {
        const Icon = ICONS[profile.icon];
        const active = profile.id === activeId;
        return (
          <motion.div key={profile.id} layout>
            <Card
              className={cn(
                "border-border bg-card py-0",
                active && "border-primary",
                pulseId === profile.id && "energy-pulse",
              )}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {profile.name}
                      {active && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs leading-snug text-on-surface-variant">
                      {profile.description}
                    </p>
                  </div>
                </div>

                <ul className="space-y-1 text-[11px] text-on-surface-variant">
                  {profile.settings.length === 0 && <li>No settings yet — edit to add targets.</li>}
                  {profile.settings.map((setting) => (
                    <li key={setting.capability} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          supports(setting.capability) ? "bg-status-healthy" : "bg-status-unknown",
                        )}
                        aria-hidden
                      />
                      {setting.label}
                      {!supports(setting.capability) && " · unsupported here, will be skipped"}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="min-h-11 flex-1" onClick={() => setConfirm(profile)}>
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11"
                    aria-label={`Duplicate ${profile.name}`}
                    onClick={() => {
                      duplicate(profile.id);
                      toast.success("Profile duplicated.");
                    }}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-11"
                    aria-label={`Export ${profile.name}`}
                    onClick={() => download(profile)}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </Button>
                  {!profile.builtIn && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11"
                        aria-label={`Rename ${profile.name}`}
                        onClick={() => {
                          setEditing(profile);
                          setName(profile.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 text-status-critical"
                        aria-label={`Delete ${profile.name}`}
                        onClick={() => {
                          remove(profile.id);
                          toast.success("Profile deleted.");
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <ConfirmSheet
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Apply ${confirm?.name}?`}
        impact={[
          ...(confirm?.settings.map((setting) => `${setting.label} (${setting.node})`) ?? []),
          "Each write is snapshotted, verified by read-back, and rolled back on mismatch.",
          "Settings your device does not support are skipped, not faked.",
        ]}
        confirmLabel="Apply profile"
        onConfirm={() => {
          if (confirm) void apply(confirm);
        }}

      />

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename profile</DialogTitle>
          </DialogHeader>
          <Label htmlFor="profile-name">Name</Label>
          <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
          <DialogFooter>
            <Button
              onClick={() => {
                if (editing) rename(editing.id, name.trim() || editing.name);
                setEditing(null);
                toast.success("Profile renamed.");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import a profile</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-on-surface-variant">
            Profiles are schema-validated and capability-checked before anything is applied.
          </p>
          <Textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={8}
            placeholder='{"schemaVersion":1,"profile":{…}}'
            aria-label="Profile JSON"
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) setImportText(await file.text());
            }}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              Choose file
            </Button>
            <Button
              onClick={() => {
                const result = importProfile(importText);
                if (result.ok) {
                  toast.success(result.message);
                  setImportOpen(false);
                  setImportText("");
                } else {
                  toast.error(result.message);
                }
              }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
