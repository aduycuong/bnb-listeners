import { randomUUID } from "node:crypto";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { mentionAspects, mentions, mentionTopics, projects, topics } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { createChatModel } from "@/lib/langchain";

import { TOPIC_CONFIG } from "../config";
import type { AssignTopicsResult } from "../types";
import {
  buildTopicAssignmentPrompt,
  buildTopicPlacementPrompt,
  NEW_TOPIC_KEY,
  topicAssignmentSchema,
  topicPlacementSchema,
  type TopicAssignmentResponse,
  type TopicPlacementResponse,
} from "../utils/build-topic-assignment-request";
import { eligibleMentionSql, uuidArraySql } from "../utils/topic-sql";

type Candidate = { id: string; hint: string; status: string };
type Hint = { text: string; rows: Candidate[] };

/** The aspect at least `aspectShare` of the mentions discuss, if any. */
async function dominantAspect(mentionIds: string[]): Promise<string | null> {
  const rows = await db
    .select({ aspectId: mentionAspects.aspectId })
    .from(mentionAspects)
    .where(and(inArray(mentionAspects.mentionId, mentionIds), eq(mentionAspects.source, "auto")));
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.aspectId, (counts.get(row.aspectId) ?? 0) + 1);
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return best && best[1] / mentionIds.length >= TOPIC_CONFIG.aspectShare ? best[0] : null;
}

/** Topics offered to the model under short keys (`t1`, …), largest first, with example hints. */
async function loadTopics(projectId: string) {
  const { rows: topicRows } = await db.execute<{ id: string; name: string; description: string }>(sql`
    select id, name, description from topics
    where project_id = ${projectId}::uuid and status in ('active', 'hidden')
    order by mention_count desc, created_at
    limit ${TOPIC_CONFIG.maxTopicsInPrompt}
  `);
  const { rows: topicHints } = topicRows.length
    ? await db.execute<{ topic_id: string; hint: string }>(sql`
        select topic_id, hint from (
          select mt.topic_id, m.topic_hint as hint,
            row_number() over (partition by mt.topic_id order by count(*) desc, m.topic_hint) as rank
          from mention_topics mt
          join mentions m on m.id = mt.mention_id
          where mt.topic_id = any(${uuidArraySql(topicRows.map((topic) => topic.id))})
            and m.is_relevant and m.topic_hint is not null
          group by mt.topic_id, m.topic_hint
        ) ranked
        where rank <= ${TOPIC_CONFIG.hintsPerTopic}
      `)
    : { rows: [] };
  const topicByKey = new Map(topicRows.map((topic, index) => [`t${index + 1}`, topic]));

  return {
    topicByKey,
    promptTopics: [...topicByKey.entries()].map(([key, topic]) => ({
      key,
      name: topic.name,
      description: topic.description,
      hints: topicHints.filter((row) => row.topic_id === topic.id).map((row) => row.hint),
    })),
  };
}

/** Writes topic assignments and marks the mentions assigned. */
function assignmentWrites(topicId: string, members: string[]): BatchItem<"pg">[] {
  return [
    db
      .insert(mentionTopics)
      .values(members.map((mentionId) => ({ mentionId, topicId, confidence: 1 })))
      .onConflictDoUpdate({
        target: mentionTopics.mentionId,
        set: { topicId: sql`excluded.topic_id`, confidence: sql`excluded.confidence`, createdAt: sql`now()` },
      }),
    db
      .update(mentions)
      .set({ topicStatus: "assigned", updatedAt: new Date() })
      .where(inArray(mentions.id, members)),
  ];
}

/** One model call over some hints; writes topics and assignments, returns who was assigned. */
async function assignHints(params: {
  projectId: string;
  hints: Hint[];
}): Promise<{ assigned: Set<string>; created: AssignTopicsResult["created"] }> {
  const { topicByKey, promptTopics } = await loadTopics(params.projectId);

  const prompt = buildTopicAssignmentPrompt({
    topics: promptTopics,
    hints: params.hints.map((hint) => ({ text: hint.text, count: hint.rows.length })),
    minNewTopicMentions: TOPIC_CONFIG.minNewTopicMentions,
  });
  const model = createChatModel(TOPIC_CONFIG.model, { temperature: 0 }).withStructuredOutput(
    topicAssignmentSchema,
  );
  const response = (await model.invoke([
    new SystemMessage(prompt.system),
    new HumanMessage(prompt.user),
  ])) as TopicAssignmentResponse;

  const used = new Set<number>();
  const assigned = new Set<string>();
  const created: AssignTopicsResult["created"] = [];
  const writes: BatchItem<"pg">[] = [];
  for (const entry of response.topics) {
    const indexes = [...new Set(entry.hints)].filter((index) => params.hints[index] && !used.has(index));
    const members = indexes.flatMap((index) => params.hints[index].rows.map((row) => row.id));
    if (members.length === 0) continue;

    let topicId = topicByKey.get(entry.key)?.id;
    if (!topicId) {
      const name = entry.name?.trim();
      if (entry.key !== NEW_TOPIC_KEY || !name || members.length < TOPIC_CONFIG.minNewTopicMentions) {
        continue;
      }
      topicId = randomUUID();
      writes.push(
        db.insert(topics).values({
          id: topicId,
          projectId: params.projectId,
          name,
          description: entry.description?.trim() ?? "",
          aspectId: await dominantAspect(members),
          mentionCount: members.length,
        }),
      );
      created.push({ id: topicId, name, mentions: members.length });
    }

    for (const index of indexes) used.add(index);
    for (const id of members) assigned.add(id);
    writes.push(...assignmentWrites(topicId, members));
  }
  if (writes.length > 0) await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  return { assigned, created };
}

