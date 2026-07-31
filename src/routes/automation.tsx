import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Plus, Trash2, Workflow } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACTION_LABELS,
  TRIGGER_LABELS,
  useAutomationStore,
  type ActionType,
  type TriggerType,
} from "@/stores/automation-store";
import { useProfileStore } from "@/stores/profile-store";
import { useDeviceStore } from "@/stores/device-store";
import { suggestAutomation } from "@/features/ai/insight";

export const Route = createFileRoute("/automation")({
  head: () => ({
    meta: [
      { title: "Automation rules — IoBattery Pro" },
      {
        name: "description",
        content:
          "Build condition-to-action rules that switch profiles, cap charging or engage thermal guards from real telemetry.",
      },
      { property: "og:title", content: "Automation rules — IoBattery Pro" },
      {
        property: "og:description",
        content: "Prioritized automation driven by verified device readings.",
      },
    ],
  }),
  component: AutomationScreen,
});

function AutomationScreen() {
  const rules = useAutomationStore((s) => s.rules);
  const engineEnabled = useAutomationStore((s) => s.engineEnabled);
  const toggleEngine = useAutomationStore((s) => s.toggleEngine);
  const toggleRule = useAutomationStore((s) => s.toggleRule);
  const upsert = useAutomationStore((s) => s.upsert);
  const remove = useAutomationStore((s) => s.remove);
  const reorder = useAutomationStore((s) => s.reorder);
  const profiles = useProfileStore((s) => s.profiles);
  const telemetry = useDeviceStore((s) => s.telemetry);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("New rule");
  const [triggerType, setTriggerType] = useState<TriggerType>("battery-below");
  const [triggerValue, setTriggerValue] = useState("20");
  const [actionType, setActionType] = useState<ActionType>("apply-profile");
  const [actionValue, setActionValue] = useState("eco");

  const suggestions = suggestAutomation(telemetry, rules);
  const ordered = [...rules].sort((a, b) => a.priority - b.priority);

  const save = () => {
    upsert({
      name: name.trim() || "New rule",
      enabled: true,
      priority: rules.length + 1,
      trigger: { type: triggerType, value: triggerValue },
      action: { type: actionType, value: actionValue },
    });
    setOpen(false);
    toast.success("Rule created.");
  };

  return (
    <AppShell title="Automation" back="/">
      <Card className="border-border bg-card py-0">
        <CardContent className="flex items-center gap-3 p-4">
          <Workflow className="h-5 w-5 text-primary" aria-hidden />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Automation engine</h2>
            <p className="text-xs text-on-surface-variant">
              Rules are evaluated highest priority first, and only fire when the trigger has a real
              reading behind it.
            </p>
          </div>
          <Switch
            checked={engineEnabled}
            onCheckedChange={toggleEngine}
            aria-label="Enable the automation engine"
          />
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card className="border-primary/40 bg-primary/5 py-0">
          <CardContent className="space-y-2 p-4">
            <h2 className="text-sm font-semibold">Suggested from your readings</h2>
            {suggestions.map((suggestion) => (
              <p key={suggestion.name} className="text-xs text-on-surface-variant">
                <span className="font-medium text-foreground">{suggestion.name}</span> —{" "}
                {suggestion.reason}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Button className="min-h-11 w-full" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
        New rule
      </Button>

      {ordered.map((rule) => (
        <motion.div key={rule.id} layout>
          <Card className="border-border bg-card py-0">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    When {TRIGGER_LABELS[rule.trigger.type].toLowerCase()}{" "}
                    {rule.trigger.value && <strong>{rule.trigger.value}</strong>} → {" "}
                    {ACTION_LABELS[rule.action.type].toLowerCase()} {rule.action.value}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    Priority {rule.priority} ·{" "}
                    {rule.lastFiredAt
                      ? `last fired ${new Date(rule.lastFiredAt).toLocaleTimeString()}`
                      : "never fired"}
                  </p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(value) => toggleRule(rule.id, value)}
                  aria-label={`Enable ${rule.name}`}
                />
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-11"
                  aria-label={`Raise priority of ${rule.name}`}
                  onClick={() => reorder(rule.id, -1)}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-11"
                  aria-label={`Lower priority of ${rule.name}`}
                  onClick={() => reorder(rule.id, 1)}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="min-h-11 text-status-critical"
                  aria-label={`Delete ${rule.name}`}
                  onClick={() => {
                    remove(rule.id);
                    toast.success("Rule deleted.");
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New automation rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="rule-name">Name</Label>
              <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                aria-label="Condition value"
                placeholder="Value"
              />
            </div>
            <div>
              <Label>Action</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {actionType === "apply-profile" ? (
                <Select value={actionValue} onValueChange={setActionValue}>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-2"
                  value={actionValue}
                  onChange={(e) => setActionValue(e.target.value)}
                  aria-label="Action value"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save}>Create rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
