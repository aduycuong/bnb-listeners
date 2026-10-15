import { randomUUID } from "node:crypto";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { mentionAspects, projects, topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { createChatModel } from "@/lib/langchain";

import { TOPIC_CONFIG, TOPIC_HINT_EMBEDDING_KIND } from "../config";
import type { DiscoverTopicsResult } from "../types";
import {
  buildTopicNamingPrompt,
  topicNamingSchema,
  type TopicNamingCluster,
  type TopicNamingResponse,
} from "../utils/build-topic-naming-request";
import { findDenseClusters } from "../utils/find-dense-clusters";
import { currentEmbeddingSql, eligibleMentionSql, uuidArraySql } from "../utils/topic-sql";

function countHints(hints: string[]): TopicNamingCluster["hints"] {
  const counts = new Map<string, number>();
  for (const hint of hints) counts.set(hint, (counts.get(hint) ?? 0) + 1);
  return [...counts.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOPIC_CONFIG.hintsPerCluster);
}

/** The aspect at least `aspectShare` of the mentions discuss, if any. */
function dominantAspect(members: string[], aspectsByMention: Map<string, string[]>): string | null {
  const counts = new Map<string, number>();
  for (const id of members) {
    for (const aspectId of aspectsByMention.get(id) ?? []) {
      counts.set(aspectId, (counts.get(aspectId) ?? 0) + 1);
    }
  }
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return best && best[1] / members.length >= TOPIC_CONFIG.aspectShare ? best[0] : null;
}

/**
 * Looks for new topics among mentions waiting for one (D15): dense clusters
 * of similar hints become topics, named in one model call.
 */
export async function discoverTopics(params: { projectId: string }): Promise<DiscoverTopicsResult> {
  const result: DiscoverTopicsResult = { pool: 0, created: [], llmCalls: 0 };

  const { rows: pool } = await db.execute<{ id: string; hint: string }>(sql`
    select m.id, m.topic_hint as hint
    from mentions m
    join mention_embeddings e on ${currentEmbeddingSql()}
    where ${eligibleMentionSql(params.projectId)} and m.topic_status = 'unassigned'
    order by m.published_at desc nulls last, m.id
    limit ${TOPIC_CONFIG.maxPoolSize}
  `);
  result.pool = pool.length;
  if (pool.length < TOPIC_CONFIG.minClusterSize) return result;

  const ids = pool.map((row) => row.id);
  const { rows: edges } = await db.execute<{ a: string; b: string }>(sql`
    select a.mention_id as a, b.mention_id as b
    from mention_embeddings a
    join mention_embeddings b on b.kind = a.kind and a.mention_id < b.mention_id
    where a.kind = ${TOPIC_HINT_EMBEDDING_KIND}
      and a.mention_id = any(${uuidArraySql(ids)})
      and b.mention_id = any(${uuidArraySql(ids)})
      and (a.embedding <=> b.embedding) <= ${1 - TOPIC_CONFIG.clusterSimilarity}
  `);
  const clusters = findDenseClusters({
    ids,
    edges,
    minSize: TOPIC_CONFIG.minClusterSize,
    maxClusters: TOPIC_CONFIG.maxNewTopicsPerRun,
  });
  if (clusters.length === 0) return result;

  const hintById = new Map(pool.map((row) => [row.id, row.hint]));
  const members = clusters.flatMap((cluster) => cluster.members);
  const [[project], existing, aspectRows] = await Promise.all([
    db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, params.projectId))
      .limit(1),
    db
      .select({ name: topics.name })
      .from(topics)
      .where(and(eq(topics.projectId, params.projectId), ne(topics.status, "merged"))),
    db
      .select({ mentionId: mentionAspects.mentionId, aspectId: mentionAspects.aspectId })
      .from(mentionAspects)
      .where(and(inArray(mentionAspects.mentionId, members), eq(mentionAspects.source, "auto"))),
  ]);
  if (!project) throw new NotFoundError("project", params.projectId);
  const aspectsByMention = new Map<string, string[]>();
  for (const row of aspectRows) {
    aspectsByMention.set(row.mentionId, [...(aspectsByMention.get(row.mentionId) ?? []), row.aspectId]);
  }

  const prompt = buildTopicNamingPrompt({
    projectName: project.name,
    clusters: clusters.map((cluster) => ({
      hints: countHints(cluster.members.map((id) => hintById.get(id)!)),
    })),
    existingNames: existing.map((topic) => topic.name),
  });
  const model = createChatModel(TOPIC_CONFIG.model, { temperature: 0 }).withStructuredOutput(
    topicNamingSchema,
  );
  const response = (await model.invoke([
    new SystemMessage(prompt.system),
    new HumanMessage(prompt.user),
  ])) as TopicNamingResponse;
  result.llmCalls += 1;

  const names = new Map(response.topics.map((topic) => [topic.index, topic]));
  for (const [index, cluster] of clusters.entries()) {
    const named = names.get(index);
    const name = named?.name.trim();
    if (!named || !name) continue;
    const topicId = randomUUID();
    const memberIds = uuidArraySql(cluster.members);
    await db.batch([
      db.execute(sql`
        insert into topics (id, project_id, name, description, aspect_id, mention_count, centroid)
        select ${topicId}::uuid, ${params.projectId}::uuid, ${name}, ${named.description.trim()},
          ${dominantAspect(cluster.members, aspectsByMention)}::uuid, ${cluster.members.length}, avg(embedding)
        from mention_embeddings
        where kind = ${TOPIC_HINT_EMBEDDING_KIND} and mention_id = any(${memberIds})
      `),
      db.execute(sql`
        insert into mention_topics (mention_id, topic_id, confidence)
        select e.mention_id, t.id, 1 - (e.embedding <=> t.centroid)
        from mention_embeddings e, topics t
        where t.id = ${topicId}::uuid
          and e.kind = ${TOPIC_HINT_EMBEDDING_KIND}
          and e.mention_id = any(${memberIds})
        on conflict (mention_id) do update
          set topic_id = excluded.topic_id, confidence = excluded.confidence, created_at = now()
      `),
      db.execute(sql`
        update mentions set topic_status = 'assigned', updated_at = now()
        where id = any(${memberIds})
      `),
    ]);
    result.created.push({ id: topicId, name, mentions: cluster.members.length });
  }

  return result;
}
