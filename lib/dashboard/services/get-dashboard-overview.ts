import { asc, count, desc, eq, gte, and, inArray, sql } from "drizzle-orm";

import {
  alerts,
  projectSources,
  projects,
  workspaceApiKeys,
  workspaceMembers,
} from "@/db/schema";
import { db } from "@/lib/db";
import {
  effectiveSentimentJoins,
  effectiveSentimentSql,
} from "@/lib/enrichment/utils/effective-sentiment-sql";
import { netSentimentScore, sharePercent } from "@/lib/metrics/formulas";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import { DASHBOARD_CONFIG, DEMO_PLAN } from "../config";
import type {
  DashboardDailyMentionsPoint,
  DashboardProjectRow,
  DashboardSentimentCounts,
  GetDashboardOverviewResult,
} from "../types";

type ProjectPeriodRow = DashboardSentimentCounts & {
  project_id: string;
  period: "current" | "previous";
  mentions: number;
};

type DailyRow = DashboardSentimentCounts & { date_key: string };

const sentimentCountsSql = sql`
  (count(*) filter (where ${effectiveSentimentSql} = 'positive'))::int as positive,
  (count(*) filter (where ${effectiveSentimentSql} = 'neutral'))::int as neutral,
  (count(*) filter (where ${effectiveSentimentSql} = 'negative'))::int as negative,
  (count(*) filter (where ${effectiveSentimentSql} is null))::int as unknown`;

function addCounts(
  total: DashboardSentimentCounts,
  row: DashboardSentimentCounts,
): DashboardSentimentCounts {
  return {
    positive: total.positive + row.positive,
    neutral: total.neutral + row.neutral,
    negative: total.negative + row.negative,
    unknown: total.unknown + row.unknown,
  };
}

function emptyCounts(): DashboardSentimentCounts {
  return { positive: 0, neutral: 0, negative: 0, unknown: 0 };
}

function negativeShareOf(counts: DashboardSentimentCounts) {
  return sharePercent(
    counts.negative,
    counts.positive + counts.neutral + counts.negative,
  );
}

/**
 * Numbers of the workspace Overview: relevant mentions of every project over the period against
 * the period before, mentions per day by sentiment, a row per project, recent alerts and usage
 * against the demo plan. Reads L3 directly, like the project pages (docs/decisions.md D17).
 */
