import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import {
  authors,
  contentItems,
  itemLabels,
  mentionAspects,
  mentionEnrichments,
  mentionExtractions,
  mentions,
  mentionSentiments,
  mentionTopics,
  projectAspects,
  sources,
  topics,
} from "@/db/schema";
import { db } from "@/lib/db";
import { resolveReportWindow } from "@/lib/metrics/utils/resolve-report-window";

import { MENTION_PAGE_SIZE } from "../schema";
import type { ListMentionsParams, ListMentionsResult, MentionListItem } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mentions of a project, newest first, with the item text and any label. */
export async function listMentions(params: ListMentionsParams): Promise<ListMentionsResult> {
  const root = alias(contentItems, "root_item");
  const filters: (SQL | undefined)[] = [eq(mentions.projectId, params.projectId)];

  if (params.relevance === "relevant") filters.push(eq(mentions.isRelevant, true));
  if (params.relevance === "rejected") filters.push(eq(mentions.isRelevant, false));
  if (params.matchType !== "all") filters.push(eq(mentions.matchType, params.matchType));
  if (params.kind !== "all") filters.push(eq(mentions.kind, params.kind));
  if (params.labeled === "yes") filters.push(sql`${itemLabels.id} is not null`);
  if (params.labeled === "no") filters.push(sql`${itemLabels.id} is null`);
  if (params.entityId) {
    filters.push(sql`${mentions.matchedEntityIds} @> ${JSON.stringify([params.entityId])}::jsonb`);
  }
  if (params.topicId) {
    filters.push(sql`exists (
      select 1 from mention_topics mt
      where mt.mention_id = ${mentions.id} and mt.topic_id = ${params.topicId}
    )`);
  }
  if (params.schemaKey !== "all") {
    filters.push(sql`exists (
      select 1 from ${mentionExtractions} x
      where x.mention_id = ${mentions.id} and x.schema_key = ${params.schemaKey}
    )`);
  }
  if (params.sourceId) filters.push(eq(mentions.sourceId, params.sourceId));
  if (params.authorId) filters.push(eq(mentions.authorId, params.authorId));
  if (params.sentiment !== "all") {
    filters.push(sql`coalesce(${itemLabels.sentiment}, ${mentionSentiments.sentiment}) = ${params.sentiment}`);
  }
  if (params.aspectId) {
    // Effective aspects: the label's keys when labeled, else Enrich's rows (D14).
    filters.push(sql`(
      (${itemLabels.aspectKeys} is not null and ${itemLabels.aspectKeys} @> jsonb_build_array(
        (select pa.key from ${projectAspects} pa where pa.id = ${params.aspectId})
      ))
      or (${itemLabels.aspectKeys} is null and exists (
        select 1 from ${mentionAspects} ma
        where ma.mention_id = ${mentions.id} and ma.aspect_id = ${params.aspectId}
      ))
    )`);
  }
  const period = params.period ?? (params.days ? { type: "rolling" as const, days: params.days } : null);
  if (period) {
    const window = await resolveReportWindow(params.projectId, period);
    filters.push(gte(mentions.publishedAt, window.start), lt(mentions.publishedAt, window.end));
  }
  if (params.from) filters.push(gte(mentions.publishedAt, new Date(params.from)));
  if (params.to) filters.push(lt(mentions.publishedAt, new Date(Date.parse(params.to) + DAY_MS)));
  if (params.q) {
    const pattern = `%${params.q}%`;
    filters.push(
      or(
        ilike(contentItems.text, pattern),
        sql`exists (
          select 1 from ${authors} a
          where a.id = ${mentions.authorId} and a.name ilike ${pattern}
        )`,
        sql`exists (
          select 1 from ${mentionTopics} mt
          inner join ${topics} t on t.id = mt.topic_id
          where mt.mention_id = ${mentions.id} and t.name ilike ${pattern}
        )`,
      ),
    );
  }
  const where = and(...filters);

  const base = db
    .select({
      id: mentions.id,
      contentItemId: mentions.contentItemId,
      rootItemId: mentions.rootItemId,
      kind: mentions.kind,
      text: contentItems.text,
      url: contentItems.url,
      publishedAt: mentions.publishedAt,
      sourceName: sources.name,
      authorName: authors.name,
      rootText: root.text,
      matchType: mentions.matchType,
      matchTier: mentions.matchTier,
      matchedEntityIds: mentions.matchedEntityIds,
      matchedTerms: mentions.matchedTerms,
      matchReason: mentions.matchReason,
      isRelevant: mentions.isRelevant,
      autoIsRelevant: mentions.autoIsRelevant,
      userCorrected: mentions.userCorrected,
      label: itemLabels.isRelevant,
      sentiment: sql<string | null>`coalesce(${itemLabels.sentiment}, ${mentionSentiments.sentiment})`,
      autoSentiment: mentionSentiments.sentiment,
      emotion: mentionSentiments.emotion,
      enrichStatus: sql<string>`coalesce(${mentionEnrichments.status}, 'pending')`,
      labelSentiment: itemLabels.sentiment,
      labelAspectKeys: itemLabels.aspectKeys,
      topicId: topics.id,
      topicName: topics.name,
    })
    .from(mentions)
    .innerJoin(contentItems, eq(contentItems.id, mentions.contentItemId))
    .leftJoin(sources, eq(sources.id, mentions.sourceId))
    .leftJoin(authors, eq(authors.id, mentions.authorId))
    .leftJoin(root, and(eq(root.id, mentions.rootItemId), sql`${root.id} <> ${mentions.contentItemId}`))
    .leftJoin(
      itemLabels,
      and(
        eq(itemLabels.projectId, mentions.projectId),
        eq(itemLabels.contentItemId, mentions.contentItemId),
      ),
    )
    .leftJoin(mentionSentiments, eq(mentionSentiments.mentionId, mentions.id))
    .leftJoin(
      mentionEnrichments,
      and(eq(mentionEnrichments.mentionId, mentions.id), eq(mentionEnrichments.enricherKey, "sentiment")),
    )
    .leftJoin(
      mentionTopics,
      and(
        eq(mentionTopics.mentionId, mentions.id),
        params.topicId
          ? eq(mentionTopics.topicId, params.topicId)
          : eq(mentionTopics.kind, "topic"),
      ),
    )
    .leftJoin(topics, eq(topics.id, mentionTopics.topicId));

  const [rows, [totals]] = await Promise.all([
    base
      .where(where)
      .orderBy(desc(mentions.publishedAt), desc(mentions.id))
      .limit(MENTION_PAGE_SIZE)
      .offset((params.page - 1) * MENTION_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(mentions)
      .innerJoin(contentItems, eq(contentItems.id, mentions.contentItemId))
      .leftJoin(
        itemLabels,
        and(
          eq(itemLabels.projectId, mentions.projectId),
          eq(itemLabels.contentItemId, mentions.contentItemId),
        ),
      )
      .leftJoin(mentionSentiments, eq(mentionSentiments.mentionId, mentions.id))
      .where(where),
  ]);

  const ids = rows.map((row) => row.id);
  const [aspectRows, extractionRows] = ids.length
    ? await Promise.all([
        db.select().from(mentionAspects).where(inArray(mentionAspects.mentionId, ids)),
        db
          .select({
            mentionId: mentionExtractions.mentionId,
            schemaKey: mentionExtractions.schemaKey,
            data: mentionExtractions.data,
          })
          .from(mentionExtractions)
          .where(inArray(mentionExtractions.mentionId, ids)),
      ])
    : [[], []];

  return {
    items: rows.map(
      ({ topicId, topicName, ...row }): MentionListItem => ({
        ...row,
        topic: topicId && topicName ? { id: topicId, name: topicName } : null,
        aspects: aspectRows
          .filter((aspect) => aspect.mentionId === row.id)
          .map((aspect) => ({ aspectId: aspect.aspectId, sentiment: aspect.sentiment })),
        extractions: extractionRows
          .filter((extraction) => extraction.mentionId === row.id)
          .map(({ schemaKey, data }) => ({ schemaKey, data })),
        labelSentiment: row.labelSentiment ?? null,
        labelAspectKeys: row.labelAspectKeys ?? null,
        matchType: row.matchType as MentionListItem["matchType"],
        matchTier: row.matchTier as MentionListItem["matchTier"],
        publishedAt: row.publishedAt?.toISOString() ?? null,
        label: row.label ?? null,
      }),
    ),
    total: totals?.total ?? 0,
    page: params.page,
    pageSize: MENTION_PAGE_SIZE,
  };
}
