import { netSentimentScore } from "../../formulas";
import type { ReportContext, SentimentTrendReport } from "../../types";
import { loadDailySentiment } from "../../utils/load-daily-sentiment";

/** Mentions of each day of the period by sentiment, with the day's NSS; from L4. */
export async function loadSentimentTrendReport(ctx: ReportContext): Promise<SentimentTrendReport> {
  const daily = await loadDailySentiment(ctx.projectId, ctx.window);
  return daily.map((day) => ({ ...day, nss: netSentimentScore(day) }));
}
