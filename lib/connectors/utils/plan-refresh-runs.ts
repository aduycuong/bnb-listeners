import { COLLECT_CONFIG } from "../config";
import type { FollowUpRun } from "../types";
import { chunk } from "./chunk";

type PostToRefresh = {
  contentItemId: string;
  sourceId: string | null;
  platform: string;
  externalId: string;
  url: string;
};

/**
 * Post-refresh runs for due checkpoints, one per platform, source and chunk.
 * Facebook re-reads a post by URL, TikTok by video id.
 */
export function planRefreshRuns(posts: PostToRefresh[]): FollowUpRun[] {
  const groups = new Map<string, PostToRefresh[]>();

  for (const post of posts) {
    if (post.platform !== "facebook" && post.platform !== "tiktok") continue;

    const key = `${post.platform}|${post.sourceId ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }

  return [...groups.values()].flatMap((group) => {
    const { platform, sourceId } = group[0];

    if (platform === "tiktok") {
      return chunk(group, COLLECT_CONFIG.tiktok.refresh.postsPerRun).map(
        (rows): FollowUpRun => ({
          connector: "tiktok-post-refresh",
          sourceId,
          params: {
            posts: rows.map((row) => ({
              contentItemId: row.contentItemId,
              externalId: row.externalId,
            })),
          },
        }),
      );
    }

    return chunk(group, COLLECT_CONFIG.commentRefresh.postsPerRun).map(
      (rows): FollowUpRun => ({
        connector: "facebook-post-refresh",
        sourceId,
        params: {
          posts: rows.map((row) => ({ contentItemId: row.contentItemId, url: row.url })),
        },
      }),
    );
  });
}
