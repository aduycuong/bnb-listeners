import type { ChatModelId } from "@/lib/langchain";
import type { TermCardPeriodPreset } from "@/lib/terms/term-card-config";

import type { DepthConfig, DepthLevel } from "./types";

/** QStash job that runs a research run in the background. */
export const RESEARCH_QSTASH_JOB_NAME = "run-research";

/**
 * Synthetic actor used in the `WorkspaceContext` passed to workspace-scoped
 * services from the background worker (no real user session).
 */
export const RESEARCH_SYSTEM_USER_ID = "research";

/** Default depth when the caller does not specify one. */
export const DEFAULT_DEPTH: DepthLevel = "standard";

/** Fast model for triage / planning / evaluation nodes. */
export const RESEARCH_FAST_MODEL: ChatModelId = "gpt-4.1-mini";

/** Strong model for the final synthesis at standard/deep depth. */
export const RESEARCH_STRONG_MODEL: ChatModelId = "gpt-4.1";

/** Internal chunks fetched per sub-query. */
export const RESEARCH_INTERNAL_LIMIT = 8;

/** Web results fetched per sub-query when Exa is configured. */
export const RESEARCH_WEB_NUM_RESULTS = 4;

/** Max clarifying questions returned to the caller in one triage. */
export const RESEARCH_MAX_CLARIFY_QUESTIONS = 4;

/** Hard ceiling for the LangGraph loop, independent of depth. */
export const RESEARCH_GRAPH_RECURSION_LIMIT = 25;

/** Max chars of parent-post context attached to a discussion finding. */
export const RESEARCH_DOC_CONTEXT_MAX_CHARS = 1_200;

/** Max chars of each media-part summary attached to a post text finding. */
export const RESEARCH_ATTACHMENT_SUMMARY_MAX_CHARS = 300;

/** Max media attachments listed per post text finding. */
export const RESEARCH_MAX_ATTACHMENTS = 8;

/**
 * Period presets the planner may pick for `term_analytics` tasks. Relative
 * presets only — the LLM never passes raw dates.
 */
export const RESEARCH_TERM_PERIODS = [
  "last_7_days",
  "last_30_days",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
] as const satisfies readonly TermCardPeriodPreset[];

/** Max terms included in one term-analytics finding. */
export const RESEARCH_ANALYTICS_MAX_TERMS = 8;

/** Max time buckets rendered per term in the analytics table. */
export const RESEARCH_ANALYTICS_MAX_BUCKETS = 6;

/**
 * How long `start_research` waits inline for a result before returning just
 * the jobId. The QStash worker keeps running regardless; this only controls
 * the fast-path window.
 */
export const RESEARCH_INLINE_WAIT_MS = 30_000;

/** DB poll interval while waiting inline. Lower = snappier return, more reads. */
export const RESEARCH_POLL_INTERVAL_MS = 2_500;

/**
 * Depth is a semantic effort knob (cost/latency trade-off). It maps to
 * internal loop limits and the synthesis model; raw numbers are never exposed.
 */
const DEPTH_CONFIGS: Record<DepthLevel, DepthConfig> = {
  quick: {
    maxIterations: 1,
    maxSubQueries: 3,
    synthesizeModel: RESEARCH_FAST_MODEL,
  },
  standard: {
    maxIterations: 2,
    maxSubQueries: 5,
    synthesizeModel: RESEARCH_STRONG_MODEL,
  },
  deep: {
    maxIterations: 4,
    maxSubQueries: 8,
    synthesizeModel: RESEARCH_STRONG_MODEL,
  },
};

export function getDepthConfig(depth: DepthLevel): DepthConfig {
  return DEPTH_CONFIGS[depth];
}
