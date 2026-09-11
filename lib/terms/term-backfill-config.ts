import type { ChatModelId } from "@/lib/langchain";

/** QStash handler name for chained backfill batch processing. */
export const TERM_BACKFILL_QSTASH_JOB_NAME = "rebuild-term-batch";

/** Minimum quality_score for a document to be eligible for backfill. */
export const TERM_BACKFILL_QUALITY_MIN = 0.5;

/** Minimum LLM confidence to assign a document to the term. */
export const TERM_BACKFILL_CONFIDENCE_MIN = 0.7;

/** Documents fetched from the DB per QStash invocation. */
export const TERM_BACKFILL_BATCH_SIZE = 20;

/** Documents evaluated per LLM request within a batch. */
export const TERM_BACKFILL_LLM_BATCH_SIZE = 10;

/** Max characters of document content sent to the evaluator. */
export const TERM_BACKFILL_CONTENT_MAX_CHARS = 3_000;

/** Default model for term backfill classification. */
export const DEFAULT_TERM_BACKFILL_MODEL: ChatModelId = "gpt-4.1-mini";

/** Approximate system prompt token count for cost estimation. */
export const TERM_BACKFILL_SYSTEM_PROMPT_TOKENS = 400;

/** Approximate output tokens per evaluated document. */
export const TERM_BACKFILL_OUTPUT_TOKENS_PER_DOC = 35;

/** USD per million tokens — input / output. */
export const TERM_BACKFILL_MODEL_PRICING: Record<
  ChatModelId,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  "gpt-4.1": { inputPerMTok: 2, outputPerMTok: 8 },
  "gpt-4o": { inputPerMTok: 2.5, outputPerMTok: 10 },
  "gpt-4.1-mini": { inputPerMTok: 0.4, outputPerMTok: 1.6 },
};
