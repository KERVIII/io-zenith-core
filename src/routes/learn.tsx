import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookmarkCheck,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LESSONS, useLearnStore, type Lesson } from "@/stores/learn-store";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — IoBattery Pro Learning Centre" },
      {
        name: "description",
        content:
          "Plain-language and advanced lessons on battery health, charging, thermals, CPU governors, GPU load and rooted Android optimisation.",
      },
      { property: "og:title", content: "Learn — IoBattery Pro Learning Centre" },
      {
        property: "og:description",
        content:
          "Understand battery health, charging myths, thermal throttling and safe performance tuning on rooted Android.",
      },
    ],
  }),
  component: LearnPage,
});

const CATEGORIES = ["All", "Battery", "Charging", "Thermals", "CPU", "GPU", "Root", "Optimization"] as const;

function LessonCard({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const advanced = useLearnStore((s) => s.advanced);
  const bookmarks = useLearnStore((s) => s.bookmarks);
  const completed = useLearnStore((s) => s.completed);
  const toggleBookmark = useLearnStore((s) => s.toggleBookmark);
  const toggleCompleted = useLearnStore((s) => s.toggleCompleted);
  const markVisited = useLearnStore((s) => s.markVisited);

  const bookmarked = bookmarks.includes(lesson.id);
  const done = completed.includes(lesson.id);
  const body = advanced ? lesson.advanced : lesson.basic;
  const panelId = `lesson-panel-${lesson.id}`;

  return (
    <Card className="overflow-hidden border-border bg-card py-0">
      <CardContent className="p-0">
        <h3>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen((v) => !v);
              if (!open) markVisited(lesson.id);
            }}
            className="flex min-h-14 w-full items-start gap-3 p-4 text-left"
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                done ? "bg-status-healthy/15 text-status-healthy" : "bg-primary/12 text-primary",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{lesson.title}</span>
              <span className="block text-xs leading-snug text-on-surface-variant">
                {lesson.summary}
              </span>
              <span className="mt-1 flex items-center gap-2 text-[11px] text-on-surface-variant">
                <span className="rounded-full bg-secondary px-2 py-0.5">{lesson.category}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {lesson.minutes} min
                </span>
              </span>
            </span>
            <motion.span
              aria-hidden
              animate={reduced ? {} : { rotate: open ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="mt-1 text-on-surface-variant"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </button>
        </h3>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              key="panel"
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }
              }
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-border px-4 py-4">
                {body.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-relaxed text-on-surface-variant">
                    {paragraph}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={done ? "secondary" : "default"}
                    className="min-h-11"
                    onClick={() => toggleCompleted(lesson.id)}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    {done ? "Completed" : "Mark as read"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    aria-pressed={bookmarked}
                    onClick={() => toggleBookmark(lesson.id)}
                  >
                    <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    {bookmarked ? "Bookmarked" : "Bookmark"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function LearnPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);

  const advanced = useLearnStore((s) => s.advanced);
  const setAdvanced = useLearnStore((s) => s.setAdvanced);
  const bookmarks = useLearnStore((s) => s.bookmarks);
  const completed = useLearnStore((s) => s.completed);
  const recent = useLearnStore((s) => s.recent);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LESSONS.filter((lesson) => {
      if (category !== "All" && lesson.category !== category) return false;
      if (onlyBookmarks && !bookmarks.includes(lesson.id)) return false;
      if (!q) return true;
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.summary.toLowerCase().includes(q) ||
        lesson.keywords.some((k) => k.includes(q)) ||
        lesson.basic.concat(lesson.advanced).some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [query, category, onlyBookmarks, bookmarks]);

  const progress = Math.round((completed.length / LESSONS.length) * 100);
  const recentLessons = recent
    .map((id) => LESSONS.find((l) => l.id === id))
    .filter((l): l is Lesson => Boolean(l));

  return (
    <AppShell title="Learn" stream={false}>
      {/* Progress */}
      <Card className="border-border bg-card py-0">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Your progress</h2>
            <p className="text-xs text-on-surface-variant">
              {completed.length} of {LESSONS.length} lessons
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Learning progress"
            className="h-2 w-full overflow-hidden rounded-full bg-secondary"
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Label htmlFor="advanced-mode" className="text-xs font-medium">
              Advanced mode
              <span className="block font-normal text-on-surface-variant">
                Show kernel interfaces and trade-offs instead of plain summaries.
              </span>
            </Label>
            <Switch id="advanced-mode" checked={advanced} onCheckedChange={setAdvanced} />
          </div>
        </CardContent>
      </Card>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lessons"
            aria-label="Search lessons"
            className="min-h-11 rounded-full pl-9"
          />
        </div>
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2 pb-1">
            {CATEGORIES.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={category === item ? "default" : "secondary"}
                aria-pressed={category === item}
                className="min-h-9 rounded-full"
                onClick={() => setCategory(item)}
              >
                {item}
              </Button>
            ))}
            <Button
              size="sm"
              variant={onlyBookmarks ? "default" : "secondary"}
              aria-pressed={onlyBookmarks}
              className="min-h-9 rounded-full"
              onClick={() => setOnlyBookmarks((v) => !v)}
            >
              <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Saved
            </Button>
          </div>
        </div>
      </div>

      {/* Recent */}
      {recentLessons.length > 0 && !query && category === "All" && !onlyBookmarks && (
        <section aria-labelledby="recent-heading" className="space-y-2">
          <h2 id="recent-heading" className="px-1 text-sm font-semibold">
            Continue where you left off
          </h2>
          <div className="-mx-4 overflow-x-auto px-4">
            <ul className="flex w-max gap-2 pb-1">
              {recentLessons.map((lesson) => (
                <li key={lesson.id}>
                  <span className="flex h-full w-44 flex-col justify-between gap-2 rounded-2xl border border-border bg-card p-3">
                    <span className="text-xs font-medium leading-snug">{lesson.title}</span>
                    <span className="text-[11px] text-on-surface-variant">{lesson.category}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Lessons */}
      <section aria-labelledby="lessons-heading" className="space-y-2">
        <h2 id="lessons-heading" className="px-1 text-sm font-semibold">
          {onlyBookmarks ? "Saved lessons" : "Lessons"}
        </h2>
        {results.length === 0 ? (
          <Card className="border-border bg-card py-0">
            <CardContent className="space-y-1 p-6 text-center">
              <p className="text-sm font-medium">No lessons match</p>
              <p className="text-xs text-on-surface-variant">
                Try a different search term, or clear the filters to see all {LESSONS.length}{" "}
                lessons.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 min-h-11"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                  setOnlyBookmarks(false);
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {results.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
