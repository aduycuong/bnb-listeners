import type { SourceDetails } from "../../types";
import type { TiktokWebPost } from "../schema";

/** Source details of a channel, read from one of its videos (written back to `sources`). */
export function toTiktokChannelSourceDetails(post: TiktokWebPost): SourceDetails {
  const uniqueId = post.author?.uniqueId?.trim();
  const secUid = post.author?.secUid?.trim();

  return {
    name: post.author?.nickname?.trim() || null,
    followerCount: post.authorStats?.followerCount ?? null,
    metadata: {
      ...(uniqueId && { uniqueId }),
      ...(secUid && { secUid }),
    },
  };
}
