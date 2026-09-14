import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { resolveTermDetailChartPeriod } from "@/lib/terms/utils/resolve-term-detail-chart-period";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  DashboardTermGroupItem,
  GetDashboardTermGroupsResult,
} from "../types";

const TOP_TERMS_PER_GROUP = 10;

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
};

type RankedTermRow = {
  term_group_id: string;
  term_id: string;
  term_name: string;
  doc_count: number;
  trend_score: number | null;
  rn: number;
};

export async function getDashboardTermGroups(
  ctx: WorkspaceContext,
): Promise<GetDashboardTermGroupsResult> {
  const period = resolveTermDetailChartPeriod({ preset: "last_30_days" });

  const [groupsResult, rankedResult] = await Promise.all([
    db.execute<GroupRow>(sql`
      SELECT
        tg.id,
        tg.name,
        tg.description,
        COUNT(tgm.term_id)::int AS member_count
      FROM term_groups tg
      LEFT JOIN term_group_members tgm ON tgm.term_group_id = tg.id
      WHERE tg.workspace_id = ${ctx.workspaceId}::uuid
      GROUP BY tg.id, tg.name, tg.description
      ORDER BY tg.name ASC
    `),
    db.execute<RankedTermRow>(sql`
      WITH ranked AS (
        SELECT
          tgm.term_group_id,
          t.id AS term_id,
          t.name AS term_name,
          COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
          SUM(tdd.trend_score) AS trend_score,
          ROW_NUMBER() OVER (
            PARTITION BY tgm.term_group_id
            ORDER BY SUM(tdd.trend_score) DESC NULLS LAST, t.name ASC
          ) AS rn
        FROM term_group_members tgm
        INNER JOIN terms t ON t.id = tgm.term_id
        LEFT JOIN term_digest_daily tdd
          ON tdd.term_id = t.id
          AND tdd.date_key >= ${period.startDate}::date
          AND tdd.date_key <= ${period.endDate}::date
        WHERE t.workspace_id = ${ctx.workspaceId}::uuid
        GROUP BY tgm.term_group_id, t.id, t.name
      )
      SELECT *
      FROM ranked
      WHERE rn <= ${TOP_TERMS_PER_GROUP}
      ORDER BY term_group_id ASC, trend_score DESC NULLS LAST
    `),
  ]);

  // Group ranked terms by term_group_id
  const termsByGroup = new Map<string, RankedTermRow[]>();
  for (const row of rankedResult.rows) {
    const list = termsByGroup.get(row.term_group_id) ?? [];
    list.push(row);
    termsByGroup.set(row.term_group_id, list);
  }

  const groups: DashboardTermGroupItem[] = groupsResult.rows.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    memberCount: group.member_count,
    topTerms: (termsByGroup.get(group.id) ?? []).map((row) => ({
      id: row.term_id,
      name: row.term_name,
      docCount: row.doc_count,
      trendScore: row.trend_score,
    })),
  }));

  return {
    groups,
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
    },
  };
}
