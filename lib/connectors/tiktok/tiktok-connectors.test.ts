import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

import type { getConnector as GetConnector } from "../registry";
import type { tiktokCommentsConnector as CommentsConnector } from "./tiktok-comments-connector";
import type { tiktokPostRefreshConnector as RefreshConnector } from "./tiktok-post-refresh-connector";
import type { tiktokPostsConnector as PostsConnector } from "./tiktok-posts-connector";
import type { tiktokSearchConnector as SearchConnector } from "./tiktok-search-connector";

// The connectors import services that import the database client, which
// refuses to load without a URL. Nothing here connects to it.
let getConnector: typeof GetConnector;
let posts: typeof PostsConnector;
let search: typeof SearchConnector;
let refresh: typeof RefreshConnector;
let comments: typeof CommentsConnector;

before(async () => {
  process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
  ({ getConnector } = await import("../registry"));
  ({ tiktokPostsConnector: posts } = await import("./tiktok-posts-connector"));
  ({ tiktokSearchConnector: search } = await import("./tiktok-search-connector"));
  ({ tiktokPostRefreshConnector: refresh } = await import("./tiktok-post-refresh-connector"));
  ({ tiktokCommentsConnector: comments } = await import("./tiktok-comments-connector"));
});

const webPost = {
  id: "7600000000000000001",
  desc: "Tiến độ dự án",
  createTime: 1792590009,
  author: { id: "7000000000000000001", uniqueId: "demo.channel", nickname: "Demo Channel", secUid: "MS4wLjABAAAAdemo" },
  authorStats: { followerCount: 7378 },
  stats: { playCount: 2211, diggCount: 43, commentCount: 5, shareCount: 2, collectCount: 7 },
};

const aweme = {
  aweme_id: "7600000000000000002",
  desc: "Vinhomes Green Paradise",
  create_time: 1792596140,
  author: { uid: "7000000000000000002", unique_id: "another.user", nickname: "Another User" },
  statistics: { play_count: 1697, digg_count: 306, comment_count: 1, share_count: 1 },
};

const VIDEO_ID = "7600000000000000001";
const VIDEO_URL = "https://www.tiktok.com/@demo.channel/video/7600000000000000001";
const ITEM_ID = "9c1f5b9a-3a0e-4f6e-9f0e-2f3d6f2d1c11";

describe("registry", () => {
  test("hands out the TikTok connectors of the TikTok platform", () => {
    for (const key of ["tiktok-posts", "tiktok-search", "tiktok-post-refresh", "tiktok-comments"]) {
      const connector = getConnector(key);
      assert.equal(connector.key, key);
      assert.equal(connector.platform, "tiktok");
      assert.equal(connector.mode, "direct");
    }
  });
});

describe("tiktok-posts", () => {
  test("params accept a channel URL and default the cap", () => {
    const params = posts.paramsSchema.parse({
      url: "https://www.tiktok.com/@demo.channel",
      since: "2026-10-21T00:00:00.000Z",
    });

    assert.equal(params.maxRecords, 500);
    assert.equal(params.secUid, undefined);
  });

  test("params reject anything that is not a channel URL", () => {
    for (const url of [
      "https://www.tiktok.com/@demo.channel/video/1",
      "https://www.facebook.com/groups/demo",
      "demo.channel",
    ]) {
      assert.equal(
        posts.paramsSchema.safeParse({ url, since: "2026-10-21T00:00:00.000Z" }).success,
        false,
        url,
      );
    }
  });

  test("params need an ISO since", () => {
    assert.equal(
      posts.paramsSchema.safeParse({ url: "https://www.tiktok.com/@a", since: "yesterday" }).success,
      false,
    );
  });

  test("only new videos are written: existing ones are left alone", () => {
    assert.equal(posts.onExisting, "skip");
  });

  test("normalize maps valid videos, counts invalid ones and reads the channel", () => {
    const params = posts.paramsSchema.parse({
      url: "https://www.tiktok.com/@demo.channel",
      since: "2026-10-21T00:00:00.000Z",
    });

    const result = posts.normalize([webPost, { desc: "no id" }, "junk"], params);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].externalId, VIDEO_ID);
    assert.equal(result.skipped, 2);
    assert.deepEqual(result.source, {
      name: "Demo Channel",
      followerCount: 7378,
      metadata: { uniqueId: "demo.channel", secUid: "MS4wLjABAAAAdemo" },
    });
  });

  test("normalize of nothing has no source", () => {
    const params = posts.paramsSchema.parse({
      url: "https://www.tiktok.com/@a",
      since: "2026-10-21T00:00:00.000Z",
    });

    assert.deepEqual(posts.normalize([], params), { items: [], skipped: 0, source: undefined });
  });
});

