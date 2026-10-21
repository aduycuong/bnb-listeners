import { and, asc, desc, eq } from "drizzle-orm";

import { topics } from "@/db/schema";
import { db } from "@/lib/db";

import { getTopicStage } from "../config";
import type { MergeSimilarTopicsResult, TopicRunParams } from "../types";
import { normalizeTopicName } from "../utils/normalize-topic-name";
import { mergeTopics } from "./merge-topics";

/**
 * Merges active topics whose names are the same (ignoring case and spacing)
 * into the largest of them, without asking the model. Topics without mentions
 * have no centroid, so the similarity check never pairs them.
 */
export async function mergeSameNameTopics(
  params: TopicRunParams,
): Promise<MergeSimilarTopicsResult["merged"]> {
  const spec = getTopicStage(params.kind);
  const rows = await db
    .select({ id: topics.id, name: topics.name })
    .from(topics)
    .where(
      and(eq(topics.projectId, params.projectId), eq(topics.kind, spec.kind), eq(topics.status, "active")),
    )
    .orderBy(desc(topics.mentionCount), asc(topics.createdAt));

  const targetByName = new Map<string, string>();
  const merged: MergeSimilarTopicsResult["merged"] = [];
  for (const row of rows) {
    const key = normalizeTopicName(row.name);
    const targetId = targetByName.get(key);
    if (!targetId) {
      targetByName.set(key, row.id);
      continue;
    }
    await mergeTopics({ projectId: params.projectId, sourceId: row.id, targetId });
    merged.push({ sourceId: row.id, targetId });
  }
  return merged;
}
