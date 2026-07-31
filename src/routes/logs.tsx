import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { exportLogs, useLogStore, type LogLevel } from "@/stores/log-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Developer console — IoBattery Pro" },
      {
        name: "description",
        content:
          "Inspect every shell command, write outcome and rollback event, filter by level, and export redacted logs.",
      },
      { property: "og:title", content: "Developer console — IoBattery Pro" },
      { property: "og:description", content: "Filterable, exportable shell and event log." },
    ],
  }),
  component: LogsScreen,
});

const LEVELS: LogLevel[] = ["debug", "info", "success", "warn", "error"];
const TONE: Record<LogLevel, string> = {
  debug: "text-on-surface-variant",
  info: "text-primary",
  success: "text-status-healthy",
  warn: "text-status-warning",
  error: "text-status-critical",
};

function LogsScreen() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const autoScroll = useLogStore((s) => s.autoScroll);
  const setAutoScroll = useLogStore((s) => s.setAutoScroll);
  const [active, setActive] = useState<LogLevel[]>(LEVELS);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = entries.filter(
    (entry) =>
      active.includes(entry.level) &&
      (query === "" ||
        entry.message.toLowerCase().includes(query.toLowerCase()) ||
        entry.tag.includes(query.toLowerCase())),
  );

  const download = (format: "json" | "txt") => {
    const blob = new Blob([exportLogs(filtered, format)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `iobattery-log.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Log exported. Device identifiers are not included.");
  };

  return (
    <AppShell title="Developer console" back="/">
      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-3 p-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter messages…"
            aria-label="Filter log messages"
          />
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((level) => {
              const on = active.includes(level);
              return (
                <button
                  key={level}
                  aria-pressed={on}
                  onClick={() =>
                    setActive((current) =>
                      current.includes(level)
                        ? current.filter((l) => l !== level)
                        : [...current, level],
                    )
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs capitalize",
                    on ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {level}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={autoScroll} onCheckedChange={setAutoScroll} aria-label="Auto scroll" />
            <span className="flex-1 text-xs text-on-surface-variant">Auto-scroll</span>
            <Button size="sm" variant="outline" className="min-h-11" onClick={() => download("txt")}>
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
              TXT
            </Button>
            <Button size="sm" variant="outline" className="min-h-11" onClick={() => download("json")}>
              JSON
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-11 text-status-critical"
              aria-label="Clear log"
              onClick={clear}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card py-0">
        <CardContent className="p-0">
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-on-surface-variant">No entries match these filters.</p>
          )}
          <ul className="divide-y divide-border font-mono text-[11px]">
            {filtered.map((entry) => (
              <li key={entry.id}>
                <button
                  className="flex w-full items-start gap-2 px-3 py-2 text-left"
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  aria-expanded={expanded === entry.id}
                >
                  <span className="text-on-surface-variant">
                    {new Date(entry.at).toLocaleTimeString()}
                  </span>
                  <span className={cn("uppercase", TONE[entry.level])}>{entry.level}</span>
                  <span className="text-on-surface-variant">[{entry.tag}]</span>
                  <span className="flex-1 break-all">{entry.message}</span>
                </button>
                {expanded === entry.id && entry.detail && (
                  <pre className="whitespace-pre-wrap break-all bg-surface-container px-3 py-2 text-[11px] text-on-surface-variant">
                    {entry.detail}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}
