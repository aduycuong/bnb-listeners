import { eq } from "drizzle-orm";

import { sources } from "@/db/schema";
import { mapWithConcurrency } from "@/lib/common/map-with-concurrency";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { OFF_TOPIC_TEXTS, SPAM_TEXTS } from "../noise-texts";
import { SYNTHETIC_CONFIG } from "../config";
import type { SyntheticRecord, SyntheticThreadsParams } from "../schema";
import type { PlannedItem, PlannedThread, Sentiment } from "../types";
import {
  createSeededRandom,
  pickOne,
  pickWeighted,
  type SeededRandom,
} from "../utils/create-seeded-random";
import { degradeText } from "../utils/degrade-text";
import { assignThreadAuthors } from "./assign-thread-authors";
import { generateBriefs } from "./generate-briefs";
import { loadAuthorPools } from "./load-author-pools";
import { loadPanelMembers } from "./load-panel-members";
import { loadRecentBriefs } from "./load-recent-briefs";
import { loadStyleSamples } from "./load-style-samples";
import { planThreads } from "./plan-threads";
import { writeThreadTexts } from "./write-thread-texts";

type GenerateSyntheticRecordsParams = {
  params: SyntheticThreadsParams;
  collectRunId: string;
  sourceId: string;
};

/**
 * Builds the raw records of one run: code plans the threads and picks authors,
 * the LLM writes each thread, code assembles ids, thread links, engagement and
 * noise. Without a fixed brief the model first writes briefs from the topic guide
 * and each thread is about one of them. A thread the model cannot complete is dropped; a run where every
 * thread fails throws so the workflow marks it failed.
 */
export async function generateSyntheticRecords(
  input: GenerateSyntheticRecordsParams,
): Promise<SyntheticRecord[]> {
  const { params, collectRunId, sourceId } = input;
  const startedAt = Date.now();
  const random = createSeededRandom(params.seed);

  const members = await loadPanelMembers(params.panelId);
  if (members.length === 0) {
    throw new NotFoundError("persona panel members", params.panelId);
  }

  const threads = planThreads({
    members,
    postCount: params.postCount,
    commentsPerPost: params.commentsPerPost,
    window: {
      from: new Date(params.window.from),
      to: new Date(params.window.to),
    },
    hasDistractors: params.distractors.length > 0,
    random,
  });

  const [pools, samples] = await Promise.all([
    loadAuthorPools(members.map((member) => member.persona.id)),
    params.styleSourceId ? loadStyleSamples(params.styleSourceId) : [],
  ]);
  assignThreadAuthors({ threads, pools, random });

  const briefs = params.brief
    ? [params.brief]
    : await generateBriefs({
        topicGuide: params.topicGuide!,
        count: params.briefCount,
        recentBriefs: await loadRecentBriefs(sourceId, SYNTHETIC_CONFIG.recentBriefCount),
        members,
        sourceName: await loadSourceName(sourceId),
        at: new Date(params.window.to),
        model: params.model,
      });
  const threadBriefs = assignBriefs(threads.length, briefs, random);

  const written = await mapWithConcurrency(
    threads,
    SYNTHETIC_CONFIG.concurrency,
    (thread) =>
      writeThreadTexts({
        thread,
        brief: threadBriefs[thread.index]!,
        samples,
        model: params.model,
      }),
  );

  const records: SyntheticRecord[] = [];
  let sequence = 0;
  let failedThreads = 0;

  threads.forEach((thread, index) => {
    const texts = written[index];
    if (!texts) {
      failedThreads++;
      return;
    }

    const threadRecords = assembleThread({
      thread,
      texts,
      brief: threadBriefs[index]!,
      params,
      collectRunId,
      firstSequence: sequence,
      random,
    });
    sequence += threadRecords.length;
    records.push(...threadRecords);
  });

  console.log("[synthetic-threads] generated", {
    collectRunId,
    model: params.model,
    briefs: briefs.length,
    threads: threads.length,
    failedThreads,
    records: records.length,
    durationMs: Date.now() - startedAt,
  });

  if (records.length === 0) {
    throw new Error(
      `All ${threads.length} synthetic threads failed; check the model and API key.`,
    );
  }

  return records;
}

/**
 * Brief of each thread: every brief gets a thread when there are enough, the
 * rest are spread at random so stories differ in size.
 */
