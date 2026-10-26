import { and, asc, count, eq, gte, inArray, sql } from "drizzle-orm";

import { alerts, projectSources, projects } from "@/db/schema";
import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { ownMentionSql } from "@/lib/mentions/utils/own-mention-sql";
import { METRICS_CONFIG } from "@/lib/metrics/config";
import { netSentimentScore, sharePercent } from "@/lib/metrics/formulas";

import type {
  ListProjectSummariesParams,
  ListProjectSummariesResult,
  ProjectSummaryDailyPoint,
} from "../types";
import { toProjectListItem } from "../utils/to-project-list-item";

type DailyRow = {
  project_id: string;
  date_key: string;
  mentions: number;
  positive: number;
  neutral: number;
  negative: number;
};

/** Today's date key (`YYYY-MM-DD`) in a timezone. */
function todayKey(timezone: string) {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Projects of a workspace with the numbers of the project list cards: relevant mentions of the
 * last days against the days before, sentiment, alerts, followed sources and mentions per day.
 * Days are whole days of each project's timezone, today included (docs/decisions.md D17).
 */
export async function listProjectSummaries(
  params: ListProjectSummariesParams,
): Promise<ListProjectSummariesResult> {
  const periodDays = METRICS_CONFIG.defaultReportPeriodDays;

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, params.workspaceId))
    .orderBy(asc(projects.createdAt));
  const projectIds = projectRows.map((row) => row.id);

  if (!projectIds.length) {
    return { periodDays, items: [] };
  }

  // Midnight, in the project's timezone, of the first day of the period before.
  const previousStart = sql`((date_trunc('day', now() at time zone p.timezone) - ${`${periodDays * 2 - 1} days`}::interval) at time zone p.timezone)`;

  const [{ rows: dailyRows }, alertRows, sourceRows] = await Promise.all([
    db.execute<DailyRow>(sql`
      select m.project_id,
        to_char(m.published_at at time zone p.timezone, 'YYYY-MM-DD') as date_key,
        count(*)::int as mentions,
        (count(*) filter (where ${effectiveSentimentSql} = 'positive'))::int as positive,
        (count(*) filter (where ${effectiveSentimentSql} = 'neutral'))::int as neutral,
        (count(*) filter (where ${effectiveSentimentSql} = 'negative'))::int as negative
      from mentions m
      join projects p on p.id = m.project_id
      ${effectiveSentimentJoins}
      where p.workspace_id = ${params.workspaceId}::uuid
        and m.is_relevant and ${ownMentionSql}
        and m.published_at >= ${previousStart}
      group by 1, 2
    `),
    db
      .select({ projectId: alerts.projectId, total: count() })
      .from(alerts)
      .where(
        and(
          inArray(alerts.projectId, projectIds),
          gte(alerts.triggeredAt, sql`now() - ${`${periodDays} days`}::interval`),
        ),
      )
      .groupBy(alerts.projectId),
    db
      .select({ projectId: projectSources.projectId, total: count() })
      .from(projectSources)
      .where(inArray(projectSources.projectId, projectIds))
      .groupBy(projectSources.projectId),
  ]);

  const alertsByProject = new Map(alertRows.map((row) => [row.projectId, row.total]));
  const sourcesByProject = new Map(sourceRows.map((row) => [row.projectId, row.total]));
  const dailyByProject = new Map<string, DailyRow[]>();
  for (const row of dailyRows) {
    const list = dailyByProject.get(row.project_id) ?? [];
    list.push(row);
    dailyByProject.set(row.project_id, list);
  }

  const items = projectRows.map((row) => {
    const today = todayKey(row.timezone);
    const startKey = shiftDateKey(today, -(periodDays - 1));
    const rows = dailyByProject.get(row.id) ?? [];
    const byKey = new Map(rows.map((item) => [item.date_key, item]));

    const daily: ProjectSummaryDailyPoint[] = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const dateKey = shiftDateKey(today, -i);
      daily.push({ dateKey, mentions: byKey.get(dateKey)?.mentions ?? 0 });
    }

    const counts = { positive: 0, neutral: 0, negative: 0 };
    let mentions = 0;
    let previousMentions = 0;
    for (const item of rows) {
      if (item.date_key >= startKey) {
        mentions += item.mentions;
        counts.positive += item.positive;
        counts.neutral += item.neutral;
        counts.negative += item.negative;
      } else {
        previousMentions += item.mentions;
      }
    }

    return {
      ...toProjectListItem(row),
      mentions,
      previousMentions,
      nss: netSentimentScore(counts),
      negativeShare: sharePercent(
        counts.negative,
        counts.positive + counts.neutral + counts.negative,
      ),
      alerts: alertsByProject.get(row.id) ?? 0,
      sources: sourcesByProject.get(row.id) ?? 0,
      daily,
    };
  });

  return { periodDays, items };
}
