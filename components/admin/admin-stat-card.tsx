import Link from "next/link";

import { formatNumber } from "./admin-format";

/** One headline number with a breakdown underneath. */
export function AdminStatCard({
  label,
  value,
  href,
  breakdown,
}: {
  label: string;
  value: number;
  href?: string;
  breakdown?: Record<string, number>;
}) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
      {breakdown && Object.keys(breakdown).length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {Object.entries(breakdown).map(([key, count]) => (
            <li key={key} className="flex justify-between gap-2">
              <span>{key}</span>
              <span className="tabular-nums">{formatNumber(count)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );

  const className = "block rounded-xl border border-border p-4";

  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-muted/50`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
