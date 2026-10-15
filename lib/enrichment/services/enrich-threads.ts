import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import {
  contentItems,
  itemLabels,
  mentionAspects,
  mentionEntities,
  mentionExtractions,
  mentions,
  mentionTopics,
} from "@/db/schema";
import { db } from "@/lib/db";
import { createChatModel } from "@/lib/langchain";

import { ENRICH_CONFIG } from "../config";
import type { EnrichItem, EnrichThreadsResult, ProjectEnrichContext } from "../types";
import {
  buildEnrichPrompt,
  buildEnrichSchema,
  type EnrichResponse,
} from "../utils/build-enrich-request";
import { loadEnrichContext } from "./load-enrich-context";

type ItemResult = EnrichResponse["items"][number];

async function callModel(
  ctx: ProjectEnrichContext,
  rootText: string,
  items: EnrichItem[],
): Promise<Map<string, ItemResult>> {
  const model = createChatModel(ENRICH_CONFIG.model, { temperature: 0 }).withStructuredOutput(
    buildEnrichSchema(ctx),
  );
  const prompt = buildEnrichPrompt({ ctx, rootText, items });
  const response = (await model.invoke([
    new SystemMessage(prompt.system),
    new HumanMessage(prompt.user),
  ])) as EnrichResponse;

  const results = new Map<string, ItemResult>();
  for (const entry of response.items) {
    const item = items[entry.index];
    if (item) results.set(item.mentionId, entry);
  }
  return results;
}

/** Rows that replace a mention's Enrich output. Labels stay authoritative for `sentiment`. */
function toWrites(
  ctx: ProjectEnrichContext,
  item: EnrichItem,
  result: ItemResult,
  labeledSentiment: string | null,
): BatchItem<"pg">[] {
  const aspectIds = new Map(ctx.aspects.map((aspect) => [aspect.key, aspect.id]));
  const entityIds = new Map(ctx.entities.map((entity) => [entity.ref, entity.id]));
  const aspects = [
    ...new Map(
      (result.aspects ?? [])
        .filter((aspect) => aspectIds.has(aspect.key))
        .map((aspect) => [aspect.key, aspect]),
    ).values(),
  ];
  const entities = [
    ...new Map(
      (result.entities ?? [])
        .filter((entity) => entityIds.has(entity.entity))
        .map((entity) => [entity.entity, entity]),
    ).values(),
  ];
  const extractions = ctx.extractions.flatMap((extraction) => {
    const value = result.extractions?.[extraction.key];
    const values = extraction.many ? (Array.isArray(value) ? value : []) : value ? [value] : [];
    return values.map((data) => ({
      mentionId: item.mentionId,
      schemaKey: extraction.key,
      data: data as Record<string, unknown>,
    }));
  });

  const topicHint =
    result.topicHint?.replace(/\s+/g, " ").trim().slice(0, ENRICH_CONFIG.maxTopicHintChars) || null;

  const writes: BatchItem<"pg">[] = [
    db
      .update(mentions)
      .set({
        topicHint,
        // A hint that disappears leaves its topic; one that appears waits for the topic stage,
        // which also notices a changed hint by its embedding hash (D15).
        topicStatus: topicHint
          ? sql`case when ${mentions.topicStatus} = 'none' then 'pending' else ${mentions.topicStatus} end`
          : "none",
        autoSentiment: result.sentiment,
        sentiment: labeledSentiment ?? result.sentiment,
        sentimentScore: Math.max(-1, Math.min(1, result.sentimentScore)),
        emotion: result.emotion,
        enrichStatus: "done",
        enrichSignature: ctx.signature,
        enrichedContentHash: item.contentHash,
        enrichedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mentions.id, item.mentionId)),
    db.delete(mentionEntities).where(eq(mentionEntities.mentionId, item.mentionId)),
    db
      .delete(mentionAspects)
      .where(and(eq(mentionAspects.mentionId, item.mentionId), eq(mentionAspects.source, "auto"))),
    db.delete(mentionExtractions).where(eq(mentionExtractions.mentionId, item.mentionId)),
  ];
  if (!topicHint) writes.push(db.delete(mentionTopics).where(eq(mentionTopics.mentionId, item.mentionId)));
  if (entities.length > 0) {
    writes.push(
      db.insert(mentionEntities).values(
        entities.map((entity) => ({
          mentionId: item.mentionId,
          entityId: entityIds.get(entity.entity)!,
          sentiment: entity.sentiment,
        })),
      ),
    );
  }
  if (aspects.length > 0) {
    writes.push(
      db.insert(mentionAspects).values(
        aspects.map((aspect) => ({
          mentionId: item.mentionId,
          aspectId: aspectIds.get(aspect.key)!,
          source: "auto",
          sentiment: aspect.sentiment,
        })),
      ),
    );
  }
  if (extractions.length > 0) writes.push(db.insert(mentionExtractions).values(extractions));
  return writes;
}

