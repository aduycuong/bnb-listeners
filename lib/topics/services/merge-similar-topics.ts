import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { createChatModel } from "@/lib/langchain";

import { getTopicStage, TOPIC_CONFIG } from "../config";
import type { MergeSimilarTopicsResult, TopicRunParams } from "../types";
import {
  buildTopicMergePrompt,
  topicMergeSchema,
  type TopicMergeCandidate,
  type TopicMergeResponse,
} from "../utils/build-topic-merge-request";
import { hintTextSql, uuidArraySql } from "../utils/topic-sql";
import { mergeSameNameTopics } from "./merge-same-name-topics";
import { mergeTopics } from "./merge-topics";

const HINTS_PER_TOPIC = 8;

/**
 * Merges active topics with the same name, then asks the model whether pairs
 * of active topics with close centroids are the same topic, and merges the
 * smaller topic of each such pair into the larger.
 */
export async function mergeSimilarTopics(params: TopicRunParams): Promise<MergeSimilarTopicsResult> {
  const spec = getTopicStage(params.kind);
  const result: MergeSimilarTopicsResult = { checked: 0, merged: [], llmCalls: 0 };
  result.merged.push(...(await mergeSameNameTopics(params)));

  const { rows: pairs } = await db.execute<{ a: string; b: string }>(sql`
    select a.id as a, b.id as b
    from topics a
    join topics b on b.project_id = a.project_id and a.id < b.id
    where a.project_id = ${params.projectId}::uuid
      and a.kind = ${spec.kind} and b.kind = ${spec.kind}
      and a.status = 'active' and b.status = 'active'
      and a.centroid is not null and b.centroid is not null
      and (a.centroid <=> b.centroid) <= ${1 - TOPIC_CONFIG.mergeSimilarity}
    order by a.centroid <=> b.centroid
    limit ${TOPIC_CONFIG.maxMergePairsPerRun}
  `);
  result.checked = pairs.length;
  if (pairs.length === 0) return result;

  const topicIds = [...new Set(pairs.flatMap((pair) => [pair.a, pair.b]))];
  const [{ rows: topicRows }, { rows: hintRows }] = await Promise.all([
    db.execute<{ id: string; name: string; description: string; mention_count: number }>(sql`
      select id, name, description, mention_count from topics where id = any(${uuidArraySql(topicIds)})
    `),
    db.execute<{ topic_id: string; hint: string }>(sql`
      select topic_id, hint from (
        select mt.topic_id, ${hintTextSql(spec)} as hint,
          row_number() over (partition by mt.topic_id order by count(*) desc, ${hintTextSql(spec)}) as rank
        from mention_topics mt
        join mention_extractions x on x.mention_id = mt.mention_id and x.schema_key = ${spec.extractionKey}
        join mentions m on m.id = mt.mention_id
        where mt.topic_id = any(${uuidArraySql(topicIds)})
          and mt.kind = ${spec.kind} and m.is_relevant and ${hintTextSql(spec)} is not null
        group by mt.topic_id, ${hintTextSql(spec)}
      ) ranked
      where rank <= ${HINTS_PER_TOPIC}
    `),
  ]);
  const byId = new Map(topicRows.map((row) => [row.id, row]));
  const candidate = (id: string): TopicMergeCandidate => ({
    name: byId.get(id)?.name ?? "",
    description: byId.get(id)?.description ?? "",
    hints: hintRows.filter((row) => row.topic_id === id).map((row) => row.hint),
  });

  const prompt = buildTopicMergePrompt({
    pairs: pairs.map((pair) => [candidate(pair.a), candidate(pair.b)]),
    kind: spec.kind,
  });
  const model = createChatModel(TOPIC_CONFIG.model, { temperature: 0 }).withStructuredOutput(
    topicMergeSchema,
  );
  const response = (await model.invoke([
    new SystemMessage(prompt.system),
    new HumanMessage(prompt.user),
  ])) as TopicMergeResponse;
  result.llmCalls += 1;

  const touched = new Set<string>();
  for (const answer of response.pairs) {
    const pair = pairs[answer.index];
    if (!answer.same || !pair || touched.has(pair.a) || touched.has(pair.b)) continue;
    const [sourceId, targetId] =
      (byId.get(pair.a)?.mention_count ?? 0) > (byId.get(pair.b)?.mention_count ?? 0)
        ? [pair.b, pair.a]
        : [pair.a, pair.b];
    await mergeTopics({ projectId: params.projectId, sourceId, targetId });
    touched.add(sourceId).add(targetId);
    result.merged.push({ sourceId, targetId });
  }

  return result;
}
