import { COLLECT_CONFIG } from "../config";
import type { FollowUpRun } from "../types";
import { chunk } from "./chunk";

type PostToCollect = {
  sourceId: string | null;
  url: string;
};

/** `facebook-comments` runs for the given posts, one per source and chunk. */
export function planCommentRuns(posts: PostToCollect[]): FollowUpRun[] {
  const { postsPerRun, maxRowsPerPost } = COLLECT_CONFIG.commentRefresh;
  const urlsBySource = new Map<string | null, string[]>();

  for (const post of posts) {
    urlsBySource.set(post.sourceId, [...(urlsBySource.get(post.sourceId) ?? []), post.url]);
  }

  return [...urlsBySource].flatMap(([sourceId, urls]) =>
    chunk(urls, postsPerRun).map((postUrls) => ({
      connector: "facebook-comments" as const,
      sourceId,
      params: { postUrls, limitPerPost: maxRowsPerPost },
    })),
  );
}
