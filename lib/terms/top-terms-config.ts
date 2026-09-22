import type { ChatModelId } from "@/lib/langchain";

/** Default number of relevant terms returned by `findRelevantTopTerms`. */
export const TOP_TERMS_DEFAULT_LIMIT = 10;

/** Active terms (ranked by trend) fetched and evaluated per LLM call. */
export const TOP_TERMS_LLM_BATCH_SIZE = 20;

/** Hard cap on terms scanned per `findRelevantTopTerms` run (cost guard). */
export const TOP_TERMS_MAX_SCANNED = 100;

/** Minimum LLM confidence for a term to count as relevant to the query. */
export const TOP_TERMS_RELEVANCE_CONFIDENCE_MIN = 0.7;

/** Fast model used to judge term relevance against the query. */
export const TOP_TERMS_RELEVANCE_MODEL: ChatModelId = "gpt-4.1-mini";

/** Max `exa_answer` tool calls the relevance agent may make per batch. */
export const TOP_TERMS_RELEVANCE_MAX_WEB_QUERIES = 10;
