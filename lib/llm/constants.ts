export const LLM_PROMPT_KEYS = [
  "classify_topics",
  "propose_topic",
  "score_relevance",
  "score_comment_stances",
] as const;

export type LlmPromptKey = (typeof LLM_PROMPT_KEYS)[number];
