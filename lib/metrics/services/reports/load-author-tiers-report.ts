import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

import { AUTHOR_TIERS, type AuthorTier } from "../../config";
import { authorTier } from "../../formulas";
import type { AuthorTiersReport, ReportContext } from "../../types";
import { periodSql } from "../../utils/resolve-report-window";

/** Authors of the period per group (`AUTHOR_TIERS`); reads L3. */
export async function loadAuthorTiersReport(ctx: ReportContext): Promise<AuthorTiersReport> {
  const { rows } = await db.execute<{ follower_count: number | null; author_type: string | null }>(sql`
    select a.follower_count, a.author_type
    from authors a
    where a.id in (
      select m.author_id from mentions m
      where m.project_id = ${ctx.projectId}::uuid and m.is_relevant
        and ${periodSql(ctx.window).current}
    )
  `);

  const counts = new Map<AuthorTier, number>();
  for (const row of rows) {
    const tier = authorTier({ followerCount: row.follower_count, authorType: row.author_type });
    counts.set(tier, (counts.get(tier) ?? 0) + 1);
  }
  return {
    tiers: AUTHOR_TIERS.map(({ key }) => ({ tier: key, authors: counts.get(key) ?? 0 })),
    withoutFollowers: rows.filter((row) => row.follower_count === null).length,
  };
}
