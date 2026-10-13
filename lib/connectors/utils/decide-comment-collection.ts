import { COLLECT_CONFIG } from "../config";

type DecideCommentCollectionParams = {
  /** Latest `num_comments` of the post (replies included). */
  numComments: number;
  /** `num_comments` at the last collection; null = never collected. */
  collectedCount: number | null;
  ageHours: number;
};

export type CommentCollectionReason =
  | "first-many-comments"
  | "first-old-enough"
  | "grew"
  | null;

/**
 * Comment-collection rules at a refresh checkpoint (docs/plan.md):
 * - never collected and more than `firstCollectMinComments` comments;
 * - never collected, has comments and is at least `firstCollectMinAgeHours` old;
 * - collected before and grew by at least `recollectGrowthRatio`.
 * Returns why to collect, or null to skip.
 */
export function decideCommentCollection(
  params: DecideCommentCollectionParams,
): CommentCollectionReason {
  const config = COLLECT_CONFIG.commentRefresh;

  if (params.collectedCount === null) {
    if (params.numComments > config.firstCollectMinComments) {
      return "first-many-comments";
    }
    if (params.numComments > 0 && params.ageHours >= config.firstCollectMinAgeHours) {
      return "first-old-enough";
    }
    return null;
  }

  const grown =
    params.numComments > params.collectedCount &&
    params.numComments >= params.collectedCount * (1 + config.recollectGrowthRatio);

  return grown ? "grew" : null;
}
