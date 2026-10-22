import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { fetchTiktokCommentRepliesPage } from "@/lib/tikhub/services/fetch-tiktok-comment-replies-page";
import type { fetchTiktokVideoCommentsPage } from "@/lib/tikhub/services/fetch-tiktok-video-comments-page";
import type { TikHubCursorPage } from "@/lib/tikhub/types";

import { collectTiktokComments } from "./collect-tiktok-comments";

function comment(cid: string, replyTotal = 0): Record<string, unknown> {
  return { cid, text: `comment ${cid}`, reply_comment_total: replyTotal, reply_id: "0" };
}

function reply(cid: string, parent: string): Record<string, unknown> {
  return { cid, text: `reply ${cid}`, reply_id: parent, reply_to_reply_id: "0" };
}

/** Pages queued per video id (comments) or per comment id (replies). */
function createFetchers(
  commentPages: Record<string, TikHubCursorPage[]>,
  replyPages: Record<string, TikHubCursorPage[]> = {},
) {
  const calls: string[] = [];
  const commentCalls = new Map<string, number>();
  const replyCalls = new Map<string, number>();

  const fetchComments: typeof fetchTiktokVideoCommentsPage = async (params) => {
    const index = commentCalls.get(params.videoId) ?? 0;
    commentCalls.set(params.videoId, index + 1);
    calls.push(`comments:${params.videoId}:${params.cursor ?? "start"}`);
    const page = commentPages[params.videoId]?.[index];
    if (!page) throw new Error(`no comment page ${index} for ${params.videoId}`);
    return page;
  };

  const fetchReplies: typeof fetchTiktokCommentRepliesPage = async (params) => {
    const index = replyCalls.get(params.commentId) ?? 0;
    replyCalls.set(params.commentId, index + 1);
    calls.push(`replies:${params.commentId}:${params.cursor ?? "start"}`);
    const page = replyPages[params.commentId]?.[index];
    if (!page) throw new Error(`no reply page ${index} for ${params.commentId}`);
    return page;
  };

  return { fetchComments, fetchReplies, calls };
}

const base = { limitPerVideo: 150, includeReplies: true, pageSize: 20 };

