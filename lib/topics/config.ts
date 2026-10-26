import type { ChatModelId } from "@/lib/langchain/models/registry";

export const TOPIC_STATUSES = ["active", "hidden", "merged"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/** `topics.kind` / `mention_topics.kind` values (D18). */
export const TOPIC_KINDS = ["topic", "buyer_question", "argument"] as const;
export type TopicKind = (typeof TOPIC_KINDS)[number];

/** Kinds the grouping stage can run (`topics:project --kind`, workflow payload). */
export const TOPIC_STAGE_KINDS = ["topic", "buyer_question"] as const;
export type TopicStageKind = (typeof TOPIC_STAGE_KINDS)[number];

export type TopicStageSpec = {
  kind: TopicStageKind;
  /** `mention_extractions.schema_key` this stage groups. */
  extractionKey: string;
  /** jsonb field that holds the text to embed and group. */
  hintField: "text" | "question";
  enricherKey: "topic_assign" | "question_assign";
  embeddingKind: string;
};

export const TOPIC_STAGES: Record<TopicStageKind, TopicStageSpec> = {
  topic: {
    kind: "topic",
    extractionKey: "topic_hint",
    hintField: "text",
    enricherKey: "topic_assign",
    embeddingKind: "topic_hint",
  },
  buyer_question: {
    kind: "buyer_question",
    extractionKey: "buyer_question",
    hintField: "question",
    enricherKey: "question_assign",
    embeddingKind: "buyer_question",
  },
};

export function getTopicStage(kind: TopicStageKind = "topic"): TopicStageSpec {
  return TOPIC_STAGES[kind];
}

export function isTopicStageKind(value: string): value is TopicStageKind {
  return (TOPIC_STAGE_KINDS as readonly string[]).includes(value);
}

/** Embedding kind of `mention_embeddings` used for `kind = topic`. */
export const TOPIC_HINT_EMBEDDING_KIND = TOPIC_STAGES.topic.embeddingKind;

/** Topic settings (docs/decisions.md D15). Stage versions live in the enricher registry (`topic_assign`, `question_assign`). */
export const TOPIC_CONFIG = {
  embeddingModel: "text-embedding-3-small",
  /** Mentions embedded per workflow step, and per embedding request. */
  embedPerStep: 300,
  embedPerRequest: 100,
  model: "gpt-4.1" satisfies ChatModelId,
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
  /** Keywords in the cloud of the Topics report, most mentioned first (D16). */
  reportKeywords: 30,
} as const;
