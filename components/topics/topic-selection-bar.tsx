"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type TopicSelectionBarProps = {
  count: number;
  onDelete?: () => void;
  onMerge?: () => void;
  onCancel: () => void;
};

export function TopicSelectionBar({
  count,
  onDelete,
  onMerge,
  onCancel,
}: TopicSelectionBarProps) {
  const { isMobile, state } = useSidebar();

  if (count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed right-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] backdrop-blur transition-[left] duration-200 ease-linear supports-backdrop-filter:bg-background/80",
        isMobile
          ? "left-0"
          : state === "collapsed"
            ? "left-(--sidebar-width-icon)"
            : "left-(--sidebar-width)",
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <p className="text-sm font-medium" aria-live="polite">
          {count} selected
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={count < 2}
            onClick={onMerge}
          >
            Merge
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
