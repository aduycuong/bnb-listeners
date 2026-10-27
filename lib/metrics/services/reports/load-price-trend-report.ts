import { projectCaseConfigSchema } from "@/lib/projects/case-templates";

import type { PriceTrendReport, ReportContext } from "../../types";
import { loadResaleQuotes } from "../../utils/load-resale-quotes";
import { median } from "../../utils/median";

/** Daily and period medians of kept resale quotes, million VND/m², against the reference price. */
export async function loadPriceTrendReport(ctx: ReportContext): Promise<PriceTrendReport> {
  const quotes = await loadResaleQuotes(ctx);
  const config = projectCaseConfigSchema.safeParse(ctx.caseConfig);
  const amounts = (list: typeof quotes.current) => list.map((quote) => quote.amount);

  return {
    daily: ctx.window.dates.map((date) => ({
      date,
      median: median(amounts(quotes.current.filter((quote) => quote.day === date))),
    })),
    median: { current: median(amounts(quotes.current)), previous: median(amounts(quotes.previous)) },
    priceRef: config.success ? (config.data.priceRef ?? null) : null,
    quotes: quotes.quotes,
    used: quotes.current.length,
    droppedOutlier: quotes.unique - quotes.current.length,
  };
}
