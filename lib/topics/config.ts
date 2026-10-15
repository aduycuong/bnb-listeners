import type { ChatModelId } from "@/lib/langchain/models/registry";

export const TOPIC_STATUSES = ["active", "hidden", "merged"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/** `mentions.topic_status` values (D15). */
export type MentionTopicStatus = "pending" | "assigned" | "unassigned" | "none";

/** Embedding kind of `mention_embeddings` used for topics. */
export const TOPIC_HINT_EMBEDDING_KIND = "topic_hint";

/** Topic settings (docs/decisions.md D15). */
export const TOPIC_CONFIG = {
  embeddingModel: "text-embedding-3-small",
  /** Mentions embedded per workflow step, and per embedding request. */
  embedPerStep: 300,
  embedPerRequest: 100,
  model: "gpt-4.1" satisfies ChatModelId,
  /** Bump when the assignment or merge prompt changes. */
  promptVersion: 2,
  /** Distinct hints per assignment call; more hints take more calls. */
  hintsPerCall: 200,
  /** Topics shown to the model per call, largest first. */
  maxTopicsInPrompt: 150,
  /** Example hints shown per existing topic. */
  hintsPerTopic: 4,
  /** Smallest number of mentions for a new topic. */
  minNewTopicMentions: 3,
  /** Mentions without a topic are offered again for this many days after they were published. */
  waitingDays: 30,
  /** Topic pairs at least this similar (cosine of centroids) are checked by the model for a merge. */
  mergeSimilarity: 0.82,
  maxMergePairsPerRun: 20,
  /** Share of a new topic's mentions an aspect needs to become the topic's aspect. */
  aspectShare: 0.4,
  /**
   * Periods of the Topics report, in days; the first is the default. Every number on the page
   * covers the chosen period, and growth compares it with the same number of days before.
   */
  reportPeriodDays: [14],
} as const;
