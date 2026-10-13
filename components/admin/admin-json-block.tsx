import { cn } from "@/lib/utils";

/** Pretty-printed JSON in a scrollable block. */
export function AdminJsonBlock({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap",
        className,
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