function assignBriefs(threadCount: number, briefs: string[], random: SeededRandom): string[] {
  const order = briefs.map((_, index) => ({ index, key: random() }));
  order.sort((a, b) => a.key - b.key);

  return Array.from({ length: threadCount }, (_, thread) =>
    thread < briefs.length
      ? briefs[order[thread]!.index]!
      : briefs[Math.floor(random() * briefs.length)]!,
  );
}

async function loadSourceName(sourceId: string): Promise<string | null> {
  const [source] = await db
    .select({ name: sources.name })
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);
  return source?.name ?? null;
}

function assembleThread(input: {
  thread: PlannedThread;
  texts: Map<number, string>;
  brief: string;
  params: SyntheticThreadsParams;
  collectRunId: string;
  firstSequence: number;
  random: SeededRandom;
}): SyntheticRecord[] {
  const { thread, texts, params, random } = input;
  const externalIds = new Map(
    thread.items.map((item, position) => [
      item.index,
      `syn:${input.collectRunId}:${input.firstSequence + position}`,
    ]),
  );
  const rootExternalId = externalIds.get(0)!;

  const replyCounts = new Map<number, number>();
  for (const item of thread.items) {
    if (item.parentIndex !== null) {
      replyCounts.set(item.parentIndex, (replyCounts.get(item.parentIndex) ?? 0) + 1);
    }
  }

  return thread.items.map((item): SyntheticRecord => {
    const { text, degraded } = resolveText(item, texts, params, random);
    const engagement = sampleEngagement(random, item);

    return {
      kind: item.kind,
      externalId: externalIds.get(item.index)!,
      parentExternalId:
        item.parentIndex === null ? null : externalIds.get(item.parentIndex)!,
      rootExternalId: item.kind === "post" ? null : rootExternalId,
      text,
      publishedAt: item.publishedAt.toISOString(),
      likeCount: engagement.likeCount,
      commentCount: replyCounts.get(item.index) ?? 0,
      shareCount: engagement.shareCount,
      reactions: engagement.reactions,
      author: {
        externalId: item.author!.externalId,
        name: item.author!.name,
        personaId: item.author!.personaId,
        followerCount: item.author!.followerCount,
      },
      spec: {
        panelId: params.panelId,
        brief: input.brief,
        threadIndex: thread.index,
        personaId: item.persona?.id ?? null,
        sentiment: item.sentiment,
        aspect: item.aspect,
        length: item.length,
        briefRelevance: item.briefRelevance,
        noise: item.noise,
        degraded,
      },
    };
  });
}

function resolveText(
  item: PlannedItem,
  texts: Map<number, string>,
  params: SyntheticThreadsParams,
  random: SeededRandom,
): { text: string; degraded: string[] } {
  if (item.noise === "spam") return { text: pickOne(random, SPAM_TEXTS), degraded: [] };
  if (item.noise === "off-topic") {
    return { text: pickOne(random, OFF_TOPIC_TEXTS), degraded: [] };
  }
  if (item.noise === "distractor") {
    return { text: pickOne(random, params.distractors), degraded: [] };
  }

  const text = texts.get(item.index)!;
  // Posts stay clean; people tend to type their comments in a hurry.
  return item.kind === "post" ? { text, degraded: [] } : degradeText(random, text);
}

/** Heavy-tailed engagement: most items get little, a few get a lot. */
function sampleEngagement(random: SeededRandom, item: PlannedItem) {
  const ceiling = item.kind === "post" ? 400 : item.kind === "comment" ? 40 : 15;
  const total = Math.max(0, Math.floor(Math.exp(random() * Math.log(ceiling))) - 1);

  return {
    likeCount: total,
    shareCount: item.kind === "post" ? Math.floor(total * 0.05 * random()) : 0,
    reactions: total > 0 ? splitReactions(random, total, item.sentiment) : null,
  };
}

const REACTION_MIX: Record<Sentiment, Record<string, number>> = {
  positive: { like: 0.6, love: 0.3, wow: 0.1 },
  neutral: { like: 0.85, haha: 0.1, wow: 0.05 },
  negative: { like: 0.4, angry: 0.3, sad: 0.15, haha: 0.15 },
};

/** Splits `total` reactions by sentiment-shaped weights; the parts sum to `total`. */
function splitReactions(
  random: SeededRandom,
  total: number,
  sentiment: Sentiment,
): Record<string, number> {
  const mix = REACTION_MIX[sentiment];
  const entries = Object.entries(mix).map(([value, weight]) => ({ value, weight }));
  const result: Record<string, number> = {};

  for (let i = 0; i < total; i++) {
    const key = pickWeighted(random, entries);
    result[key] = (result[key] ?? 0) + 1;
  }

  return result;
}
