import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { APIError } from "@/lib/exposers/api-error";

import type { TikHubClientOptions } from "../types";
import { fetchTiktokCommentRepliesPage } from "./fetch-tiktok-comment-replies-page";
import { fetchTiktokUserPostsPage } from "./fetch-tiktok-user-posts-page";
import { fetchTiktokUserProfile } from "./fetch-tiktok-user-profile";
import { fetchTiktokVideoCommentsPage } from "./fetch-tiktok-video-comments-page";
import { fetchTiktokVideoSearchPage } from "./fetch-tiktok-video-search-page";
import {
  fetchTiktokVideos,
  TIKHUB_MAX_VIDEOS_PER_REQUEST,
} from "./fetch-tiktok-videos";

type Call = { url: URL; init: RequestInit };

/** Answers every request with the same `data` and records the calls. */
function createClient(data: unknown): { client: TikHubClientOptions; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: new URL(String(input)), init: init ?? {} });
    return new Response(JSON.stringify({ code: 200, data }), { status: 200 });
  };
  return { client: { fetchImpl, retryDelayMs: 1 }, calls };
}

describe("TikHub page services", () => {
  let previousKey: string | undefined;

  beforeEach(() => {
    previousKey = process.env.TIKHUB_API_KEY;
    process.env.TIKHUB_API_KEY = "test-key";
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.TIKHUB_API_KEY;
    else process.env.TIKHUB_API_KEY = previousKey;
  });

  test("fetchTiktokUserProfile maps the profile and asks for the username", async () => {
    const { client, calls } = createClient({
      userInfo: {
        user: {
          id: "7000000000000000001",
          uniqueId: "demo.channel",
          secUid: "MS4wLjABAAAAdemo",
          nickname: "Demo Channel",
          avatarThumb: "https://example.test/a.jpg",
          verified: true,
        },
        stats: { followerCount: 7376 },
      },
    });

    const profile = await fetchTiktokUserProfile({ uniqueId: "demo.channel", client });

    assert.deepEqual(profile, {
      id: "7000000000000000001",
      uniqueId: "demo.channel",
      secUid: "MS4wLjABAAAAdemo",
      nickname: "Demo Channel",
      followerCount: 7376,
      avatarUrl: "https://example.test/a.jpg",
      verified: true,
    });
    assert.match(calls[0].url.pathname, /\/web\/fetch_user_profile$/);
    assert.equal(calls[0].url.searchParams.get("uniqueId"), "demo.channel");
  });

  test("fetchTiktokUserProfile reports a missing profile", async () => {
    const { client } = createClient({ userInfo: {} });

    await assert.rejects(
      fetchTiktokUserProfile({ uniqueId: "ghost", client }),
      (error: unknown) =>
        error instanceof APIError && error.code === "ERR_TIKHUB_PROFILE_NOT_FOUND",
    );
  });

  test("fetchTiktokUserPostsPage sends the secUid and a first cursor of 0", async () => {
    const { client, calls } = createClient({
      itemList: [{ id: "1" }, { id: "2" }],
      cursor: 1791936645000,
      hasMore: true,
    });

    const page = await fetchTiktokUserPostsPage({ secUid: "sec-1", client });

    assert.deepEqual(page, {
      items: [{ id: "1" }, { id: "2" }],
      cursor: "1791936645000",
      hasMore: true,
    });
    assert.match(calls[0].url.pathname, /\/web\/fetch_user_post$/);
    assert.equal(calls[0].url.searchParams.get("secUid"), "sec-1");
    assert.equal(calls[0].url.searchParams.get("cursor"), "0");
    assert.equal(calls[0].url.searchParams.get("count"), "20");
  });

  test("fetchTiktokUserPostsPage passes the previous cursor on", async () => {
    const { client, calls } = createClient({ itemList: null, hasMore: false });

    const page = await fetchTiktokUserPostsPage({
      secUid: "sec-1",
      cursor: "1791936645000",
      count: 15,
      client,
    });

    assert.deepEqual(page.items, []);
    assert.equal(calls[0].url.searchParams.get("cursor"), "1791936645000");
    assert.equal(calls[0].url.searchParams.get("count"), "15");
  });

  test("fetchTiktokVideoSearchPage defaults to the last day in VN and unwraps aweme_info", async () => {
    const { client, calls } = createClient({
      search_item_list: [
        { aweme_info: { aweme_id: "10" } },
        { type: 55 },
        { aweme_info: { aweme_id: "11" } },
      ],
      cursor: 20,
      has_more: 1,
    });

    const page = await fetchTiktokVideoSearchPage({ keyword: "vinhomes", client });

    assert.deepEqual(page.items, [{ aweme_id: "10" }, { aweme_id: "11" }]);
    assert.equal(page.cursor, "20");
    const query = calls[0].url.searchParams;
    assert.equal(query.get("keyword"), "vinhomes");
    assert.equal(query.get("publish_time"), "1");
    assert.equal(query.get("sort_type"), "0");
    assert.equal(query.get("region"), "VN");
    assert.equal(query.get("offset"), "0");
  });

  test("fetchTiktokVideoSearchPage upper-cases the region and honours offset", async () => {
    const { client, calls } = createClient({ search_item_list: [], cursor: 40, has_more: 0 });

    await fetchTiktokVideoSearchPage({
      keyword: "x",
      offset: 20,
      region: "us",
      publishTime: 7,
      client,
    });

    const query = calls[0].url.searchParams;
    assert.equal(query.get("region"), "US");
    assert.equal(query.get("offset"), "20");
    assert.equal(query.get("publish_time"), "7");
  });

  test("fetchTiktokVideos posts the ids and returns the video objects", async () => {
    const { client, calls } = createClient([{ aweme_id: "1" }, { aweme_id: "2" }, null]);

    const videos = await fetchTiktokVideos({ videoIds: ["1", "2", "3"], client });

    assert.deepEqual(videos, [{ aweme_id: "1" }, { aweme_id: "2" }]);
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.body, JSON.stringify(["1", "2", "3"]));
  });

  test("fetchTiktokVideos makes no request for no ids and refuses an oversized batch", async () => {
    const { client, calls } = createClient([]);

    assert.deepEqual(await fetchTiktokVideos({ videoIds: [], client }), []);
    assert.equal(calls.length, 0);

    const tooMany = Array.from({ length: TIKHUB_MAX_VIDEOS_PER_REQUEST + 1 }, (_, i) => String(i));
    await assert.rejects(
      fetchTiktokVideos({ videoIds: tooMany, client }),
      (error: unknown) =>
        error instanceof APIError && error.code === "ERR_TIKHUB_BATCH_TOO_LARGE",
    );
    assert.equal(calls.length, 0);
  });

  test("fetchTiktokVideoCommentsPage reads comments under the video id", async () => {
    const { client, calls } = createClient({
      comments: [{ cid: "c1" }],
      cursor: 20,
      has_more: 0,
      total: 7,
    });

    const page = await fetchTiktokVideoCommentsPage({ videoId: "99", client });

    assert.deepEqual(page, { items: [{ cid: "c1" }], cursor: "20", hasMore: false });
    assert.match(calls[0].url.pathname, /\/app\/v3\/fetch_video_comments$/);
    assert.equal(calls[0].url.searchParams.get("aweme_id"), "99");
    assert.equal(calls[0].url.searchParams.get("cursor"), "0");
  });

  test("fetchTiktokCommentRepliesPage asks for the replies of one comment", async () => {
    const { client, calls } = createClient({
      comments: [{ cid: "r1", reply_id: "c1" }],
      cursor: 1,
      has_more: 0,
    });

    const page = await fetchTiktokCommentRepliesPage({
      videoId: "99",
      commentId: "c1",
      client,
    });

    assert.equal(page.items.length, 1);
    assert.match(calls[0].url.pathname, /\/app\/v3\/fetch_video_comment_replies$/);
    assert.equal(calls[0].url.searchParams.get("item_id"), "99");
    assert.equal(calls[0].url.searchParams.get("comment_id"), "c1");
  });
});
