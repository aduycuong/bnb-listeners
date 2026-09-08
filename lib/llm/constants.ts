export const LLM_PROMPT_KEYS = [
  "classify_topics",
  "propose_topic",
  "score_relevance",
] as const;

export type LlmPromptKey = (typeof LLM_PROMPT_KEYS)[number];
