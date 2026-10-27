import { sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";

import { reputationIndex, reputationPillarScore } from "../formulas";

export type SentimentCounts = { positive: number; neutral: number; negative: number };

export type AspectBucketRow = SentimentCounts & { bucket: string; aspect_id: string };

/** Aspect sentiment counts per bucket over the L4 days in range (aspects follow D14). */
export async function loadAspectBuckets(projectId: string, inRange: SQL, bucket: SQL) {
  const { rows } = await db.execute<AspectBucketRow>(sql`
    select ${bucket} as bucket, d.aspect_id,
      sum(d.positive)::int as positive,
      sum(d.neutral)::int as neutral,
      sum(d.negative)::int as negative
    from project_aspect_daily d
    where d.project_id = ${projectId}::uuid and ${inRange}
    group by 1, 2
  `);
  return rows;
}

export function sumCounts(rows: SentimentCounts[]): SentimentCounts {
  return rows.reduce(
    (sum, row) => ({
      positive: sum.positive + row.positive,
      neutral: sum.neutral + row.neutral,
      negative: sum.negative + row.negative,
    }),
    { positive: 0, neutral: 0, negative: 0 },
  );
}

/** Reputation index of one bucket: the mean of its pillar scores (D26). */
export function bucketIndex(rows: AspectBucketRow[], bucket: string, aspectIds: string[]) {
  return reputationIndex(
    aspectIds.map((aspectId) =>
      reputationPillarScore(
        sumCounts(rows.filter((row) => row.bucket === bucket && row.aspect_id === aspectId)),
      ),
    ),
  );
}
