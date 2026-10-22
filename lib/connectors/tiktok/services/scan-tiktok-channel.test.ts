import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { fetchTiktokUserPostsPage } from "@/lib/tikhub/services/fetch-tiktok-user-posts-page";
import type { TikHubCursorPage } from "@/lib/tikhub/types";

import { scanTiktokChannel } from "./scan-tiktok-channel";

const SINCE = new Date("2026-10-20T00:00:00Z");
const BASE = Date.parse("2026-10-21T00:00:00Z") / 1000;

/** A video published `hours` before BASE (negative = after). */
function video(id: string, hoursBefore: number): Record<string, unknown> {
  return { id, createTime: BASE - hoursBefore * 3600 };
}

function createFetchPage(pages: TikHubCursorPage[]) {
  const calls: { cursor: string | null | undefined; count: number | undefined }[] = [];
  const fetchPage: typeof fetchTiktokUserPostsPage = async (params) => {
    calls.push({ cursor: params.cursor, count: params.count });
    const page = pages[calls.length - 1];
    if (!page) throw new Error("fetched more pages than expected");
    return page;
  };
  return { fetchPage, calls };
}

const base = { secUid: "sec", since: SINCE, maxPages: 10, maxRecords: 500 };

describe("scanTiktokChannel", () => {
  test("keeps the window, stops after the page that leaves it and drops older videos", async () => {
    const { fetchPage, calls } = createFetchPage([
      { items: [video("a", 1), video("b", 5)], cursor: "100", hasMore: true },
      { items: [video("c", 20), video("d", 30), video("e", 50)], cursor: "200", hasMore: true },
      { items: [video("f", 70)], cursor: "300", hasMore: true },
    ]);

    const result = await scanTiktokChannel({ ...base, fetchPage });

    // "d" (30 h before BASE) is already older than `since`, 24 h before BASE.
    assert.deepEqual(
      result.records.map((record) => record.id),
      ["a", "b", "c"],
    );
    assert.equal(result.stoppedBy, "reachedSince");
    assert.equal(result.requests, 2);
    assert.equal(calls.length, 2);
    assert.deepEqual(
      calls.map((call) => call.cursor),
      [null, "100"],
    );
  });

  test("a video repeated across the page boundary is kept once", async () => {
    const { fetchPage } = createFetchPage([
      { items: [video("a", 1), video("b", 2)], cursor: "100", hasMore: true },
      { items: [video("b", 2), video("c", 3), video("x", 80)], cursor: "200", hasMore: true },
    ]);

    const result = await scanTiktokChannel({ ...base, fetchPage });

    assert.deepEqual(
      result.records.map((record) => record.id),
      ["a", "b", "c"],
    );
  });

  test("an old pinned video at the top does not end the scan", async () => {
    const pinned = video("pinned", 24 * 40);
    const { fetchPage } = createFetchPage([
      { items: [pinned, video("a", 1), video("b", 2)], cursor: "100", hasMore: true },
      { items: [video("c", 10), video("d", 50)], cursor: "200", hasMore: true },
    ]);

    const result = await scanTiktokChannel({ ...base, fetchPage });

    assert.deepEqual(
      result.records.map((record) => record.id),
      ["a", "b", "c"],
    );
    assert.equal(result.requests, 2);
    assert.equal(result.stoppedBy, "reachedSince");
  });

  test("stops when the channel has no more pages", async () => {
    const { fetchPage } = createFetchPage([
      { items: [video("a", 1)], cursor: "100", hasMore: false },
    ]);

    const result = await scanTiktokChannel({ ...base, fetchPage });

    assert.equal(result.stoppedBy, "noMore");
    assert.equal(result.truncated, false);
  });

  test("an empty first page ends the scan with no records", async () => {
    const { fetchPage } = createFetchPage([{ items: [], cursor: null, hasMore: false }]);

    const result = await scanTiktokChannel({ ...base, fetchPage });

    assert.deepEqual(result.records, []);
    assert.equal(result.requests, 1);
  });

  test("a repeated cursor does not loop", async () => {
    const { fetchPage } = createFetchPage([
      { items: [video("a", 1)], cursor: "100", hasMore: true },
      { items: [video("b", 2)], cursor: "100", hasMore: true },
    ]);

    const result = await scanTiktokChannel({ ...base, fetchPage });

    assert.equal(result.stoppedBy, "noMore");
    assert.equal(result.requests, 2);
  });

  test("reports a truncated scan at the page limit", async () => {
    const { fetchPage } = createFetchPage([
      { items: [video("a", 1)], cursor: "100", hasMore: true },
      { items: [video("b", 2)], cursor: "200", hasMore: true },
    ]);

    const result = await scanTiktokChannel({ ...base, maxPages: 2, fetchPage });

    assert.equal(result.stoppedBy, "maxPages");
    assert.equal(result.truncated, true);
    assert.equal(result.records.length, 2);
  });

  test("caps the records and says so", async () => {
    const { fetchPage } = createFetchPage([
      { items: [video("a", 1), video("b", 2), video("c", 3)], cursor: "100", hasMore: true },
    ]);

    const result = await scanTiktokChannel({ ...base, maxRecords: 2, fetchPage });

    assert.deepEqual(
      result.records.map((record) => record.id),
      ["a", "b"],
    );
    assert.equal(result.stoppedBy, "maxRecords");
    assert.equal(result.truncated, true);
  });

  test("keeps a video with no publish time", async () => {
    const { fetchPage } = createFetchPage([
      { items: [{ id: "undated" }, video("a", 1)], cursor: null, hasMore: false },
    ]);

    const result = await scanTiktokChannel({ ...base, fetchPage });

    assert.deepEqual(
      result.records.map((record) => record.id),
      ["undated", "a"],
    );
  });

  test("fails with a timeout error once the budget is spent", async () => {
    const { fetchPage, calls } = createFetchPage([
      { items: [video("a", 1)], cursor: "100", hasMore: true },
      { items: [video("b", 2)], cursor: "200", hasMore: true },
    ]);
    let clock = 0;

    await assert.rejects(
      scanTiktokChannel({
        ...base,
        fetchPage,
        deadlineAt: 1500,
        now: () => (clock += 1000),
      }),
      (error: unknown) =>
        error instanceof Error && "code" in error && error.code === "ERR_TIKTOK_RUN_TIMEOUT",
    );
    assert.equal(calls.length, 1);
  });

  test("a failed request fails the scan and returns nothing", async () => {
    let count = 0;
    const fetchPage: typeof fetchTiktokUserPostsPage = async () => {
      count++;
      if (count === 2) throw new Error("boom");
      return { items: [video("a", 1)], cursor: "100", hasMore: true };
    };

    await assert.rejects(scanTiktokChannel({ ...base, fetchPage }), /boom/);
  });

  test("asks for the page size it was given", async () => {
    const { fetchPage, calls } = createFetchPage([{ items: [], cursor: null, hasMore: false }]);

    await scanTiktokChannel({ ...base, pageSize: 15, fetchPage });

    assert.equal(calls[0].count, 15);
  });
});
