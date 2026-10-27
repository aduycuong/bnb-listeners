import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GREEN = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
const RED = "bg-destructive/10 text-destructive";
const BLUE = "bg-sky-500/10 text-sky-700 dark:text-sky-400";
const AMBER = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
const MUTED = "bg-muted text-muted-foreground";

const TONES: Record<string, string> = {
  success: GREEN,
  RUN_SUCCESS: GREEN,
  STEP_SUCCESS: GREEN,
  due: GREEN,
  DELIVERED: GREEN,
  failed: RED,
  RUN_FAILED: RED,
  STEP_FAILED: RED,
  "no-budget": RED,
  overdue: RED,
  missing: RED,
  ERROR: RED,
  FAILED: RED,
  running: BLUE,
  RUN_STARTED: BLUE,
  STEP_PROGRESS: BLUE,
  CREATED: BLUE,
  ACTIVE: BLUE,
  IN_PROGRESS: BLUE,
  pending: AMBER,
  STEP_RETRY: AMBER,
  RETRY: AMBER,
  RUN_CANCELED: MUTED,
  CANCELED: MUTED,
  hot: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  normal: BLUE,
  low: MUTED,
  paused: `${MUTED} line-through`,
  "not-due": MUTED,
};

/** Colored badge for run states, scheduler decisions and activity tiers. */
export function AdminStatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(TONES[value], className)}>
      {value}
    </Badge>
  );
}
