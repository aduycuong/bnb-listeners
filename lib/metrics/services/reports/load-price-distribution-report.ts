import type { PriceDistributionReport, ReportContext } from "../../types";
import { loadResaleQuotes } from "../../utils/load-resale-quotes";
import { priceBuckets } from "../../utils/price-buckets";

/** Kept resale quotes of the period in price buckets. */
export async function loadPriceDistributionReport(
  ctx: ReportContext,
): Promise<PriceDistributionReport> {
  const { current } = await loadResaleQuotes(ctx);
  return { buckets: priceBuckets(current.map((quote) => quote.amount)), used: current.length };
}
