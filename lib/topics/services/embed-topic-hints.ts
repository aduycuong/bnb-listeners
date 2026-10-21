import { createHash } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { mentionEmbeddings, mentionEnrichments, mentionTopics } from "@/db/schema";
import { db } from "@/lib/db";

import { getTopicStage, TOPIC_CONFIG } from "../config";
import type { EmbedTopicHintsResult, TopicRunParams } from "../types";
import { embedTexts } from "../utils/embed-texts";
import { eligibleMentionSql, hintTextSql } from "../utils/topic-sql";

/**
 * Embeds the extraction text of up to `embedPerStep` mentions whose text is
 * new or changed (D15). A changed text leaves its group and waits to be
 * assigned again.
 */
export async function embedTopicHints(params: TopicRunParams): Promise<EmbedTopicHintsResult> {
  const spec = getTopicStage(params.kind);
  const { rows } = await db.execute<{ id: string; hint: string }>(sql`
    select m.id, ${hintTextSql(spec)} as hint
    from mentions m
    join mention_extractions x on x.mention_id = m.id and x.schema_key = ${spec.extractionKey}
    left join mention_embeddings e on e.mention_id = m.id and e.kind = ${spec.embeddingKind}
    where ${eligibleMentionSql(params.projectId, spec)}
      and (e.mention_id is null or e.model <> ${TOPIC_CONFIG.embeddingModel}
        or e.text_hash <> md5(${hintTextSql(spec)}))
    order by m.published_at desc nulls last, m.id
    limit ${TOPIC_CONFIG.embedPerStep + 1}
  `);
  const batch = rows.slice(0, TOPIC_CONFIG.embedPerStep);
  if (batch.length === 0) return { embedded: 0, more: false };

  // Short texts repeat a lot; embed each distinct string once.
  const texts = [...new Set(batch.map((row) => row.hint))];
  const vectors = await embedTexts(texts);
  const vectorByText = new Map(texts.map((text, index) => [text, vectors[index]]));

  const values = batch.map((row) => ({
    mentionId: row.id,
    kind: spec.embeddingKind,
    model: TOPIC_CONFIG.embeddingModel,
    textHash: createHash("md5").update(row.hint).digest("hex"),
    embedding: vectorByText.get(row.hint)!,
  }));
  const ids = batch.map((row) => row.id);

  const writes: BatchItem<"pg">[] = [];
  for (let offset = 0; offset < values.length; offset += TOPIC_CONFIG.embedPerRequest) {
    writes.push(
      db
        .insert(mentionEmbeddings)
        .values(values.slice(offset, offset + TOPIC_CONFIG.embedPerRequest))
        .onConflictDoUpdate({
          target: [mentionEmbeddings.mentionId, mentionEmbeddings.kind],
          set: {
            model: sql`excluded.model`,
            textHash: sql`excluded.text_hash`,
            embedding: sql`excluded.embedding`,
            createdAt: sql`now()`,
          },
        }),
    );
  }
  writes.push(
    db
      .delete(mentionTopics)
      .where(and(inArray(mentionTopics.mentionId, ids), eq(mentionTopics.kind, spec.kind))),
    db
      .insert(mentionEnrichments)
      .values(ids.map((mentionId) => ({ mentionId, enricherKey: spec.enricherKey, status: "pending" })))
      .onConflictDoUpdate({
        target: [mentionEnrichments.mentionId, mentionEnrichments.enricherKey],
        set: { status: "pending", error: null, updatedAt: sql`now()` },
      }),
  );
  await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return { embedded: batch.length, more: rows.length > batch.length };
}
