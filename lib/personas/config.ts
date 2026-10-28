import type { ChatModelId } from "@/lib/langchain/models/registry";

import type { BriefRelevance, Sentiment, TextLength } from "./types";

/** QStash job of a scheduled synthetic source: `{ sourceId }`. */
export const RUN_SYNTHETIC_SOURCE_JOB_NAME = "run-synthetic-source";

/**
 * Synthetic generation tuning in one place. Numbers are first guesses; the
 * real-group figures come from the Bright Data probes in docs/plan.md.
 */
export const SYNTHETIC_CONFIG = {
  /** Model that writes the threads. A run param can override it. */
  model: "gpt-4.1-mini" satisfies ChatModelId,
  /** High on purpose: LLM text tends to be too uniform. */
  temperature: 0.9,
  /** Output cap per thread call. */
  maxOutputTokens: 3000,
  /** Attempts per thread before it is dropped. */
  threadAttempts: 2,

  /**
   * Threads per run. `fetchRecords` runs inside one workflow step, so this is
   * bounded by the function time limit. Measured 2026-10-13: 10 threads took
   * 19.6s at concurrency 5; 30 is a guess of ~1 minute. Re-measure with `--wait`.
   */
  maxThreadsPerRun: 30,
  /** LLM calls in flight inside one run. */
  concurrency: 5,

  /** Briefs a run without a fixed brief asks the model for, at most. */
  maxBriefsPerRun: 10,
  /** Recent briefs of the source shown to the model, so stories continue instead of repeating. */
  recentBriefCount: 5,
  /** Attempts at the brief call before the run fails. */
  briefAttempts: 2,

  /** Scheduled sources: posts of a run are spread from the previous run to now. */
  schedule: {
    /** Window of a source's first run. */
    firstWindowHours: 1,
    /** Cap after a long pause, so a run does not spread its posts over weeks. */
    maxWindowHours: 24,
  },

  /** Real comments shown to the model as voice examples. */
  fewShotCount: 6,
  fewShotMinChars: 15,
  fewShotMaxChars: 300,

  plan: {
    /** Chance an item reuses an existing author of its persona. */
    reuseAuthorRate: 0.6,
    /** Chance a comment gets replies, and how many at most. */
    commentReplyRate: 0.25,
    maxRepliesPerComment: 3,
    /** Chance a reply is written by the post author (OP answering back). */
    opReplyRate: 0.4,
    /** Mean delay in minutes of a comment after its post / a reply after its parent. */
    commentDelayMeanMinutes: 90,
    replyDelayMeanMinutes: 40,
    /**
     * Relative posting weight per hour of day, Vietnam time (UTC+7).
     * The probed group is nearly silent from 21:00 to 06:00.
     */
    hourWeights: [
      0.03, 0.02, 0.01, 0.01, 0.02, 0.05, 0.3, 0.7, 0.9, 1, 1, 1, 0.9, 0.8, 0.8,
      0.8, 0.9, 1, 1, 1, 0.8, 0.3, 0.1, 0.05,
    ],
    /** Chance of each sentiment when the persona has no override. */
    sentimentMix: { negative: 0.3, neutral: 0.4, positive: 0.3 } satisfies Record<
      Sentiment,
      number
    >,
    /** Override per persona `template_key`. */
    sentimentMixByTemplate: {
      "unhappy-buyer": { negative: 0.85, neutral: 0.1, positive: 0.05 },
      whistleblower: { negative: 0.75, neutral: 0.2, positive: 0.05 },
      broker: { negative: 0.02, neutral: 0.28, positive: 0.7 },
      "developer-pr": { negative: 0.02, neutral: 0.28, positive: 0.7 },
      "flipper-investor": { negative: 0.25, neutral: 0.4, positive: 0.35 },
      "info-seeker": { negative: 0.1, neutral: 0.8, positive: 0.1 },
    } as Record<string, Record<Sentiment, number>>,
    /** Length mix for comments and replies. */
    lengthMix: { short: 0.55, medium: 0.35, long: 0.1 } satisfies Record<
      TextLength,
      number
    >,
    /** Length mix for posts; a persona override wins. */
    postLengthMix: { short: 0.25, medium: 0.5, long: 0.25 } satisfies Record<
      TextLength,
      number
    >,
    /** Override per persona `template_key`, e.g. people asking questions write short posts. */
    postLengthMixByTemplate: {
      "info-seeker": { short: 0.85, medium: 0.15, long: 0 },
      "first-home-buyer": { short: 0.4, medium: 0.5, long: 0.1 },
      broker: { short: 0.3, medium: 0.5, long: 0.2 },
    } as Record<string, Record<TextLength, number>>,
    /** How much comments and replies are about the brief; posts are always `direct`. */
    briefRelevanceMix: {
      direct: 0.4,
      related: 0.35,
      general: 0.25,
    } satisfies Record<BriefRelevance, number>,
  },

  noise: {
    /** Share of comments that are not written by the LLM or by a panel persona. */
    spamRate: 0.03,
    offTopicRate: 0.03,
    /** Only applies when the run passes `distractors`. */
    distractorRate: 0.05,
    /** Text degradation applied to LLM output of comments and replies. */
    stripDiacriticsRate: 0.1,
    typoRate: 0.1,
  },
} as const;
