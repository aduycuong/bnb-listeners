import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { EMOTIONS } from "@/lib/enrichment/config";

import { sharePercent } from "../../formulas";
import type { EmotionsReport, ReportContext } from "../../types";
import { periodDateSql } from "../../utils/resolve-report-window";

/** Mentions of the period per emotion, in the order of `EMOTIONS`; sums of L4. */
export async function loadEmotionsReport(ctx: ReportContext): Promise<EmotionsReport> {
  const { rows } = await db.execute<{ emotion: string; mentions: number }>(sql`
    select e.key as emotion, sum(e.value::int)::int as mentions
    from project_metrics_daily d, jsonb_each_text(d.emotions) e
    where d.project_id = ${ctx.projectId}::uuid and ${periodDateSql(ctx.window).current}
    group by e.key
  `);
  const counts = new Map(rows.map((row) => [row.emotion, row.mentions]));
  const total = EMOTIONS.reduce((sum, emotion) => sum + (counts.get(emotion) ?? 0), 0);

  return EMOTIONS.map((emotion) => {
    const mentions = counts.get(emotion) ?? 0;
    return { emotion, mentions, share: sharePercent(mentions, total) ?? 0 };
  });
}
