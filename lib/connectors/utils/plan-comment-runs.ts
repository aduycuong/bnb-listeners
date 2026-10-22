import { COLLECT_CONFIG } from "../config";
import type { FollowUpRun } from "../types";
import { chunk } from "./chunk";

type PostToCollect = {
  sourceId: string | null;
  platform: string;
  /** `content_items.external_id`: the post id TikHub takes. */
  externalId: string;
  url: string;
};

/**
 * Comment runs for the given posts, one per platform, source and chunk. Posts
 * of a platform without a comment connector are left out.
 */
export function planCommentRuns(posts: PostToCollect[]): FollowUpRun[] {
  const { postsPerRun, maxRowsPerPost, includeReplies } = COLLECT_CONFIG.commentRefresh;
  const groups = new Map<string, PostToCollect[]>();

  for (const post of posts) {
    if (post.platform !== "facebook" && post.platform !== "tiktok") continue;

    const key = `${post.platform}|${post.sourceId ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }

  return [...groups.values()].flatMap((group) => {
    const { platform, sourceId } = group[0];

    if (platform === "tiktok") {
      return chunk(group, COLLECT_CONFIG.tiktok.comments.videosPerRun).map(
        (videos): FollowUpRun => ({
          connector: "tiktok-comments",
          sourceId,
          params: {
            videos: videos.map((video) => ({
              externalId: video.externalId,
              url: video.url,
            })),
            limitPerVideo: maxRowsPerPost,
            includeReplies,
          },
        }),
      );
    }

    return chunk(
      group.map((post) => post.url),
      postsPerRun,
    ).map(
      (postUrls): FollowUpRun => ({
        connector: "facebook-comments",
        sourceId,
        params: { postUrls, limitPerPost: maxRowsPerPost },
      }),
    );
  });
}
