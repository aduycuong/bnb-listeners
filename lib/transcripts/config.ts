import type { ChatModelId } from "@/lib/langchain/models/registry";

/** LLM correction of speech-recognition transcripts against a glossary of names (D22). */
export const TRANSCRIPT_CORRECTION_CONFIG = {
  /**
   * Model comparison of 2026-10-22 (6 models, 74 videos): gemini-3.6-flash and
   * gpt-5.5 named no wrong entity on their own; gemini costs about 20 times less.
   */
  model: "gemini-3.6-flash" satisfies ChatModelId,
  /** Bump when the prompt changes so stored corrections become stale. */
  promptVersion: 1,
  /**
   * Least `nameSimilarity` between a misheard phrase and the name it becomes.
   * Probe of 2026-10-22: every wrong replacement scored 0.58 or less ("the Park
   * Vista", Trellia Cove heard as "treleco"); right ones mostly 0.62 or more.
   */
  minNameSimilarity: 0.6,
  /** Model calls in flight at once. */
  concurrency: 4,
  /** Items per workflow step: about 5 s per call, two rounds of `concurrency`. */
  itemsPerStep: 8,
} as const;