/**
 * Enrich for some threads of a project (D14): one model call per thread for
 * up to `mentionsPerCall` relevant mentions, with the root post as context.
 */
export async function enrichThreads(params: {
  projectId: string;
  rootIds: string[];
}): Promise<EnrichThreadsResult> {
  const result: EnrichThreadsResult = { enriched: 0, failed: 0, llmCalls: 0 };
  if (params.rootIds.length === 0) return result;

  const ctx = await loadEnrichContext({ projectId: params.projectId });
  const [roots, rows] = await Promise.all([
    db
      .select({ id: contentItems.id, text: contentItems.text })
      .from(contentItems)
      .where(inArray(contentItems.id, params.rootIds)),
    db
      .select({
        mentionId: mentions.id,
        contentItemId: mentions.contentItemId,
        rootId: mentions.rootItemId,
        kind: contentItems.kind,
        text: contentItems.text,
        contentHash: contentItems.contentHash,
        publishedAt: contentItems.publishedAt,
        labeledSentiment: itemLabels.sentiment,
      })
      .from(mentions)
      .innerJoin(contentItems, eq(contentItems.id, mentions.contentItemId))
      .leftJoin(
        itemLabels,
        and(
          eq(itemLabels.projectId, mentions.projectId),
          eq(itemLabels.contentItemId, mentions.contentItemId),
        ),
      )
      .where(
        and(
          eq(mentions.projectId, params.projectId),
          eq(mentions.isRelevant, true),
          inArray(mentions.rootItemId, params.rootIds),
          or(
            ne(mentions.enrichStatus, "done"),
            sql`${mentions.enrichSignature} is distinct from ${ctx.signature}`,
            sql`${mentions.enrichedContentHash} is distinct from ${contentItems.contentHash}`,
          ),
        ),
      ),
  ]);
  const rootText = new Map(roots.map((root) => [root.id, root.text]));

  for (const rootId of params.rootIds) {
    const thread = rows
      .filter((row) => row.rootId === rootId)
      .sort((a, b) => Number(b.kind === "post") - Number(a.kind === "post") || (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0));

    for (let offset = 0; offset < thread.length; offset += ENRICH_CONFIG.mentionsPerCall) {
      const batch = thread.slice(offset, offset + ENRICH_CONFIG.mentionsPerCall);
      try {
        const answers = await callModel(ctx, rootText.get(rootId) ?? "", batch);
        result.llmCalls += 1;
        const writes = batch.flatMap((item) => {
          const answer = answers.get(item.mentionId);
          return answer ? toWrites(ctx, item, answer, item.labeledSentiment) : [];
        });
        const missing = batch.filter((item) => !answers.has(item.mentionId));
        if (missing.length > 0) {
          writes.push(
            db
              .update(mentions)
              .set({ enrichStatus: "failed", updatedAt: new Date() })
              .where(inArray(mentions.id, missing.map((item) => item.mentionId))),
          );
        }
        if (writes.length > 0) await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
        result.enriched += batch.length - missing.length;
        result.failed += missing.length;
      } catch (error) {
        console.error("[enrichment] thread failed", { rootId, error });
        await db
          .update(mentions)
          .set({ enrichStatus: "failed", updatedAt: new Date() })
          .where(inArray(mentions.id, batch.map((item) => item.mentionId)));
        result.failed += batch.length;
      }
    }
  }

  return result;
}
