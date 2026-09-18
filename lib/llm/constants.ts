export const LLM_PROMPT_KEYS = [
  "classify_terms",
  "classify_term_groups",
  "evaluate_term_group_membership",
  "propose_term",
  "score_text_part",
  "score_media_part",
  "score_comment_stances",
] as const;

export type LlmPromptKey = (typeof LLM_PROMPT_KEYS)[number];
