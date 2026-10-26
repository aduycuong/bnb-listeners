type BudgetedPost = {
  sourceId: string | null;
  /** `num_comments` of the post; drives both priority and the cost estimate. */
  numComments: number;
};

type FitCommentBudgetResult<T> = {
  kept: T[];
  /** Left for a later checkpoint because the source's budget is used up. */
  deferred: T[];
};

/**
 * Picks which comment collections fit in each source's remaining budget.
 * A post is expected to cost `min(num_comments, maxRowsPerPost)` records (at
 * least 1). Posts with the most comments go first; a smaller post can still
 * fit after a bigger one did not. Sources missing from `remaining` are
 * unlimited.
 */
export function fitCommentBudget<T extends BudgetedPost>(
  posts: T[],
  remaining: ReadonlyMap<string, number>,
  maxRowsPerPost: number,
): FitCommentBudgetResult<T> {
  const left = new Map(remaining);
  const kept: T[] = [];
  const deferred: T[] = [];

  for (const post of [...posts].sort((a, b) => b.numComments - a.numComments)) {
    const budget = post.sourceId ? left.get(post.sourceId) : undefined;
    if (budget === undefined) {
      kept.push(post);
      continue;
    }

    const cost = Math.max(1, Math.min(post.numComments, maxRowsPerPost));
    if (cost <= budget) {
      left.set(post.sourceId!, budget - cost);
      kept.push(post);
    } else {
      deferred.push(post);
    }
  }

  return { kept, deferred };
}