export async function getDashboardOverview(
  ctx: WorkspaceContext,
): Promise<GetDashboardOverviewResult> {
  const { periodDays, timezone } = DASHBOARD_CONFIG;
  const workspaceId = ctx.workspaceId;

  // Midnight, in `timezone`, of the first day of the period and of the period before.
  const startOfDay = (daysBack: number) =>
    sql`((date_trunc('day', now() at time zone ${timezone}) - ${`${daysBack} days`}::interval) at time zone ${timezone})`;
  const start = startOfDay(periodDays - 1);
  const previousStart = startOfDay(periodDays * 2 - 1);
  const scope = sql`p.workspace_id = ${workspaceId}::uuid and m.is_relevant`;

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      case: projects.listeningCase,
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(asc(projects.createdAt));
  const projectIds = projectRows.map((row) => row.id);

  const [
    { rows: periodRows },
    { rows: dailyRows },
    alertCounts,
    recentAlertRows,
    [memberCount],
    [apiKeyCount],
    sourceCount,
    analyzed,
  ] = await Promise.all([
    db.execute<ProjectPeriodRow>(sql`
      select m.project_id,
        case when m.published_at >= ${start} then 'current' else 'previous' end as period,
        count(*)::int as mentions,
        ${sentimentCountsSql}
      from mentions m
      join projects p on p.id = m.project_id
      ${effectiveSentimentJoins}
      where ${scope} and m.published_at >= ${previousStart}
      group by 1, 2
    `),
    db.execute<DailyRow>(sql`
      select to_char(m.published_at at time zone ${timezone}, 'YYYY-MM-DD') as date_key,
        ${sentimentCountsSql}
      from mentions m
      join projects p on p.id = m.project_id
      ${effectiveSentimentJoins}
      where ${scope} and m.published_at >= ${start}
      group by 1
    `),
    projectIds.length
      ? db
          .select({ projectId: alerts.projectId, total: count() })
          .from(alerts)
          .where(
            and(
              inArray(alerts.projectId, projectIds),
              gte(alerts.triggeredAt, sql`${start}`),
            ),
          )
          .groupBy(alerts.projectId)
      : Promise.resolve([]),
    projectIds.length
      ? db
          .select({
            id: alerts.id,
            projectId: alerts.projectId,
            kind: alerts.kind,
            level: alerts.level,
            title: alerts.title,
            triggeredAt: alerts.triggeredAt,
          })
          .from(alerts)
          .where(inArray(alerts.projectId, projectIds))
          .orderBy(desc(alerts.triggeredAt))
          .limit(DASHBOARD_CONFIG.recentAlerts)
      : Promise.resolve([]),
    db
      .select({ total: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId)),
    db
      .select({ total: count() })
      .from(workspaceApiKeys)
      .where(eq(workspaceApiKeys.workspaceId, workspaceId)),
    projectIds.length
      ? db
          .select({
            total: sql<number>`count(distinct ${projectSources.sourceId})::int`,
          })
          .from(projectSources)
          .where(inArray(projectSources.projectId, projectIds))
          .then(([row]) => row?.total ?? 0)
      : Promise.resolve(0),
    db.execute<{ total: number }>(sql`
      select count(distinct me.mention_id)::int as total
      from mention_enrichments me
      join mentions m on m.id = me.mention_id
      join projects p on p.id = m.project_id
      where p.workspace_id = ${workspaceId}::uuid
        and me.status = 'done'
        and me.enriched_at >= (date_trunc('month', now() at time zone ${timezone}) at time zone ${timezone})
    `),
  ]);

  // Mentions per day, with the days without mentions filled in.
  const dailyByKey = new Map(dailyRows.map((row) => [row.date_key, row]));
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const today = new Date(`${todayKey}T00:00:00Z`);
  const daily: DashboardDailyMentionsPoint[] = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const dateKey = day.toISOString().slice(0, 10);
    const row = dailyByKey.get(dateKey);
    daily.push({
      dateKey,
      positive: row?.positive ?? 0,
      neutral: row?.neutral ?? 0,
      negative: row?.negative ?? 0,
      unknown: row?.unknown ?? 0,
    });
  }

  const alertsByProject = new Map(
    alertCounts.map((row) => [row.projectId, row.total]),
  );
  const currentByProject = new Map<string, ProjectPeriodRow>();
  const previousByProject = new Map<string, ProjectPeriodRow>();
  for (const row of periodRows) {
    (row.period === "current" ? currentByProject : previousByProject).set(
      row.project_id,
      row,
    );
  }

  let currentCounts = emptyCounts();
  let previousCounts = emptyCounts();
  let mentions = 0;
  let previousMentions = 0;
  const projectItems: DashboardProjectRow[] = projectRows.map((row, index) => {
    const current = currentByProject.get(row.id);
    const previous = previousByProject.get(row.id);
    const counts = current ?? emptyCounts();
    currentCounts = addCounts(currentCounts, counts);
    previousCounts = addCounts(previousCounts, previous ?? emptyCounts());
    mentions += current?.mentions ?? 0;
    previousMentions += previous?.mentions ?? 0;
    return {
      id: row.id,
      name: row.name,
      case: row.case as DashboardProjectRow["case"],
      projectIndex: index,
      mentions: current?.mentions ?? 0,
      previousMentions: previous?.mentions ?? 0,
      nss: netSentimentScore(counts),
      negativeShare: negativeShareOf(counts),
      alerts: alertsByProject.get(row.id) ?? 0,
    };
  });

  const projectById = new Map(projectItems.map((item) => [item.id, item]));
  const limits = DEMO_PLAN.limits;

  return {
    periodDays,
    timezone,
    totals: {
      projects: projectRows.length,
      mentions,
      previousMentions,
      nss: netSentimentScore(currentCounts),
      previousNss: netSentimentScore(previousCounts),
      negativeShare: negativeShareOf(currentCounts),
      alerts: projectItems.reduce((sum, item) => sum + item.alerts, 0),
    },
    daily,
    projects: [...projectItems]
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, DASHBOARD_CONFIG.topProjects),
    recentAlerts: recentAlertRows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      projectName: projectById.get(row.projectId)?.name ?? "",
      projectIndex: projectById.get(row.projectId)?.projectIndex ?? 0,
      kind: row.kind,
      level: row.level,
      title: row.title,
      triggeredAt: row.triggeredAt.toISOString(),
    })),
    usage: {
      planName: DEMO_PLAN.name,
      projects: { used: projectRows.length, limit: limits.projects },
      members: { used: memberCount?.total ?? 0, limit: limits.members },
      sources: { used: sourceCount, limit: limits.sources },
      analyzedMentions: {
        used: analyzed.rows[0]?.total ?? 0,
        limit: limits.analyzedMentions,
      },
      apiKeys: { used: apiKeyCount?.total ?? 0, limit: limits.apiKeys },
    },
  };
}
