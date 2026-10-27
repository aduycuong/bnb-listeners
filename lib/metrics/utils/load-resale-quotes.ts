import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import type { ReportContext } from "../types";
import { periodSql } from "./resolve-report-window";

/** A resale quote (`price_quote`, million VND/m²) of a relevant mention. */
export type ResaleQuote = { authorId: string | null; day: string; amount: number };

/**
 * Resale quotes of the period and the one before. `kept` drops repeats (same author, day and
 * amount) and outliers (outside 1.5 × IQR over both periods); `quotes` and `unique` count the
 * period's quotes before those filters.
 */
export async function loadResaleQuotes(ctx: ReportContext) {
  const { rows } = await db.execute<{ author_id: string | null; day: string; amount: number }>(sql`
    select m.author_id,
      to_char(m.published_at at time zone ${ctx.window.timezone}, 'YYYY-MM-DD') as day,
      (x.data->>'amount')::double precision as amount
    from mention_extractions x
    join mentions m on m.id = x.mention_id
    where m.project_id = ${ctx.projectId}::uuid and m.is_relevant
      and x.schema_key = 'price_quote'
      and x.data->>'unit' = 'trieu_m2'
      and x.data->>'kind' = 'rao_ban'
      and jsonb_typeof(x.data->'amount') = 'number'
      and ${periodSql(ctx.window).either}
  `);
  const all = rows.map((row) => ({ authorId: row.author_id, day: row.day, amount: row.amount }));
  const currentDays = new Set(ctx.window.dates);
  const inPeriod = (quote: ResaleQuote) => currentDays.has(quote.day);
  const unique = dedupe(all);
  const kept = filterOutliers(unique);

  return {
    quotes: all.filter(inPeriod).length,
    unique: unique.filter(inPeriod).length,
    current: kept.filter(inPeriod),
    previous: kept.filter((quote) => !inPeriod(quote)),
  };
}

function dedupe(quotes: ResaleQuote[]) {
  const seen = new Set<string>();
  return quotes.filter((quote) => {
    const key = `${quote.authorId ?? "anon"}|${quote.day}|${quote.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterOutliers(quotes: ResaleQuote[]) {
  if (quotes.length < 4) return quotes;
  const sorted = quotes.map((quote) => quote.amount).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return quotes;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return quotes.filter((quote) => quote.amount >= lo && quote.amount <= hi);
}

function quantile(sorted: number[], q: number) {
  const index = (sorted.length - 1) * q;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
}
