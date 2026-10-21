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

/**
 * Enrich settings (docs/decisions.md D14, D18). Each enricher's version lives
 * in `registry.ts`; bump it there to rerun that enricher alone.
 */
export const ENRICH_CONFIG = {
  model: "gpt-4.1-mini" satisfies ChatModelId,
  /** Mentions per model call; longer threads are split. */
  mentionsPerCall: 20,
  /** Threads enriched per workflow step. */
  threadsPerStep: 8,
  /** Mentions indexed per `terms_index` step. */
  termsPerStep: 500,
  maxPostChars: 1500,
  maxItemChars: 700,
  /** Longest `topic_hint` kept (D15). */
  maxTopicHintChars: 80,
  /** Terms the model may name per mention; keywords kept per mention after the index; longest term. */
  maxTermsPerMention: 6,
  maxKeywords: 3,
  maxKeywordChars: 40,
  /**
   * Normalized keywords too generic for the cloud, dropped by the `terms_index`
   * stage even when the model returns them; aspect names of the project are
   * dropped too (D16).
   */
  genericKeywords: [
    "giá", "giá cả", "giá bán", "giá nhà", "giá căn hộ", "giá dự án",
    "vị trí", "khu vực", "pháp lý", "tiện ích", "tiến độ", "chất lượng",
    "dự án", "chủ đầu tư", "căn hộ", "chung cư", "nhà", "bất động sản", "thị trường",
    "mua", "bán", "mua nhà", "mua bán", "đầu tư", "người mua", "khách hàng",
  ],
} as const;
