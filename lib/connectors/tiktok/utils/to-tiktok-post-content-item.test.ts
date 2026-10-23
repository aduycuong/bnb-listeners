import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { tiktokAwemeSchema, tiktokWebPostSchema } from "../schema";
import { toTiktokAwemeContentItem } from "./to-tiktok-aweme-content-item";
import { toTiktokChannelSourceDetails } from "./to-tiktok-channel-source-details";
import { toTiktokWebPostContentItem } from "./to-tiktok-web-post-content-item";

/** Invented values in the shape `web/fetch_user_post` returns. */
const webPost = {
  id: "7600000000000000001",
  desc: "  Tiến độ dự án mới nhất #batdongsan #vinhomes  ",
  createTime: 1792590009,
  author: {
    id: "7000000000000000001",
    uniqueId: "demo.channel",
    nickname: "Demo Channel",
    secUid: "MS4wLjABAAAAdemo",
    avatarThumb: "https://example.test/avatar.jpg",
    verified: false,
    signature: "ignored",
  },
  authorStats: { followerCount: 7378, heartCount: 212700 },
  stats: { playCount: 2211, diggCount: 43, commentCount: 5, shareCount: 2, collectCount: 7 },
  video: { duration: 96, cover: "https://example.test/cover.jpg" },
  textExtra: [{ hashtagName: "batdongsan" }, { hashtagName: "vinhomes" }, { hashtagName: "" }],
  music: { title: "original sound", authorName: "Demo Channel", original: true },
  isAd: false,
  textLanguage: "vi",
};

/** Invented values in the shape search and `fetch_multi_video` return. */
const aweme = {
  aweme_id: "7600000000000000002",
  desc: "Vinhomes Green Paradise",
  create_time: 1792596140,
  region: "VN",
  desc_language: "vi",
  is_ads: false,
  is_top: 1,
  author: {
    uid: "7000000000000000002",
    unique_id: "another.user",
    nickname: "Another User",
    sec_uid: "MS4wLjABAAAAother",
    follower_count: 164,
    avatar_thumb: { url_list: ["https://example.test/thumb.jpg"] },
  },
  statistics: {
    play_count: 1697,
    digg_count: 306,
    comment_count: 1,
    share_count: 1,
    collect_count: 5,
    download_count: 0,
  },
  // Milliseconds, as the App payload has it.
  video: { duration: 31400 },
  text_extra: [{ hashtag_name: "vinhomes" }, { hashtag_name: "vinhomes" }],
  music: { title: "nhạc nền", author: "Another User", is_original: true },
};

describe("toTiktokWebPostContentItem", () => {
  test("maps a channel video to a post", () => {
    const item = toTiktokWebPostContentItem(tiktokWebPostSchema.parse(webPost));

    assert.equal(item.kind, "post");
    assert.equal(item.externalId, "7600000000000000001");
    assert.equal(item.url, "https://www.tiktok.com/@demo.channel/video/7600000000000000001");
    assert.equal(item.text, "Tiến độ dự án mới nhất #batdongsan #vinhomes");
    assert.equal(item.publishedAt?.toISOString(), "2026-10-21T13:40:09.000Z");
    assert.equal(item.likeCount, 43);
    assert.equal(item.commentCount, 5);
    assert.equal(item.shareCount, 2);
    assert.equal(item.viewCount, 2211);
    assert.equal(item.reactions, null);
    assert.deepEqual(item.media, []);
    assert.equal(item.parentExternalId, null);
    assert.equal(item.rootExternalId, null);
  });

  test("identifies the author by the numeric id", () => {
    const item = toTiktokWebPostContentItem(tiktokWebPostSchema.parse(webPost));

    assert.deepEqual(item.author, {
      externalId: "7000000000000000001",
      name: "Demo Channel",
      url: "https://www.tiktok.com/@demo.channel",
      avatarUrl: "https://example.test/avatar.jpg",
      followerCount: 7378,
      metadata: { uniqueId: "demo.channel", secUid: "MS4wLjABAAAAdemo", verified: false },
    });
  });

  test("keeps TikTok-only fields in metadata and drops empty hashtags", () => {
    const item = toTiktokWebPostContentItem(tiktokWebPostSchema.parse(webPost));

    assert.deepEqual(item.metadata, {
      postType: "video",
      hashtags: ["batdongsan", "vinhomes"],
      durationSeconds: 96,
      music: { title: "original sound", author: "Demo Channel", original: true },
      region: null,
      language: "vi",
      isAd: false,
      isPinned: false,
      collectCount: 7,
    });
  });

  test("survives drifting field types instead of dropping the row", () => {
    const parsed = tiktokWebPostSchema.parse({
      ...webPost,
      stats: { playCount: 2211.4, diggCount: "43", commentCount: null },
      createTime: "soon",
      desc: 12,
    });
    const item = toTiktokWebPostContentItem(parsed);

    assert.equal(item.viewCount, 2211);
    assert.equal(item.likeCount, 0);
    assert.equal(item.commentCount, 0);
    assert.equal(item.publishedAt, null);
    assert.equal(item.text, "");
  });

  test("a row without an id is rejected", () => {
    assert.equal(tiktokWebPostSchema.safeParse({ desc: "no id" }).success, false);
  });

  test("stores the attached transcript as media", () => {
    const item = toTiktokWebPostContentItem(
      tiktokWebPostSchema.parse({
        ...webPost,
        transcript: {
          text: "chelia vista mở bán",
          language: "vie-VN",
          source: "asr",
          url: "https://media.example.test/transcripts/tiktok/7600000000000000001.vtt",
        },
      }),
    );

    assert.deepEqual(item.media, [
      {
        type: "transcript",
        url: "https://media.example.test/transcripts/tiktok/7600000000000000001.vtt",
        text: "chelia vista mở bán",
        language: "vie-VN",
        source: "asr",
      },
    ]);
  });

  test("a malformed transcript is dropped, not the video", () => {
    const item = toTiktokWebPostContentItem(
      tiktokWebPostSchema.parse({ ...webPost, transcript: { text: "", source: "asr" } }),
    );

    assert.deepEqual(item.media, []);
  });

  test("a video without an author maps to a null author and a neutral link", () => {
    const item = toTiktokWebPostContentItem(
      tiktokWebPostSchema.parse({ id: "7600000000000000009", createTime: 1792590009 }),
    );

    assert.equal(item.author, null);
    assert.equal(item.url, "https://www.tiktok.com/@/video/7600000000000000009");
    assert.equal(item.commentCount, 0);
  });
});

