import type { ChatModelId } from "@/lib/langchain/models/registry";

/** Match settings (docs/decisions.md D11). */
export const MATCH_CONFIG = {
  /** Tier 2 model; temperature 0 so cached and fresh answers agree. */
  model: "gpt-4.1-mini" satisfies ChatModelId,
  /** Bump when the tier 2 prompt changes so cached judgments are not reused. */
  promptVersion: 1,
  /** Aliases this short (or all caps) only match the exact token, case-sensitive. */
  strictTermMaxLength: 3,
  strictUpperMaxLength: 6,
  /** Items per tier 2 call; longer threads are split. */
  judgeBatchSize: 30,
  /** Threads judged per workflow step. */
  threadsPerStep: 10,
  maxPostChars: 1500,
  maxItemChars: 500,
  /** Wizard preview window and sample size. */
  previewDays: 30,
  previewSamples: 3,
  /** Rows per insert batch when writing mentions. */
  writeBatchSize: 500,
} as const;
