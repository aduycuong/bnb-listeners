import type { ReactNode } from "react";

/** Label / value grid for detail pages. */
export function AdminKeyValues({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-all">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
