import { eq, sql } from "drizzle-orm";

import { termGroupMembers, termGroups } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type {
  GetTermDetailSummaryParams,
  GetTermDetailSummaryResult,
} from "../types";
import { getTerm } from "./get-term";
import { getTermChart } from "./get-term-chart";

export async function getTermDetailSummary(
  params: GetTermDetailSummaryParams,
  ctx: WorkspaceContext,
): Promise<GetTermDetailSummaryResult> {
  const [term, chart, groupRows] = await Promise.all([
    getTerm({ id: params.id }, ctx),
    getTermChart(
      {
        id: params.id,
        period: params.period,
        metric: "doc_count",
      },
      ctx,
    ),
    db
      .select({
        id: termGroups.id,
        name: termGroups.name,
      })
      .from(termGroupMembers)
      .innerJoin(termGroups, eq(termGroupMembers.termGroupId, termGroups.id))
      .where(
        sql`${termGroupMembers.termId} = ${params.id}::uuid
          AND ${termGroups.workspaceId} = ${ctx.workspaceId}::uuid`,
      )
      .orderBy(termGroups.name),
  ]);

  return {
    term: {
      id: term.id,
      name: term.name,
      description: term.description,
      createdAt: term.createdAt,
      listeningStartedAt: term.listeningStartedAt,
      groups: groupRows,
    },
    digest: chart.digest,
    chart: {
      metric: chart.metric,
      bucket: chart.bucket,
      period: chart.period,
      points: chart.points,
    },
  };
}
