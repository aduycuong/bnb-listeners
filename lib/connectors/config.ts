import type { ActivityTier } from "./constants";

/**
 * Collection tuning in one place. Values come from the Bright Data probes of
 * 2026-10-12; see "Giai đoạn 1 — Phát sinh" in docs/plan.md.
 */
export const COLLECT_CONFIG = {
  posts: {
    /** `start_date` = newest stored post minus this overlap. */
    sinceOverlapHours: 2,
    /** First run of a source with no stored posts looks back this far. */
    initialLookbackHours: 24,
    /** Safety cap per post run until the monthly budget sets it. */
    maxRecordsPerRun: 500,
  },

  tiers: {
    /** Hours between post runs; `paused` sources are never scheduled. */
    intervalHours: {
      hot: 2,
      normal: 6,
      low: 24,
    } satisfies Record<Exclude<ActivityTier, "paused">, number>,
    /** Posts per day are averaged over this many days. */
    windowDays: 7,
    /** Minimum posts per day for each tier; below `normal` is `low`. */
    minPostsPerDay: {
      hot: 30,
      normal: 3,
    },
  },

  commentRefresh: {
    /** Checkpoints in hours after `published_at`, ascending. */
    checkpointsHours: [6, 24, 72],
    /** First collection when `num_comments` is above this, whatever the age. */
    firstCollectMinComments: 100,
    /** Otherwise first collection once the post is this old and has comments. */
    firstCollectMinAgeHours: 24,
    /** Recollect when `num_comments` grew by at least this ratio since the last collection. */
    recollectGrowthRatio: 0.15,
    /**
     * Rows per post (Bright Data `limit_records`). Replies count toward it and
     * arrive interleaved with top-level comments (about 1/3 of the rows).
     */
    maxRowsPerPost: 150,
    /** Bright Data `get_all_replies`; replies to comments and to other replies. */
    includeReplies: true,
    sort: "Most relevant",
    /** Post URLs per `facebook-post-refresh` or `facebook-comments` run. */
    postsPerRun: 100,
    /**
     * A due checkpoint handed to a refresh run is pushed back this long, so the
     * scheduler does not dispatch it again; a failed run is retried after it.
     */
    leaseHours: 3,
  },

  scheduler: {
    /** QStash schedule interval of the `schedule-collections` workflow. */
    intervalMinutes: 15,
  },
} as const;
