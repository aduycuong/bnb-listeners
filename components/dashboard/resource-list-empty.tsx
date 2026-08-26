import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ResourceListEmptyProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
};

export function ResourceListEmpty({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: ResourceListEmptyProps) {
  const action =
    actionLabel && actionHref ? (
      <Button
        nativeButton={false}
        render={<Link href={actionHref} />}
        className="mt-4"
      >
        {actionLabel}
      </Button>
    ) : actionLabel && onAction ? (
      <Button type="button" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
