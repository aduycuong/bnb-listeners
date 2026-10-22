import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { tiktokCommentSchema } from "../schema";
import { toTiktokCommentContentItem } from "./to-tiktok-comment-content-item";

const VIDEO_ID = "7600000000000000001";
const VIDEO_URL = "https://www.tiktok.com/@demo.channel/video/7600000000000000001";

/** Invented values in the shape `fetch_video_comments` returns. */
const topLevel = {
  cid: "7700000000000000010",
  aweme_id: VIDEO_ID,
  text: "  Dự án này bao giờ bàn giao vậy ad?  ",
  create_time: 1792495934,
  digg_count: 18,
  reply_comment_total: 4,
  reply_id: "0",
  reply_to_reply_id: "0",
  user: {
    uid: "6900000000000000001",
    unique_id: "commenter.one",
    nickname: "Commenter One",
    sec_uid: "MS4wLjABAAAAc1",
    follower_count: 12,
    avatar_thumb: { url_list: ["https://example.test/c1.jpg"] },
  },
};

function map(comment: unknown, videoUrl: string | null = VIDEO_URL) {
  return toTiktokCommentContentItem({
    comment: tiktokCommentSchema.parse(comment),
    videoId: VIDEO_ID,
    videoUrl,
  });
}

describe("toTiktokCommentContentItem", () => {
  test("maps a top-level comment under the video", () => {
    const item = map(topLevel)!;

    assert.equal(item.kind, "comment");
    assert.equal(item.externalId, "7700000000000000010");
    assert.equal(item.url, `${VIDEO_URL}?comment_id=7700000000000000010`);
    assert.equal(item.text, "Dự án này bao giờ bàn giao vậy ad?");
    assert.equal(item.publishedAt?.toISOString(), "2026-10-20T11:32:14.000Z");
    assert.equal(item.likeCount, 18);
    assert.equal(item.commentCount, 4);
    assert.equal(item.parentExternalId, VIDEO_ID);
    assert.equal(item.rootExternalId, VIDEO_ID);
    assert.deepEqual(item.metadata, { videoId: VIDEO_ID });
  });

  test("identifies the commenter by the numeric uid", () => {
    const item = map(topLevel)!;

    assert.deepEqual(item.author, {
      externalId: "6900000000000000001",
      name: "Commenter One",
      url: "https://www.tiktok.com/@commenter.one",
      avatarUrl: "https://example.test/c1.jpg",
      followerCount: 12,
      metadata: { uniqueId: "commenter.one", secUid: "MS4wLjABAAAAc1" },
    });
  });

  test("a reply to a comment has the comment as parent", () => {
    const item = map({
      cid: "7700000000000000011",
      text: "Quý 3 năm sau",
      create_time: 1792496000,
      digg_count: 2,
      reply_id: topLevel.cid,
      reply_to_reply_id: "0",
      user: { uid: "6900000000000000002" },
    })!;

    assert.equal(item.kind, "reply");
    assert.equal(item.parentExternalId, topLevel.cid);
    assert.equal(item.rootExternalId, VIDEO_ID);
    assert.equal(item.commentCount, 0);
  });

  test("a reply to a reply has that reply as parent", () => {
    const item = map({
      cid: "7700000000000000012",
      text: "Đồng ý",
      create_time: 1792496100,
      reply_id: topLevel.cid,
      reply_to_reply_id: "7700000000000000011",
      user: { uid: "6900000000000000003" },
    })!;

    assert.equal(item.kind, "reply");
    assert.equal(item.parentExternalId, "7700000000000000011");
  });

  test("builds no link without the video URL", () => {
    assert.equal(map(topLevel, null)!.url, null);
  });

  test("drops a comment without text, such as a sticker", () => {
    assert.equal(map({ ...topLevel, text: "   " }), null);
    assert.equal(map({ ...topLevel, text: null }), null);
  });

  test("a comment without a user has no author", () => {
    assert.equal(map({ ...topLevel, user: undefined })!.author, null);
  });

  test("a row without a comment id is rejected", () => {
    assert.equal(tiktokCommentSchema.safeParse({ text: "hi" }).success, false);
  });
});