/** Second call: each leftover hint goes into one existing topic or none (no new topics). */
async function placeHints(params: {
  projectId: string;
  projectName: string;
  hints: Hint[];
}): Promise<Set<string>> {
  const { topicByKey, promptTopics } = await loadTopics(params.projectId);
  const prompt = buildTopicPlacementPrompt({
    projectName: params.projectName,
    topics: promptTopics,
    hints: params.hints.map((hint) => ({ text: hint.text, count: hint.rows.length })),
  });
  const model = createChatModel(TOPIC_CONFIG.model, { temperature: 0 }).withStructuredOutput(
    topicPlacementSchema,
  );
  const response = (await model.invoke([
    new SystemMessage(prompt.system),
    new HumanMessage(prompt.user),
  ])) as TopicPlacementResponse;

  const membersByTopic = new Map<string, string[]>();
  for (const item of response.items) {
    const hint = params.hints[item.index];
    const topicId = item.key ? topicByKey.get(item.key)?.id : undefined;
    if (!hint || !topicId) continue;
    membersByTopic.set(topicId, [...(membersByTopic.get(topicId) ?? []), ...hint.rows.map((row) => row.id)]);
  }
  const writes = [...membersByTopic.entries()].flatMap(([topicId, members]) =>
    assignmentWrites(topicId, [...new Set(members)]),
  );
  if (writes.length > 0) await db.batch(writes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  return new Set([...membersByTopic.values()].flat());
}

/**
 * Puts waiting hints into existing or new topics with the model (D15). Runs
 * only when some mention is newly waiting (`pending`); mentions without a
 * topic from the last `waitingDays` are offered again alongside, so a new
 * topic can form once enough of them share an issue. When new topics are
 * created, each leftover hint gets a second, one-by-one decision against the
 * updated list, which keeps broad hints out of narrow topics.
 */
export async function assignTopics(params: { projectId: string }): Promise<AssignTopicsResult> {
  const result: AssignTopicsResult = { llmCalls: 0, assigned: 0, waiting: 0, created: [], more: false };

  const { rows: candidates } = await db.execute<Candidate>(sql`
    select m.id, m.topic_hint as hint, m.topic_status as status
    from mentions m
    where ${eligibleMentionSql(params.projectId)}
      and (
        m.topic_status = 'pending'
        or (m.topic_status = 'unassigned'
          and m.published_at >= now() - make_interval(days => ${TOPIC_CONFIG.waitingDays}))
      )
    order by (m.topic_status = 'pending') desc, m.published_at desc nulls last, m.id
  `);
  const pending = candidates.filter((row) => row.status === "pending");
  if (pending.length === 0) return result;

  // Distinct hints, those of pending mentions first, up to `hintsPerCall`.
  const byHint = new Map<string, Candidate[]>();
  for (const row of candidates) {
    if (!byHint.has(row.hint) && byHint.size >= TOPIC_CONFIG.hintsPerCall) continue;
    byHint.set(row.hint, [...(byHint.get(row.hint) ?? []), row]);
  }
  const hints: Hint[] = [...byHint.entries()].map(([text, rows]) => ({ text, rows }));
  const offered = hints.flatMap((hint) => hint.rows);
  result.more = pending.length > offered.filter((row) => row.status === "pending").length;

  const [project] = await db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("project", params.projectId);

  const assigned = new Set<string>();
  const first = await assignHints({ projectId: params.projectId, hints });
  result.llmCalls += 1;
  first.assigned.forEach((id) => assigned.add(id));
  result.created.push(...first.created);

  const leftover = hints.filter((hint) => hint.rows.some((row) => !assigned.has(row.id)));
  if (first.created.length > 0 && leftover.length > 0) {
    const placed = await placeHints({
      projectId: params.projectId,
      projectName: project.name,
      hints: leftover,
    });
    result.llmCalls += 1;
    placed.forEach((id) => assigned.add(id));
  }

  const waiting = offered.filter((row) => !assigned.has(row.id)).map((row) => row.id);
  if (waiting.length > 0) {
    await db
      .update(mentions)
      .set({ topicStatus: "unassigned", updatedAt: new Date() })
      .where(inArray(mentions.id, waiting));
  }

  result.assigned = assigned.size;
  result.waiting = waiting.length;
  return result;
}
