import { SYNTHETIC_CONFIG } from "../config";
import type {
  BriefRelevance,
  NoiseKind,
  PanelMember,
  PersonaSnapshot,
  PlannedItem,
  PlannedThread,
  Sentiment,
  TextLength,
} from "../types";
import {
  pickOne,
  pickWeighted,
  randomInt,
  type SeededRandom,
} from "../utils/create-seeded-random";
import { sampleDelayedAt, samplePublishedAt } from "../utils/sample-published-at";

type PlanThreadsParams = {
  members: PanelMember[];
  postCount: number;
  commentsPerPost: [number, number];
  window: { from: Date; to: Date };
  /** Whether look-alike noise comments may be planned. */
  hasDistractors: boolean;
  random: SeededRandom;
};

/**
 * Code decides everything except the words: how many posts and comments, who
 * writes each (by panel weight), when, with which sentiment, aspect and
 * length. Authors are assigned afterwards; the LLM only writes the text.
 */
export function planThreads(params: PlanThreadsParams): PlannedThread[] {
  const { members, random, window } = params;
  const { plan, noise } = SYNTHETIC_CONFIG;

  const weighted = members.map((member) => ({
    value: member.persona,
    weight: member.weight,
  }));

  const postTimes = Array.from({ length: params.postCount }, () =>
    samplePublishedAt(random, window.from, window.to),
  ).sort((a, b) => a.getTime() - b.getTime());

  return postTimes.map((postTime, threadIndex) => {
    const items: PlannedItem[] = [];
    const postPersona = pickWeighted(random, weighted);

    items.push({
      index: 0,
      kind: "post",
      parentIndex: null,
      persona: postPersona,
      author: null,
      byPostAuthor: false,
      publishedAt: postTime,
      sentiment: sampleSentiment(random, postPersona),
      aspect: sampleAspect(random, postPersona),
      length: samplePostLength(random, postPersona),
      briefRelevance: "direct",
      noise: null,
    });
    const postItem = items[0];

    const [minComments, maxComments] = params.commentsPerPost;
    // Squared uniform: many quiet posts, a few busy ones.
    const commentCount =
      minComments +
      Math.floor((maxComments - minComments + 1) * random() ** 2);

    for (let c = 0; c < commentCount; c++) {
      const noiseKind = sampleNoise(random, params.hasDistractors, noise);
      const persona =
        noiseKind === "spam" || noiseKind === "off-topic"
          ? null
          : pickWeighted(random, weighted);
      const commentTime = sampleDelayedAt(
        random,
        postTime,
        plan.commentDelayMeanMinutes,
        window.to,
      );
      const commentIndex = items.length;

      items.push({
        index: commentIndex,
        kind: "comment",
        parentIndex: 0,
        persona,
        author: null,
        byPostAuthor: false,
        publishedAt: commentTime,
        sentiment: persona ? sampleSentiment(random, persona) : "neutral",
        aspect: persona ? sampleAspect(random, persona) : null,
        length: sampleLength(random, plan.lengthMix),
        briefRelevance: persona ? sampleRelevance(random) : "general",
        noise: noiseKind,
      });

      if (noiseKind || random() >= plan.commentReplyRate) continue;

      const replyCount = randomInt(random, 1, plan.maxRepliesPerComment);
      for (let r = 0; r < replyCount; r++) {
        const byPostAuthor = random() < plan.opReplyRate;
        const replyPersona = byPostAuthor
          ? postPersona
          : pickWeighted(random, weighted);

        items.push({
          index: items.length,
          kind: "reply",
          parentIndex: commentIndex,
          persona: replyPersona,
          author: null,
          byPostAuthor,
          publishedAt: sampleDelayedAt(
            random,
            commentTime,
            plan.replyDelayMeanMinutes,
            window.to,
          ),
          // The post author keeps their stance; a person does not flip mid-thread.
          sentiment: byPostAuthor
            ? postItem.sentiment
            : sampleSentiment(random, replyPersona),
          aspect: sampleAspect(random, replyPersona),
          length: sampleLength(random, plan.lengthMix),
          briefRelevance: sampleRelevance(random),
          noise: null,
        });
      }
    }

    return { index: threadIndex, items };
  });
}

function sampleSentiment(random: SeededRandom, persona: PersonaSnapshot): Sentiment {
  const { plan } = SYNTHETIC_CONFIG;
  const mix =
    (persona.templateKey && plan.sentimentMixByTemplate[persona.templateKey]) ||
    plan.sentimentMix;

  return pickWeighted(
    random,
    (Object.keys(mix) as Sentiment[]).map((value) => ({
      value,
      weight: mix[value],
    })),
  );
}

function sampleAspect(random: SeededRandom, persona: PersonaSnapshot): string | null {
  return persona.concerns.length > 0 ? pickOne(random, persona.concerns) : null;
}

function sampleLength(
  random: SeededRandom,
  mix: Record<TextLength, number>,
): TextLength {
  return pickWeighted(
    random,
    (Object.keys(mix) as TextLength[]).map((value) => ({
      value,
      weight: mix[value],
    })),
  );
}

function samplePostLength(random: SeededRandom, persona: PersonaSnapshot): TextLength {
  const { plan } = SYNTHETIC_CONFIG;
  const mix =
    (persona.templateKey && plan.postLengthMixByTemplate[persona.templateKey]) ||
    plan.postLengthMix;

  return sampleLength(random, mix);
}

function sampleRelevance(random: SeededRandom): BriefRelevance {
  const mix = SYNTHETIC_CONFIG.plan.briefRelevanceMix;
  return pickWeighted(
    random,
    (Object.keys(mix) as BriefRelevance[]).map((value) => ({
      value,
      weight: mix[value],
    })),
  );
}

function sampleNoise(
  random: SeededRandom,
  hasDistractors: boolean,
  noise: typeof SYNTHETIC_CONFIG.noise,
): NoiseKind | null {
  const roll = random();
  if (roll < noise.spamRate) return "spam";
  if (roll < noise.spamRate + noise.offTopicRate) return "off-topic";
  if (
    hasDistractors &&
    roll < noise.spamRate + noise.offTopicRate + noise.distractorRate
  ) {
    return "distractor";
  }
  return null;
}
