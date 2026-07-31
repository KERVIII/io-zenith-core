import { AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Destructive-action confirmation with an explicit impact summary.
 * Nothing that writes to the device happens without one of these.
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  impact,
  confirmLabel = "Apply",
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  impact: string[];
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-4 w-4 text-status-critical" aria-hidden />}
            {title}
          </SheetTitle>
          <SheetDescription>What this change will do:</SheetDescription>
        </SheetHeader>
        <ul className="space-y-2 px-4 text-sm text-on-surface-variant">
          {impact.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" className="min-h-11 flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="min-h-11 flex-1"
            variant={destructive ? "destructive" : "default"}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
