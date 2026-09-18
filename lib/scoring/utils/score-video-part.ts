import type { PartScores } from "../types";

export type ScoreVideoPartParams = {
  /** Stable (R2) URL of the video. */
  videoUrl: string;
  systemPrompt: string;
};

/**
 * Placeholder — video scoring is not implemented.
 *
 * None of the chat models in the registry accept video input directly. The
 * intended implementation samples key frames (or uses a provider video
 * endpoint), scores them with the vision prompt, and aggregates. Until then
 * every video part scores 0/0 and is therefore never eligible for chunking;
 * the caller records score_source = "placeholder" so this is visible in the UI.
 */
export async function scoreVideoPart(
  params: ScoreVideoPartParams,
): Promise<PartScores> {
  // Signature is final; the body is not. Keep the contract visible to callers.
  void params;

  return { relevance: 0, detail: 0, summary: null };
}
