import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { contentItems, mentionEnrichments } from "@/db/schema";
import { uuidArraySql } from "@/lib/common/uuid-array-sql";
import { db } from "@/lib/db";
import { createChatModel } from "@/lib/langchain";
import { getTranscriptText } from "@/lib/raw-store/utils/get-transcript-text";

import { ENRICH_CONFIG } from "../config";
import { getLlmEnricher } from "../enrichers/llm-enrichers";
import type { EnricherKey } from "../registry";
import type {
  EnrichItem,
  EnrichRunOptions,
  EnrichThreadsResult,
  ProjectEnrichContext,
  ProjectEnricherState,
} from "../types";
import {
  buildEnrichPrompt,
  buildEnrichSchema,
  type EnrichResponse,
  flattenItemResult,
} from "../utils/build-enrich-request";
import { pendingPairsSql, selectLlmEnrichers } from "../utils/pending-enrichments-sql";
import { loadEnrichContext } from "./load-enrich-context";

async function callModel(
  ctx: ProjectEnrichContext,
  keys: EnricherKey[],
  root: { text: string; transcript: string },
  items: EnrichItem[],
): Promise<Map<string, Record<string, unknown>>> {
  const enrichers = keys.map(getLlmEnricher);
  const model = createChatModel(ENRICH_CONFIG.model, { temperature: 0 }).withStructuredOutput(
    buildEnrichSchema(ctx, enrichers),
  );
  const prompt = buildEnrichPrompt({
    ctx,
    enrichers,
    rootText: root.text,
    rootTranscript: root.transcript,
    items,
  });
  const response = (await model.invoke([
    new SystemMessage(prompt.system),
    new HumanMessage(prompt.user),
  ])) as EnrichResponse;

  const results = new Map<string, Record<string, unknown>>();
  for (const entry of response.items) {
    const item = items[entry.index];
    if (item) results.set(item.mentionId, flattenItemResult(entry));
  }
  return results;
}

/** Rows that replace one mention's output for the keys it needed, plus its state. */
function toWrites(
  ctx: ProjectEnrichContext,
  signatures: Map<EnricherKey, string>,
  item: EnrichItem,
  result: Record<string, unknown>,
): BatchItem<"pg">[] {
  const writes = item.keys.flatMap((key) => getLlmEnricher(key).writes(ctx, item, result));
  writes.push(
    db
      .insert(mentionEnrichments)
      .values(
        item.keys.map((key) => ({
          mentionId: item.mentionId,
          enricherKey: key,
          status: "done",
          signature: signatures.get(key) ?? null,
          contentHash: item.contentHash,
          model: ENRICH_CONFIG.model,
          error: null,
          enrichedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: [mentionEnrichments.mentionId, mentionEnrichments.enricherKey],
        set: {
          status: sql`excluded.status`,
          signature: sql`excluded.signature`,
          contentHash: sql`excluded.content_hash`,
          model: sql`excluded.model`,
          error: null,
          enrichedAt: sql`excluded.enriched_at`,
          updatedAt: sql`now()`,
        },
      }),
  );
  return writes;
}

function failedWrite(items: EnrichItem[], error: string): BatchItem<"pg"> {
  return db
    .insert(mentionEnrichments)
    .values(
      items.flatMap((item) =>
        item.keys.map((key) => ({
          mentionId: item.mentionId,
          enricherKey: key,
          status: "failed",
          error: error.slice(0, 500),
        })),
      ),
    )
    .onConflictDoUpdate({
      target: [mentionEnrichments.mentionId, mentionEnrichments.enricherKey],
      set: { status: "failed", error: sql`excluded.error`, updatedAt: sql`now()` },
    });
}

type PendingRow = {
  mention_id: string;
  content_item_id: string;
  root_id: string;
  kind: string;
  text: string;
  content_hash: string;
  published_at: string | null;
  matched_entity_ids: string[];
  key: string;
};

/**
 * Enrich for some threads of a project (D14/D18): one model call per thread
 * for up to `mentionsPerCall` relevant mentions, with the root post as
 * context. The call asks for the union of the enrichers the mentions need;
 * each mention keeps only the outputs of the keys it was pending for.
 */
export async function enrichThreads(
  params: { projectId: string; rootIds: string[] } & EnrichRunOptions,
): Promise<EnrichThreadsResult> {
  const result: EnrichThreadsResult = { enriched: 0, failed: 0, llmCalls: 0 };
  if (params.rootIds.length === 0) return result;

  const ctx = await loadEnrichContext({ projectId: params.projectId });
  const enrichers: ProjectEnricherState[] = selectLlmEnrichers(ctx, params);
  if (enrichers.length === 0) return result;
  const signatures = new Map(enrichers.map((enricher) => [enricher.key, enricher.signature]));

  const [roots, { rows }] = await Promise.all([
    db
      .select({ id: contentItems.id, text: contentItems.text, media: contentItems.media })
      .from(contentItems)
      .where(inArray(contentItems.id, params.rootIds)),
    db.execute<PendingRow>(
      pendingPairsSql({
        projectId: params.projectId,
        enrichers,
        force: params.force,
        select: sql`m.id as mention_id, m.content_item_id, coalesce(m.root_item_id, m.content_item_id) as root_id,
          ci.kind, ci.text, ci.content_hash, ci.published_at, m.matched_entity_ids, k.key`,
        extraWhere: sql`coalesce(m.root_item_id, m.content_item_id) = any(${uuidArraySql(params.rootIds)})`,
      }),
    ),
  ]);
  const rootContent = new Map(
    roots.map((root) => [root.id, { text: root.text, transcript: getTranscriptText(root.media) }]),
  );

  const items = new Map<string, EnrichItem & { rootId: string }>();
  for (const row of rows) {
    const item = items.get(row.mention_id) ?? {
      mentionId: row.mention_id,
      contentItemId: row.content_item_id,
      rootId: row.root_id,
      kind: row.kind,
      text: row.text,
      contentHash: row.content_hash,
      publishedAt: row.published_at ? new Date(row.published_at) : null,
      matchedEntityIds: row.matched_entity_ids,
      keys: [],
    };
    item.keys.push(row.key as EnricherKey);
    items.set(row.mention_id, item);
  }

  for (const rootId of params.rootIds) {
    const thread = [...items.values()]
      .filter((item) => item.rootId === rootId)
      .sort(
        (a, b) =>
          Number(b.kind === "post") - Number(a.kind === "post") ||
          (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0),
      );

    for (let offset = 0; offset < thread.length; offset += ENRICH_CONFIG.mentionsPerCall) {
      const batch = thread.slice(offset, offset + ENRICH_CONFIG.mentionsPerCall);
      const keys = enrichers.map((e) => e.key).filter((key) => batch.some((item) => item.keys.includes(key)));
      try {
        const answers = await callModel(
          ctx,
          keys,
          rootContent.get(rootId) ?? { text: "", transcript: "" },
          batch,
        );
        result.llmCalls += 1;
        const writes = batch.flatMap((item) => {
          const answer = answers.get(item.mentionId);
          return answer ? toWrites(ctx, signatures, item, answer) : [];
        });
        const missing = batch.filter((item) => !answers.has(item.mentionId));
        if (missing.length > 0) writes.push(failedWrite(missing, "missing from model output"));
        if (writes.length > 0) await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
        result.enriched += batch.length - missing.length;
        result.failed += missing.length;
      } catch (error) {
        console.error("[enrichment] thread failed", { rootId, error });
        await db.batch([
          failedWrite(batch, error instanceof Error ? error.message : String(error)),
        ]);
        result.failed += batch.length;
      }
    }
  }

  return result;
}