describe("collectTiktokComments", () => {
  test("reads top-level comments, then the replies of those that have them", async () => {
    const fetchers = createFetchers(
      {
        v1: [{ items: [comment("c1", 2), comment("c2"), comment("c3", 1)], cursor: "20", hasMore: false }],
      },
      {
        c1: [{ items: [reply("r1", "c1"), reply("r2", "c1")], cursor: "2", hasMore: false }],
        c3: [{ items: [reply("r3", "c3")], cursor: "1", hasMore: false }],
      },
    );

    const result = await collectTiktokComments({ ...base, videoIds: ["v1"], ...fetchers });

    assert.deepEqual(
      result.records.map((record) => record.cid),
      ["c1", "c2", "c3", "r1", "r2", "r3"],
    );
    assert.deepEqual(result.videos, [{ videoId: "v1", comments: 3, replies: 3, complete: true }]);
    assert.equal(result.requests, 3);
    assert.deepEqual(fetchers.calls, ["comments:v1:start", "replies:c1:start", "replies:c3:start"]);
  });

  test("tags every row with its video", async () => {
    const fetchers = createFetchers(
      { v1: [{ items: [comment("c1", 1)], cursor: null, hasMore: false }] },
      { c1: [{ items: [reply("r1", "c1")], cursor: null, hasMore: false }] },
    );

    const result = await collectTiktokComments({ ...base, videoIds: ["v1"], ...fetchers });

    assert.deepEqual(
      result.records.map((record) => record.aweme_id),
      ["v1", "v1"],
    );
  });

  test("does not overwrite an existing video id", async () => {
    const fetchers = createFetchers({
      v1: [{ items: [{ ...comment("c1"), aweme_id: "other" }], cursor: null, hasMore: false }],
    });

    const result = await collectTiktokComments({ ...base, videoIds: ["v1"], ...fetchers });

    assert.equal(result.records[0].aweme_id, "other");
  });

  test("follows the cursor through several comment pages", async () => {
    const fetchers = createFetchers({
      v1: [
        { items: [comment("c1"), comment("c2")], cursor: "20", hasMore: true },
        { items: [comment("c3")], cursor: "40", hasMore: false },
      ],
    });

    const result = await collectTiktokComments({ ...base, videoIds: ["v1"], ...fetchers });

    assert.equal(result.records.length, 3);
    assert.deepEqual(fetchers.calls, ["comments:v1:start", "comments:v1:20"]);
  });

  test("the row limit counts comments and replies together", async () => {
    const fetchers = createFetchers(
      { v1: [{ items: [comment("c1", 5), comment("c2", 5)], cursor: null, hasMore: false }] },
      {
        c1: [
          {
            items: [reply("r1", "c1"), reply("r2", "c1"), reply("r3", "c1")],
            cursor: null,
            hasMore: false,
          },
        ],
      },
    );

    const result = await collectTiktokComments({
      ...base,
      limitPerVideo: 4,
      videoIds: ["v1"],
      ...fetchers,
    });

    assert.deepEqual(
      result.records.map((record) => record.cid),
      ["c1", "c2", "r1", "r2"],
    );
    assert.deepEqual(result.videos[0], { videoId: "v1", comments: 2, replies: 2, complete: true });
    // c2's replies are never requested: no rows are left.
    assert.deepEqual(fetchers.calls, ["comments:v1:start", "replies:c1:start"]);
  });

  test("the limit stops the top-level pages as well", async () => {
    const fetchers = createFetchers({
      v1: [{ items: [comment("c1"), comment("c2"), comment("c3")], cursor: "20", hasMore: true }],
    });

    const result = await collectTiktokComments({
      ...base,
      limitPerVideo: 2,
      videoIds: ["v1"],
      ...fetchers,
    });

    assert.equal(result.records.length, 2);
    assert.equal(result.requests, 1);
  });

  test("skips replies when they are switched off", async () => {
    const fetchers = createFetchers({
      v1: [{ items: [comment("c1", 3)], cursor: null, hasMore: false }],
    });

    const result = await collectTiktokComments({
      ...base,
      includeReplies: false,
      videoIds: ["v1"],
      ...fetchers,
    });

    assert.equal(result.records.length, 1);
    assert.equal(result.requests, 1);
  });

  test("pages through the replies of one comment", async () => {
    const fetchers = createFetchers(
      { v1: [{ items: [comment("c1", 3)], cursor: null, hasMore: false }] },
      {
        c1: [
          { items: [reply("r1", "c1"), reply("r2", "c1")], cursor: "2", hasMore: true },
          { items: [reply("r3", "c1")], cursor: "3", hasMore: false },
        ],
      },
    );

    const result = await collectTiktokComments({ ...base, videoIds: ["v1"], ...fetchers });

    assert.equal(result.videos[0].replies, 3);
    assert.deepEqual(fetchers.calls.slice(1), ["replies:c1:start", "replies:c1:2"]);
  });

  test("ignores a row seen twice and a row without a cid", async () => {
    const fetchers = createFetchers({
      v1: [
        {
          items: [comment("c1"), comment("c1"), { text: "no id" }],
          cursor: null,
          hasMore: false,
        },
      ],
    });

    const result = await collectTiktokComments({ ...base, videoIds: ["v1"], ...fetchers });

    assert.equal(result.records.length, 1);
  });

  test("an empty first page ends a video", async () => {
    const fetchers = createFetchers({
      v1: [{ items: [], cursor: "20", hasMore: true }],
      v2: [{ items: [comment("c9")], cursor: null, hasMore: false }],
    });

    const result = await collectTiktokComments({ ...base, videoIds: ["v1", "v2"], ...fetchers });

    assert.deepEqual(result.videos, [
      { videoId: "v1", comments: 0, replies: 0, complete: true },
      { videoId: "v2", comments: 1, replies: 0, complete: true },
    ]);
  });

  test("running out of time keeps the finished rows and marks the rest unfinished", async () => {
    const fetchers = createFetchers({
      v1: [{ items: [comment("c1")], cursor: null, hasMore: false }],
      v2: [{ items: [comment("c2")], cursor: null, hasMore: false }],
      v3: [{ items: [comment("c3")], cursor: null, hasMore: false }],
    });
    let clock = 0;

    // The budget covers one request: v1 finishes, v2 hits the deadline.
    const result = await collectTiktokComments({
      ...base,
      videoIds: ["v1", "v2", "v3"],
      ...fetchers,
      deadlineAt: 1500,
      now: () => (clock += 1000),
    });

    assert.deepEqual(
      result.records.map((record) => record.cid),
      ["c1"],
    );
    assert.deepEqual(result.videos, [
      { videoId: "v1", comments: 1, replies: 0, complete: true },
      { videoId: "v2", comments: 0, replies: 0, complete: false },
      { videoId: "v3", comments: 0, replies: 0, complete: false },
    ]);
  });

  test("any other failure fails the run", async () => {
    const fetchComments: typeof fetchTiktokVideoCommentsPage = async () => {
      throw new Error("402");
    };
    const fetchReplies: typeof fetchTiktokCommentRepliesPage = async () => {
      throw new Error("unused");
    };

    await assert.rejects(
      collectTiktokComments({ ...base, videoIds: ["v1"], fetchComments, fetchReplies }),
      /402/,
    );
  });
});
