import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import {
  TOPIC_CARD_PAGE_SIZE,
  TOPIC_CARD_SPARKLINE_DAYS,
  type TopicCardSort,
} from "../topic-card-config";
import type {
  ListTopicCardsParams,
  ListTopicCardsResult,
  TopicCardDigest,
  TopicCardItem,
  TopicCardSparklinePoint,
} from "../types";
import {
  buildSparklineDateKeys,
  resolveTopicCardPeriod,
} from "../utils/resolve-topic-card-period";
import {
  resolveTopicCardGroupIds,
  resolveTopicCardQuerySource,
} from "../utils/resolve-topic-card-query-source";
import { toDateKey } from "../utils/to-date-key";

type TopicCardRow = {
  id: string;
  name: string;
  parent_name: string | null;
  description: string | null;
  verified: boolean;
  created_by: string;
  created_at: Date | string;
  doc_count: number;
  avg_quality_score: number | null;
  trend_score: number | null;
  is_stale: boolean;
};

type SparklineRow = {
  topic_id: string;
  date_key: string;
  doc_count: number;
};

function getOrderClause(sort: TopicCardSort) {
  switch (sort) {
    case "count":
      return sql`doc_count DESC, name ASC`;
    case "quality":
      return sql`avg_quality_score DESC NULLS LAST, name ASC`;
    case "trend":
    default:
      return sql`trend_score DESC NULLS LAST, name ASC`;
  }
}

function toIsoTimestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDigest(row: TopicCardRow): TopicCardDigest {
  return {
    docCount: row.doc_count,
    avgQualityScore: row.avg_quality_score,
    trendScore: row.trend_score,
    isStale: row.is_stale,
  };
}

function buildSparklineSeries(
  topicId: string,
  dateKeys: string[],
  rows: SparklineRow[],
): TopicCardSparklinePoint[] {
  const countsByDate = new Map<string, number>();

  for (const row of rows) {
    if (row.topic_id !== topicId) {
      continue;
    }

    countsByDate.set(row.date_key, row.doc_count);
  }

  return dateKeys.map((dateKey) => ({
    dateKey,
    docCount: countsByDate.get(dateKey) ?? 0,
  }));
}

export async function listTopicCards(
  params: ListTopicCardsParams,
  ctx: WorkspaceContext,
): Promise<ListTopicCardsResult> {
  const limit = params.limit ?? TOPIC_CARD_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const period = resolveTopicCardPeriod({
    preset: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const querySource = resolveTopicCardQuerySource({
    preset: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const resolvedGroupIds = resolveTopicCardGroupIds(params.groupIds);

  // Build an optional group filter fragment. When resolvedGroupIds is null the
  // query aggregates across all source groups (no WHERE on group_id).
  const groupFilter = resolvedGroupIds
    ? sql`AND tdd.group_id = ANY(ARRAY[${sql.join(
        resolvedGroupIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])`
    : sql``;

  const sparklineDateKeys = buildSparklineDateKeys(
    toDateKey(new Date()),
    TOPIC_CARD_SPARKLINE_DAYS,
  );
  const sparklineStart = sparklineDateKeys[0]!;
  const sparklineEnd = sparklineDateKeys[sparklineDateKeys.length - 1]!;

  // All period presets use the daily table; the group filter is optional.
  const result = await db.execute<TopicCardRow>(sql`
    SELECT
      t.id,
      t.name,
      parent.name AS parent_name,
      t.description,
      t.verified,
      t.created_by,
      t.created_at,
      COALESCE(SUM(tdd.doc_count), 0)::int AS doc_count,
      AVG(tdd.avg_quality_score) AS avg_quality_score,
      SUM(tdd.trend_score) AS trend_score,
      COALESCE(BOOL_OR(tdd.is_stale), false) AS is_stale
    FROM topics t
    LEFT JOIN topics parent ON parent.id = t.parent_id
    LEFT JOIN topic_digest_daily tdd
      ON tdd.topic_id = t.id
      AND tdd.date_key >= ${querySource.startDate}::date
      AND tdd.date_key <= ${querySource.endDate}::date
      ${groupFilter}
    WHERE t.workspace_id = ${ctx.workspaceId}::uuid
    GROUP BY
      t.id,
      t.name,
      parent.name,
      t.description,
      t.verified,
      t.created_by,
      t.created_at
    ORDER BY ${getOrderClause(params.sort)}
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `);

  const rows = result.rows;
  const pageRows = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const topicIds = pageRows.map((row) => row.id);

  // Sparkline filter: same group filter applied to the 7-day sparkline.
  const sparklineGroupFilter = resolvedGroupIds
    ? sql`AND tdd.group_id = ANY(ARRAY[${sql.join(
        resolvedGroupIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])`
    : sql``;

  let sparklineRows: SparklineRow[] = [];
  if (topicIds.length > 0) {
    const sparklineResult = await db.execute<SparklineRow>(sql`
      SELECT
        tdd.topic_id,
        tdd.date_key,
        tdd.doc_count
      FROM topic_digest_daily tdd
      WHERE tdd.topic_id = ANY(ARRAY[${sql.join(
        topicIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )}])
        AND tdd.date_key >= ${sparklineStart}::date
        AND tdd.date_key <= ${sparklineEnd}::date
        ${sparklineGroupFilter}
      ORDER BY tdd.topic_id, tdd.date_key
    `);
    sparklineRows = sparklineResult.rows;
  }

  const items: TopicCardItem[] = pageRows.map((row) => ({
    id: row.id,
    name: row.name,
    parentName: row.parent_name,
    description: row.description,
    verified: row.verified,
    createdBy: row.created_by,
    createdAt: toIsoTimestamp(row.created_at),
    digest: toDigest(row),
    sparkline: buildSparklineSeries(row.id, sparklineDateKeys, sparklineRows),
  }));

  return {
    items,
    hasMore,
    offset,
    limit,
    period,
  };
}
