import type { ChatModelId } from "@/lib/langchain";

/** AI report settings (docs/decisions.md D29). */
export const REPORT_CONFIG = {
  model: "gpt-4.1" satisfies ChatModelId,
  temperature: 0.2,
  /** Sample mentions given to the model, by how they are picked; at most `maxEvidence` in all. */
  evidence: {
    topEngagement: 40,
    topNegative: 30,
    topics: 6,
    perTopic: 5,
    perAspect: 3,
    maxEvidence: 150,
    textLength: 400,
    rootTextLength: 120,
  },
  /** Items per section the model may write, and mentions per cited item. */
  maxItems: 5,
  maxCitations: 3,
  /** Topics and keywords kept in the snapshot. */
  topTopics: 10,
  topKeywords: 10,
  /** Extra model calls when a number of the text is not in the snapshot. */
  numberRetries: 1,
} as const;

/** `reportSchedule` of a project → the calendar period its reports cover (D29). */
export const REPORT_SCHEDULE_PERIODS = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
} as const;

export const REPORT_TRIGGERS = ["schedule", "user", "script", "mcp"] as const;
