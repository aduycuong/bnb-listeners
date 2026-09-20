import { cn } from "@/lib/utils";

type DocumentListChildBranchProps = {
  isFirst: boolean;
  isLast: boolean;
};

export function DocumentListChildBranch({
  isFirst,
  isLast,
}: DocumentListChildBranchProps) {
  return (
    <div
      className="relative w-5 shrink-0 self-stretch sm:w-6"
      aria-hidden
    >
      <div
        className={cn(
          "absolute left-1/2 w-px -translate-x-1/2 bg-border/80",
          isFirst ? "top-0 h-6" : "-top-2.5 h-8.5",
        )}
      />

      <div className="absolute top-6 left-1/2 h-5 w-full rounded-bl-xl border-b border-l border-border/80" />

      {!isLast ? (
        <div className="absolute top-11 -bottom-2.5 left-1/2 w-px -translate-x-1/2 bg-border/80" />
      ) : null}
    </div>
  );
}