describe("tiktok-search", () => {
  test("params default the region, the window, the pages and the cap", () => {
    assert.deepEqual(search.paramsSchema.parse({ keyword: "  vinhomes " }), {
      keyword: "vinhomes",
      region: "VN",
      publishTimeDays: 1,
      pages: 4,
      maxRecords: 200,
    });
  });

  test("params reject a window TikHub does not offer and an empty keyword", () => {
    assert.equal(search.paramsSchema.safeParse({ keyword: "x", publishTimeDays: 2 }).success, false);
    assert.equal(search.paramsSchema.safeParse({ keyword: "   " }).success, false);
    assert.equal(search.paramsSchema.safeParse({ keyword: "x", region: "VNM" }).success, false);
  });

  test("normalize maps videos, counts invalid ones and leaves the source alone", () => {
    const params = search.paramsSchema.parse({ keyword: "vinhomes" });

    const result = search.normalize([aweme, { desc: "no id" }], params);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].externalId, "7600000000000000002");
    assert.equal(result.skipped, 1);
    assert.equal(result.source, undefined);
    assert.equal(search.onExisting, "skip");
  });
});

describe("tiktok-post-refresh", () => {
  test("params need uuids and video ids", () => {
    assert.equal(
      refresh.paramsSchema.safeParse({ posts: [{ contentItemId: ITEM_ID, externalId: VIDEO_ID }] }).success,
      true,
    );
    assert.equal(
      refresh.paramsSchema.safeParse({ posts: [{ contentItemId: "nope", externalId: VIDEO_ID }] }).success,
      false,
    );
    assert.equal(refresh.paramsSchema.safeParse({ posts: [] }).success, false);
  });

  test("params cap a run at the configured number of videos", () => {
    const post = { contentItemId: ITEM_ID, externalId: VIDEO_ID };

    assert.equal(
      refresh.paramsSchema.safeParse({ posts: Array.from({ length: 100 }, () => post) }).success,
      true,
    );
    assert.equal(
      refresh.paramsSchema.safeParse({ posts: Array.from({ length: 101 }, () => post) }).success,
      false,
    );
  });

  test("normalize updates counters: the items are posts and rewritten, not skipped", () => {
    const params = refresh.paramsSchema.parse({
      posts: [{ contentItemId: ITEM_ID, externalId: "7600000000000000002" }],
    });

    const result = refresh.normalize([aweme, 42], params);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].likeCount, 306);
    assert.equal(result.skipped, 1);
    assert.equal(refresh.onExisting, undefined);
  });
});

describe("tiktok-comments", () => {
  const params = {
    videos: [{ externalId: VIDEO_ID, url: VIDEO_URL }],
  };

  function row(overrides: Record<string, unknown> = {}) {
    return {
      cid: "7700000000000000010",
      aweme_id: VIDEO_ID,
      text: "Bao giờ bàn giao vậy ad?",
      create_time: 1792495934,
      digg_count: 3,
      reply_comment_total: 1,
      reply_id: "0",
      reply_to_reply_id: "0",
      user: { uid: "6900000000000000001", unique_id: "commenter.one", nickname: "One" },
      ...overrides,
    };
  }

  test("params default the row limit and replies", () => {
    assert.deepEqual(comments.paramsSchema.parse(params), {
      ...params,
      limitPerVideo: 150,
      includeReplies: true,
    });
  });

  test("params need at least one video with a URL", () => {
    assert.equal(comments.paramsSchema.safeParse({ videos: [] }).success, false);
    assert.equal(
      comments.paramsSchema.safeParse({ videos: [{ externalId: VIDEO_ID, url: "not a url" }] }).success,
      false,
    );
  });

  test("normalize maps comments and replies with links built on the video URL", () => {
    const parsed = comments.paramsSchema.parse(params);

    const result = comments.normalize(
      [row(), row({ cid: "7700000000000000011", reply_id: "7700000000000000010", reply_comment_total: undefined })],
      parsed,
    );

    assert.deepEqual(
      result.items.map((item) => [item.kind, item.externalId, item.parentExternalId, item.rootExternalId]),
      [
        ["comment", "7700000000000000010", VIDEO_ID, VIDEO_ID],
        ["reply", "7700000000000000011", "7700000000000000010", VIDEO_ID],
      ],
    );
    assert.equal(result.items[0].url, `${VIDEO_URL}?comment_id=7700000000000000010`);
    assert.equal(result.skipped, 0);
  });

  test("normalize drops stickers, rows without a video and junk", () => {
    const parsed = comments.paramsSchema.parse(params);

    const result = comments.normalize(
      [row({ text: "" }), row({ aweme_id: undefined }), { text: "no cid" }, null],
      parsed,
    );

    assert.equal(result.items.length, 0);
    assert.equal(result.skipped, 4);
  });

  test("a comment on a video that is not in the params still maps, without a link", () => {
    const parsed = comments.paramsSchema.parse(params);

    const result = comments.normalize([row({ aweme_id: "7600000000000000999" })], parsed);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].url, null);
    assert.equal(result.items[0].rootExternalId, "7600000000000000999");
  });
});
