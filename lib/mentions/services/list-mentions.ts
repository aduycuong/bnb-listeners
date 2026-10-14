import { and, count, desc, eq, gte, ilike, lt, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { authors, contentItems, itemLabels, mentions, sources } from "@/db/schema";
import { db } from "@/lib/db";

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
  if (params.sourceId) filters.push(eq(mentions.sourceId, params.sourceId));
  if (params.from) filters.push(gte(mentions.publishedAt, new Date(params.from)));
  if (params.to) filters.push(lt(mentions.publishedAt, new Date(Date.parse(params.to) + DAY_MS)));
  if (params.q) filters.push(ilike(contentItems.text, `%${params.q}%`));
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
    );

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
      .where(where),
  ]);

  return {
    items: rows.map(
      (row): MentionListItem => ({
        ...row,
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