describe("toTiktokAwemeContentItem", () => {
  test("maps a search or refresh video to a post", () => {
    const item = toTiktokAwemeContentItem(tiktokAwemeSchema.parse(aweme));

    assert.equal(item.kind, "post");
    assert.equal(item.externalId, "7600000000000000002");
    assert.equal(item.url, "https://www.tiktok.com/@another.user/video/7600000000000000002");
    assert.equal(item.text, "Vinhomes Green Paradise");
    assert.equal(item.publishedAt?.toISOString(), "2026-10-21T15:22:20.000Z");
    assert.equal(item.likeCount, 306);
    assert.equal(item.commentCount, 1);
    assert.equal(item.shareCount, 1);
    assert.equal(item.viewCount, 1697);
  });

  test("reads the author, the pin flag and de-duplicates hashtags", () => {
    const item = toTiktokAwemeContentItem(tiktokAwemeSchema.parse(aweme));

    assert.deepEqual(item.author, {
      externalId: "7000000000000000002",
      name: "Another User",
      url: "https://www.tiktok.com/@another.user",
      avatarUrl: "https://example.test/thumb.jpg",
      followerCount: 164,
      metadata: { uniqueId: "another.user", secUid: "MS4wLjABAAAAother" },
    });
    assert.deepEqual(item.metadata, {
      postType: "video",
      hashtags: ["vinhomes"],
      durationSeconds: 31,
      music: { title: "nhạc nền", author: "Another User", original: true },
      region: "VN",
      language: "vi",
      isAd: false,
      isPinned: true,
      collectCount: 5,
    });
  });

  test("both shapes of the same video agree on the shared fields", () => {
    const fromWeb = toTiktokWebPostContentItem(tiktokWebPostSchema.parse(webPost));
    const fromAweme = toTiktokAwemeContentItem(
      tiktokAwemeSchema.parse({
        aweme_id: webPost.id,
        desc: webPost.desc,
        create_time: webPost.createTime,
        author: { uid: webPost.author.id, unique_id: webPost.author.uniqueId },
        statistics: { play_count: 2211, digg_count: 43, comment_count: 5, share_count: 2 },
      }),
    );

    assert.equal(fromAweme.externalId, fromWeb.externalId);
    assert.equal(fromAweme.url, fromWeb.url);
    assert.equal(fromAweme.text, fromWeb.text);
    assert.equal(fromAweme.publishedAt?.getTime(), fromWeb.publishedAt?.getTime());
    assert.equal(fromAweme.author?.externalId, fromWeb.author?.externalId);
    assert.equal(fromAweme.viewCount, fromWeb.viewCount);
  });
});

describe("toTiktokChannelSourceDetails", () => {
  test("reads the channel name, followers and ids from a video", () => {
    const details = toTiktokChannelSourceDetails(tiktokWebPostSchema.parse(webPost));

    assert.deepEqual(details, {
      name: "Demo Channel",
      followerCount: 7378,
      metadata: { uniqueId: "demo.channel", secUid: "MS4wLjABAAAAdemo" },
    });
  });

  test("leaves out ids the video does not carry", () => {
    const details = toTiktokChannelSourceDetails(
      tiktokWebPostSchema.parse({ id: "1" }),
    );

    assert.deepEqual(details, { name: null, followerCount: null, metadata: {} });
  });
});
