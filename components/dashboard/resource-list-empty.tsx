import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ResourceListEmptyProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function ResourceListEmpty({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: ResourceListEmptyProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <Button
          nativeButton={false}
          render={<Link href={actionHref} />}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
