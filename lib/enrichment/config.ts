import type { ChatModelId } from "@/lib/langchain/models/registry";

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "Tích cực",
  neutral: "Trung tính",
  negative: "Tiêu cực",
};

/** The six emotions of the demo dashboard (D14). */
export const EMOTIONS = [
  "hai_long",
  "tin_tuong",
  "bat_ngo",
  "lo_lang",
  "tuc_gian",
  "that_vong",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const EMOTION_LABELS: Record<Emotion, string> = {
  hai_long: "Hài lòng",
  tin_tuong: "Tin tưởng",
  bat_ngo: "Bất ngờ",
  lo_lang: "Lo lắng",
  tuc_gian: "Tức giận",
  that_vong: "Thất vọng",
};

/** Enrich settings (docs/decisions.md D14). */
export const ENRICH_CONFIG = {
  model: "gpt-4.1-mini" satisfies ChatModelId,
  /** Bump when the prompt or output shape changes; mentions are enriched again. */
  promptVersion: 5,
  /** Mentions per model call; longer threads are split. */
  mentionsPerCall: 20,
  /** Threads enriched per workflow step. */
  threadsPerStep: 8,
  maxPostChars: 1500,
  maxItemChars: 700,
  /** Longest `topic_hint` kept (D15). */
  maxTopicHintChars: 80,
  /** Keywords kept per mention, and the longest one (D16). */
  maxKeywords: 3,
  maxKeywordChars: 40,
} as const;
