/**
 * Platform-neutral engagement counters.
 *
 * Every network this app listens to exposes these four under some name —
 * likes/hearts/favorites/diggs, comments/replies, shares/retweets/reposts, and
 * views/plays/impressions — so they are stored as real columns and can be
 * filtered and sorted on. Anything platform-specific (Facebook reaction
 * breakdowns, TikTok collects, X bookmarks, Instagram saves) belongs in the
 * document metadata instead.
 */
export type EngagementCounts = {
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
};

export const ZERO_ENGAGEMENT_COUNTS: EngagementCounts = {
  likeCount: 0,
  commentCount: 0,
  shareCount: 0,
  viewCount: 0,
};
