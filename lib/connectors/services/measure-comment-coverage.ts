import { and, count, eq, inArray, sql } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

type MeasureCommentCoverageParams = {
  collectRunId: string;
  postUrls: string[];
  limitPerPost: number;
};

type PostCommentCoverage = {
  postExternalId: string;
  /** The post's `num_comments` (replies included) when the run finished. */
  numComments: number;
  /** Rows delivered for the post: top-level comments and replies. */
  collected: number;
  /** Replies among those rows. */
  replies: number;
};

type MeasureCommentCoverageResult = {
  /** Upper bound of billable rows: Σ min(limitPerPost, numComments). */
  expectedMaxRecords: number;
  posts: PostCommentCoverage[];
};

/**
 * Per-post numbers to spot a short comment scrape later: when `collected` is
 * far below `numComments` and under the limit, the provider probably stopped
 * early (deleted or hidden comments also explain small gaps).
 */
export async function measureCommentCoverage(
  params: MeasureCommentCoverageParams,
): Promise<MeasureCommentCoverageResult> {
  const posts = await db
    .select({
      id: contentItems.id,
      externalId: contentItems.externalId,
      commentCount: contentItems.commentCount,
    })
    .from(contentItems)
    .where(
      and(eq(contentItems.kind, "post"), inArray(contentItems.url, params.postUrls)),
    );

  if (posts.length === 0) return { expectedMaxRecords: 0, posts: [] };

  const rows = await db
    .select({
      rootId: contentItems.rootId,
      collected: count(),
      replies: sql<number>`count(*) filter (where ${contentItems.kind} = 'reply')`.mapWith(Number),
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.collectRunId, params.collectRunId),
        inArray(
          contentItems.rootId,
          posts.map((post) => post.id),
        ),
      ),
    )
    .groupBy(contentItems.rootId);

  const byRoot = new Map(rows.map((row) => [row.rootId, row]));

  return {
    expectedMaxRecords: posts.reduce(
      (total, post) => total + Math.min(params.limitPerPost, post.commentCount),
      0,
    ),
    posts: posts.map((post) => ({
      postExternalId: post.externalId,
      numComments: post.commentCount,
      collected: byRoot.get(post.id)?.collected ?? 0,
      replies: Number(byRoot.get(post.id)?.replies ?? 0),
    })),
  };
}
