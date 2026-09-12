import type { ChatModelId } from "@/lib/langchain";

/** QStash handler name for chained term group member rebuild batches. */
export const TERM_GROUP_MEMBER_REBUILD_QSTASH_JOB_NAME =
  "rebuild-term-group-members-batch";

/** Minimum LLM confidence to assign a term to the group. */
export const TERM_GROUP_MEMBER_REBUILD_CONFIDENCE_MIN = 0.75;

/** Terms fetched from the DB per QStash invocation. */
export const TERM_GROUP_MEMBER_REBUILD_BATCH_SIZE = 20;

/** Terms evaluated per LLM agent call within a batch. */
export const TERM_GROUP_MEMBER_REBUILD_LLM_BATCH_SIZE = 5;

/** Default model for term group member rebuild. */
export const DEFAULT_TERM_GROUP_MEMBER_REBUILD_MODEL: ChatModelId =
  "gpt-4.1-mini";

/** Approximate system prompt token count for cost estimation. */
export const TERM_GROUP_MEMBER_REBUILD_SYSTEM_PROMPT_TOKENS = 500;

/** Approximate output tokens per evaluated term. */
export const TERM_GROUP_MEMBER_REBUILD_OUTPUT_TOKENS_PER_TERM = 40;

/** Extra tokens per Exa answer call (rough estimate for cost UI). */
export const TERM_GROUP_MEMBER_REBUILD_EXA_TOKENS_PER_QUERY = 800;

/** USD per million tokens — input / output. Reuses term backfill pricing. */
export const TERM_GROUP_MEMBER_REBUILD_MODEL_PRICING: Record<
  ChatModelId,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  "gpt-4.1": { inputPerMTok: 2, outputPerMTok: 8 },
  "gpt-4o": { inputPerMTok: 2.5, outputPerMTok: 10 },
  "gpt-4.1-mini": { inputPerMTok: 0.4, outputPerMTok: 1.6 },
};
