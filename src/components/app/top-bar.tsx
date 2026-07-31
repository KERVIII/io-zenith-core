import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, MoreVertical, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDeviceStore } from "@/stores/device-store";
import { searchApp } from "@/features/ai/insight";

const MENU = [
  { to: "/profiles", label: "Profiles" },
  { to: "/automation", label: "Automation" },
  { to: "/network", label: "Network" },
  { to: "/logs", label: "Developer Console" },
  { to: "/backup", label: "Backup & Restore" },
  { to: "/permissions", label: "Permission Center" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
] as const;

/** Top app bar: title, universal search, and the overflow destinations. */
export function TopBar({ title, back }: { title: string; back?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const telemetry = useDeviceStore((s) => s.telemetry);
  const results = useMemo(() => searchApp(query, telemetry), [query, telemetry]);

  return (
    <header className="glass-surface sticky top-0 z-30 border-b border-border bg-background/90">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
        {back ? (
          <Link
            to={back}
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-container"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        ) : (
          <span className="w-2" />
        )}
        <h1 className="flex-1 truncate px-1 text-lg font-semibold tracking-tight">{title}</h1>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          aria-label="Search the app"
          onClick={() => setOpen(true)}
        >
          <Search className="h-5 w-5" aria-hidden />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full"
              aria-label="More destinations"
            >
              <MoreVertical className="h-5 w-5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Destinations</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MENU.map((item) => (
              <DropdownMenuItem key={item.to} asChild>
                <Link to={item.to}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search screens, settings and live metrics…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="Results">
            {results.map((result) => (
              <CommandItem
                key={`${result.type}-${result.label}`}
                value={`${result.label} ${result.detail}`}
                onSelect={() => {
                  setOpen(false);
                  void navigate({ to: result.route });
                }}
              >
                <span className="flex-1">{result.label}</span>
                <span className="text-xs text-on-surface-variant">{result.detail}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
