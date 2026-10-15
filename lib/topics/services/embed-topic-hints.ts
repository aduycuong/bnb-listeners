import { createHash } from "node:crypto";

import { and, inArray, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { mentionEmbeddings, mentions, mentionTopics } from "@/db/schema";
import { db } from "@/lib/db";

import { TOPIC_CONFIG, TOPIC_HINT_EMBEDDING_KIND } from "../config";
import type { EmbedTopicHintsResult } from "../types";
import { embedTexts } from "../utils/embed-texts";
import { eligibleMentionSql } from "../utils/topic-sql";

/**
 * Embeds the `topic_hint` of up to `embedPerStep` mentions whose hint is new
 * or changed (D15). A changed hint leaves its topic and waits to be assigned again.
 */
export async function embedTopicHints(params: { projectId: string }): Promise<EmbedTopicHintsResult> {
  const { rows } = await db.execute<{ id: string; hint: string }>(sql`
    select m.id, m.topic_hint as hint
    from mentions m
    left join mention_embeddings e on e.mention_id = m.id and e.kind = ${TOPIC_HINT_EMBEDDING_KIND}
    where ${eligibleMentionSql(params.projectId)}
      and (e.mention_id is null or e.model <> ${TOPIC_CONFIG.embeddingModel} or e.text_hash <> md5(m.topic_hint))
    order by m.published_at desc nulls last, m.id
    limit ${TOPIC_CONFIG.embedPerStep + 1}
  `);
  const batch = rows.slice(0, TOPIC_CONFIG.embedPerStep);
  if (batch.length === 0) return { embedded: 0, more: false };

  // Short hints repeat a lot; embed each distinct text once.
  const texts = [...new Set(batch.map((row) => row.hint))];
  const vectors = await embedTexts(texts);
  const vectorByText = new Map(texts.map((text, index) => [text, vectors[index]]));

  const values = batch.map((row) => ({
    mentionId: row.id,
    kind: TOPIC_HINT_EMBEDDING_KIND,
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
    db.delete(mentionTopics).where(inArray(mentionTopics.mentionId, ids)),
    db
      .update(mentions)
      .set({ topicStatus: "pending", updatedAt: new Date() })
      .where(and(inArray(mentions.id, ids), ne(mentions.topicStatus, "none"))),
  );
  await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return { embedded: batch.length, more: rows.length > batch.length };
}
