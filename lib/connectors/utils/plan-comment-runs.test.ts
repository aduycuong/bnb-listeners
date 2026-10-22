import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { COLLECT_CONFIG } from "../config";
import { planCommentRuns } from "./plan-comment-runs";
import { planRefreshRuns } from "./plan-refresh-runs";

function post(platform: string, n: number, sourceId: string | null = "s1") {
  return {
    sourceId,
    platform,
    externalId: `${platform}-${n}`,
    url: `https://example.test/${platform}/${n}`,
  };
}

const { maxRowsPerPost, includeReplies } = COLLECT_CONFIG.commentRefresh;

describe("planCommentRuns", () => {
  test("a Facebook post goes to facebook-comments by URL", () => {
    assert.deepEqual(planCommentRuns([post("facebook", 1), post("facebook", 2)]), [
      {
        connector: "facebook-comments",
        sourceId: "s1",
        params: {
          postUrls: ["https://example.test/facebook/1", "https://example.test/facebook/2"],
          limitPerPost: maxRowsPerPost,
        },
      },
    ]);
  });

  test("a TikTok video goes to tiktok-comments by id and URL", () => {
    assert.deepEqual(planCommentRuns([post("tiktok", 1)]), [
      {
        connector: "tiktok-comments",
        sourceId: "s1",
        params: {
          videos: [{ externalId: "tiktok-1", url: "https://example.test/tiktok/1" }],
          limitPerVideo: maxRowsPerPost,
          includeReplies,
        },
      },
    ]);
  });

  test("keeps platforms and sources apart", () => {
    const runs = planCommentRuns([
      post("facebook", 1, "s1"),
      post("tiktok", 2, "s1"),
      post("tiktok", 3, "s2"),
      post("tiktok", 4, null),
    ]);

    assert.deepEqual(
      runs.map((run) => [run.connector, run.sourceId]),
      [
        ["facebook-comments", "s1"],
        ["tiktok-comments", "s1"],
        ["tiktok-comments", "s2"],
        ["tiktok-comments", null],
      ],
    );
  });

  test("splits a source's TikTok videos into runs of the configured size", () => {
    const size = COLLECT_CONFIG.tiktok.comments.videosPerRun;
    const posts = Array.from({ length: size * 2 + 1 }, (_, i) => post("tiktok", i));

    const runs = planCommentRuns(posts);

    assert.deepEqual(
      runs.map((run) => (run.params.videos as unknown[]).length),
      [size, size, 1],
    );
  });

  test("splits Facebook posts into runs of the configured size", () => {
    const size = COLLECT_CONFIG.commentRefresh.postsPerRun;
    const posts = Array.from({ length: size + 5 }, (_, i) => post("facebook", i));

    const runs = planCommentRuns(posts);

    assert.deepEqual(
      runs.map((run) => (run.params.postUrls as unknown[]).length),
      [size, 5],
    );
  });

  test("leaves out a platform without a comment connector", () => {
    assert.deepEqual(planCommentRuns([post("youtube", 1)]), []);
    assert.deepEqual(planCommentRuns([]), []);
  });
});

describe("planRefreshRuns", () => {
  function due(platform: string, n: number, sourceId: string | null = "s1") {
    return { contentItemId: `item-${platform}-${n}`, ...post(platform, n, sourceId) };
  }

  test("Facebook posts are re-read by URL", () => {
    assert.deepEqual(planRefreshRuns([due("facebook", 1)]), [
      {
        connector: "facebook-post-refresh",
        sourceId: "s1",
        params: {
          posts: [{ contentItemId: "item-facebook-1", url: "https://example.test/facebook/1" }],
        },
      },
    ]);
  });

  test("TikTok videos are re-read by id", () => {
    assert.deepEqual(planRefreshRuns([due("tiktok", 1)]), [
      {
        connector: "tiktok-post-refresh",
        sourceId: "s1",
        params: { posts: [{ contentItemId: "item-tiktok-1", externalId: "tiktok-1" }] },
      },
    ]);
  });

  test("keeps platforms and sources apart and chunks by the platform's size", () => {
    const size = COLLECT_CONFIG.tiktok.refresh.postsPerRun;
    const rows = [
      due("facebook", 1, "s1"),
      ...Array.from({ length: size + 1 }, (_, i) => due("tiktok", i, "s1")),
      due("tiktok", 900, "s2"),
    ];

    const runs = planRefreshRuns(rows);

    assert.deepEqual(
      runs.map((run) => [run.connector, run.sourceId, (run.params.posts as unknown[]).length]),
      [
        ["facebook-post-refresh", "s1", 1],
        ["tiktok-post-refresh", "s1", size],
        ["tiktok-post-refresh", "s1", 1],
        ["tiktok-post-refresh", "s2", 1],
      ],
    );
  });

  test("leaves out a platform without a refresh connector", () => {
    assert.deepEqual(planRefreshRuns([due("youtube", 1)]), []);
  });
});
