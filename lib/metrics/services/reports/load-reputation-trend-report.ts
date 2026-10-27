import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { brandCaseConfigSchema } from "@/lib/projects/case-templates";

import { METRICS_CONFIG } from "../../config";
import type { ReportContext, ReputationTrendReport } from "../../types";
import { bucketIndex, loadAspectBuckets } from "../../utils/load-aspect-buckets";

const PERIOD_INTERVAL: Record<ReputationTrendReport["period"], string> = {
  week: "1 week",
  month: "1 month",
  quarter: "3 months",
};

/**
 * Reputation index over the last `reputationTrendPeriods` periods of `caseConfig.period`,
 * oldest first, the running one last; independent of the requested period. Sums of L4.
 */
export async function loadReputationTrendReport(ctx: ReportContext): Promise<ReputationTrendReport> {
  const config = brandCaseConfigSchema.safeParse(ctx.caseConfig);
  const period: ReputationTrendReport["period"] = config.success ? config.data.period : "month";
  const unit = sql.raw(`'${period}'`);
  const step = sql.raw(`interval '${PERIOD_INTERVAL[period]}'`);

  const { rows: periodRows } = await db.execute<{ starts: string[] }>(sql`
    with p as (
      select date_trunc(${unit}, now() at time zone ${ctx.window.timezone})
        - ${METRICS_CONFIG.reputationTrendPeriods - 1}::int * ${step} as first
    )
    select array(
      select to_char(first + n * ${step}, 'YYYY-MM-DD')
      from generate_series(0, ${METRICS_CONFIG.reputationTrendPeriods - 1}::int) n
    ) as starts
    from p
  `);
  const starts = periodRows[0].starts;

  const [{ rows: aspects }, rows] = await Promise.all([
    db.execute<{ id: string }>(sql`
      select id from project_aspects where project_id = ${ctx.projectId}::uuid
    `),
    loadAspectBuckets(
      ctx.projectId,
      sql`d.date_key >= ${starts[0]}::date`,
      sql`to_char(date_trunc(${unit}, d.date_key), 'YYYY-MM-DD')`,
    ),
  ]);
  const aspectIds = aspects.map((aspect) => aspect.id);

  return {
    period,
    points: starts.map((start) => ({ start, index: bucketIndex(rows, start, aspectIds) })),
  };
}
