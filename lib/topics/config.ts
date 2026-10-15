import type { ChatModelId } from "@/lib/langchain/models/registry";

export const TOPIC_STATUSES = ["active", "hidden", "merged"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/** `mentions.topic_status` values (D15). */
export type MentionTopicStatus = "pending" | "assigned" | "unassigned" | "none";

/** Embedding kind of `mention_embeddings` used for topics. */
export const TOPIC_HINT_EMBEDDING_KIND = "topic_hint";

/**
 * Topic settings (docs/decisions.md D15). Similarities are cosine similarities
 * between `topic_hint` embeddings; tune them after runs on real data.
 */
export const TOPIC_CONFIG = {
  embeddingModel: "text-embedding-3-small",
  /** Mentions embedded per workflow step, and per embedding request. */
  embedPerStep: 300,
  embedPerRequest: 100,
  /** A mention joins the nearest topic when at least this similar to its centroid. */
  assignSimilarity: 0.7,
  /** Two waiting mentions are neighbours in a new cluster when at least this similar. */
  clusterSimilarity: 0.72,
  /** Smallest cluster that becomes a topic. */
  minClusterSize: 3,
  /** Newest waiting mentions considered when looking for new topics. */
  maxPoolSize: 1500,
  maxNewTopicsPerRun: 20,
  /** Hints shown to the model per cluster or topic. */
  hintsPerCluster: 25,
  /** Topic pairs at least this similar are checked by the model for a merge. */
  mergeSimilarity: 0.82,
  maxMergePairsPerRun: 20,
  /** Share of a new topic's mentions an aspect needs to become the topic's aspect. */
  aspectShare: 0.4,
  model: "gpt-4.1-mini" satisfies ChatModelId,
  /** Bump when the naming or merge prompt changes. */
  promptVersion: 1,
} as const;
