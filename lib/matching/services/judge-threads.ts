import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { contentItems, matchJudgments, mentions, type NewMention } from "@/db/schema";
import { db } from "@/lib/db";
import { createChatModel } from "@/lib/langchain";

import { MATCH_CONFIG } from "../config";
import type { JudgeThreadsResult, MatchEntity, MatchItem } from "../types";
import { buildJudgePrompt } from "../utils/build-judge-prompt";
import { judgmentCacheKey } from "../utils/judgment-cache-key";
import { planItemMatches, type PlannedMatch } from "../utils/plan-item-matches";
import { loadMatchItems } from "./load-match-items";
import { loadProjectMatchContext } from "./load-project-match-context";
import { toMentionRow, writeMentions } from "./write-mentions";

const responseSchema = z.object({
  items: z.array(
    z.object({
      index: z.int().describe("The [n] index of the item"),
      relevant: z.boolean().describe("True when the item is about the entity"),
      reason: z.string().describe("Short reason in Vietnamese"),
    }),
  ),
});

type Judgment = { isRelevant: boolean; reason: string | null };

/** Asks the model about `items` of one thread for one entity, in batches. */
async function askModel(
  entity: MatchEntity,
  root: MatchItem,
  items: MatchItem[],
): Promise<{ answers: Map<string, Judgment>; calls: number }> {
  const model = createChatModel(MATCH_CONFIG.model, { temperature: 0 }).withStructuredOutput(
    responseSchema,
  );
  const answers = new Map<string, Judgment>();
  let calls = 0;

  for (let offset = 0; offset < items.length; offset += MATCH_CONFIG.judgeBatchSize) {
    const batch = items.slice(offset, offset + MATCH_CONFIG.judgeBatchSize);
    const prompt = buildJudgePrompt({ entity, root, items: batch });
    const response = await model.invoke([
      new SystemMessage(prompt.system),
      new HumanMessage(prompt.user),
    ]);
    calls += 1;
    for (const entry of response.items) {
      const item = batch[entry.index];
      if (item) answers.set(item.id, { isRelevant: entry.relevant, reason: entry.reason.trim() || null });
    }
  }

  return { answers, calls };
}

/**
 * Tier 2 for some threads of a project: one model call per thread and entity
 * (batched), answers cached in `match_judgments`. A comment counts only when
 * its root post is about the same entity.
 */
export async function judgeThreads(params: {
  projectId: string;
  rootIds: string[];
  /** Incremental mode: only items of this run are candidates. */
  collectRunId?: string;
}): Promise<JudgeThreadsResult> {
  const result: JudgeThreadsResult = { judged: 0, cached: 0, llmCalls: 0, relevant: 0 };
  if (params.rootIds.length === 0) return result;

  const ctx = await loadProjectMatchContext({ projectId: params.projectId });
  const threadItems = await loadMatchItems({
    sourceIds: ctx.sourceIds,
    where: or(inArray(contentItems.id, params.rootIds), inArray(contentItems.rootId, params.rootIds)),
  });

  const storedRoots = await db
    .select({ id: mentions.contentItemId, entityIds: mentions.matchedEntityIds })
    .from(mentions)
    .where(
      and(
        eq(mentions.projectId, ctx.projectId),
        eq(mentions.isRelevant, true),
        inArray(mentions.contentItemId, params.rootIds),
      ),
    );
  const rootEntities = new Map(storedRoots.map((row) => [row.id, row.entityIds]));
  const rows: NewMention[] = [];

  for (const rootId of params.rootIds) {
    const thread = threadItems.filter((item) => item.id === rootId || item.rootId === rootId);
    const root = thread.find((item) => item.id === rootId);
    if (!root) continue;

    const candidates = params.collectRunId
      ? thread.filter((item) => item.collectRunId === params.collectRunId)
      : thread;
    const plan = planItemMatches({
      items: candidates,
      roots: new Map([[root.id, root]]),
      queries: ctx.queries,
      rootEntities,
    });
    if (plan.pending.length === 0) continue;

    // Is the root itself about each entity? Lexically certain, a stored mention, or asked below.
    const rootPlan = planItemMatches({ items: [root], roots: new Map(), queries: ctx.queries });
    const rootCertain = new Set([
      ...(rootPlan.certain[0]?.entityIds ?? []),
      ...(rootEntities.get(root.id) ?? []),
    ]);

    const byEntity = new Map<string, PlannedMatch[]>();
    for (const match of plan.pending) {
      for (const entityId of match.entityIds) {
        byEntity.set(entityId, [...(byEntity.get(entityId) ?? []), match]);
      }
    }

    const verdicts = new Map<string, { entityIds: string[]; reasons: string[]; any: boolean }>();

    for (const [entityId, matches] of byEntity) {
      const entity = ctx.entities.get(entityId);
      if (!entity) continue;

      // Ask about the root too when it is not certain, so comments can follow it.
      const asked = matches.map((match) => match.item);
      if (!rootCertain.has(entityId) && !asked.some((item) => item.id === root.id)) {
        asked.unshift(root);
      }

      const keys = new Map(asked.map((item) => [item.id, judgmentCacheKey(entity, root, item)]));
      const cachedRows = await db
        .select()
        .from(matchJudgments)
        .where(inArray(matchJudgments.cacheKey, [...keys.values()]));
      const answers = new Map<string, Judgment>();
      for (const item of asked) {
        const hit = cachedRows.find((row) => row.cacheKey === keys.get(item.id));
        if (hit) answers.set(item.id, { isRelevant: hit.isRelevant, reason: hit.reason });
      }
      result.cached += answers.size;

      const unanswered = asked.filter((item) => !answers.has(item.id));
      if (unanswered.length > 0) {
        const fresh = await askModel(entity, root, unanswered);
        result.llmCalls += fresh.calls;
        const cacheRows = [...fresh.answers].map(([itemId, answer]) => ({
          cacheKey: keys.get(itemId)!,
          isRelevant: answer.isRelevant,
          reason: answer.reason,
          model: MATCH_CONFIG.model,
        }));
        if (cacheRows.length > 0) {
          await db.insert(matchJudgments).values(cacheRows).onConflictDoNothing();
        }
        for (const [itemId, answer] of fresh.answers) answers.set(itemId, answer);
      }

      const rootRelevant = rootCertain.has(entityId) || answers.get(root.id)?.isRelevant === true;

      for (const match of matches) {
        const answer = answers.get(match.item.id);
        const isRoot = match.item.id === root.id;
        const relevant = (answer?.isRelevant ?? false) && (isRoot || rootRelevant);
        const verdict = verdicts.get(match.item.id) ?? { entityIds: [], reasons: [], any: false };
        if (relevant) {
          verdict.entityIds.push(entityId);
          verdict.any = true;
        }
        if (answer?.reason) verdict.reasons.push(`${entity.name}: ${answer.reason}`);
        verdicts.set(match.item.id, verdict);
      }
    }

    for (const match of plan.pending) {
      const verdict = verdicts.get(match.item.id);
      if (!verdict) continue;
      result.judged += 1;
      if (verdict.any) result.relevant += 1;
      rows.push(
        toMentionRow(ctx.projectId, ctx.signature, match, {
          tier: "llm",
          isRelevant: verdict.any,
          entityIds: verdict.any ? verdict.entityIds : match.entityIds,
          reason: verdict.reasons.join(" · ") || null,
        }),
      );
    }
  }

  await writeMentions(rows);
  return result;
}
