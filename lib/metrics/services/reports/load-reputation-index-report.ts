import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { reputationIndex, reputationPillarScore } from "../../formulas";
import type { ReportContext, ReputationIndexReport } from "../../types";
import { bucketIndex, loadAspectBuckets, sumCounts } from "../../utils/load-aspect-buckets";
import { periodDateSql } from "../../utils/resolve-report-window";

/**
 * Reputation index of the period and the one before (D26): each project aspect is a pillar,
 * scored from its NSS; the index is the mean of the scored pillars. Sums of L4.
 */
export async function loadReputationIndexReport(ctx: ReportContext): Promise<ReputationIndexReport> {
  const days = periodDateSql(ctx.window);
  const [{ rows: aspects }, rows] = await Promise.all([
    db.execute<{ id: string; key: string; name: string }>(sql`
      select id, key, name from project_aspects
      where project_id = ${ctx.projectId}::uuid
      order by sort_order, name
    `),
    loadAspectBuckets(
      ctx.projectId,
      days.either,
      sql`case when ${days.current} then 'current' else 'previous' end`,
    ),
  ]);

  const pillars = aspects.map((aspect) => {
    const counts = sumCounts(
      rows.filter((row) => row.bucket === "current" && row.aspect_id === aspect.id),
    );
    return {
      id: aspect.id,
      key: aspect.key,
      name: aspect.name,
      mentions: counts.positive + counts.neutral + counts.negative,
      score: reputationPillarScore(counts),
    };
  });

  return {
    index: {
      current: reputationIndex(pillars.map((pillar) => pillar.score)),
      previous: bucketIndex(rows, "previous", aspects.map((aspect) => aspect.id)),
    },
    pillars,
  };
}
