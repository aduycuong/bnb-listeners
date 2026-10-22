import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { fetchTiktokVideoSearchPage } from "@/lib/tikhub/services/fetch-tiktok-video-search-page";
import type { TikHubCursorPage } from "@/lib/tikhub/types";

import { scanTiktokSearch } from "./scan-tiktok-search";

function aweme(id: string): Record<string, unknown> {
  return { aweme_id: id };
}

function createFetchPage(pages: TikHubCursorPage[]) {
  const calls: { offset?: number; count?: number; publishTime?: number; region?: string; keyword: string }[] = [];
  const fetchPage: typeof fetchTiktokVideoSearchPage = async (params) => {
    calls.push({
      offset: params.offset,
      count: params.count,
      publishTime: params.publishTime,
      region: params.region,
      keyword: params.keyword,
    });
    const page = pages[calls.length - 1];
    if (!page) throw new Error("fetched more pages than expected");
    return page;
  };
  return { fetchPage, calls };
}

const base = {
  keyword: "vinhomes",
  region: "VN",
  publishTimeDays: 1 as const,
  pages: 4,
  pageSize: 20,
  maxRecords: 500,
};

describe("scanTiktokSearch", () => {
  test("reads every page, including those after an empty one", async () => {
    const { fetchPage } = createFetchPage([
      { items: [aweme("1"), aweme("2")], cursor: "20", hasMore: true },
      { items: [], cursor: "40", hasMore: false },
      { items: [aweme("3")], cursor: "60", hasMore: true },
      { items: [], cursor: "80", hasMore: false },
    ]);

    const result = await scanTiktokSearch({ ...base, fetchPage });

    assert.deepEqual(
      result.records.map((record) => record.aweme_id),
      ["1", "2", "3"],
    );
    assert.equal(result.requests, 4);
    assert.deepEqual(result.pageSizes, [2, 0, 1, 0]);
  });

  test("walks the offsets and passes the window, region and keyword on", async () => {
    const { fetchPage, calls } = createFetchPage([
      { items: [], cursor: null, hasMore: false },
      { items: [], cursor: null, hasMore: false },
    ]);

    await scanTiktokSearch({ ...base, pages: 2, pageSize: 15, fetchPage });

    assert.deepEqual(
      calls.map((call) => call.offset),
      [0, 15],
    );
    assert.equal(calls[0].count, 15);
    assert.equal(calls[0].publishTime, 1);
    assert.equal(calls[0].region, "VN");
    assert.equal(calls[0].keyword, "vinhomes");
  });

  test("counts and drops a video seen on more than one page", async () => {
    const { fetchPage } = createFetchPage([
      { items: [aweme("1"), aweme("2")], cursor: "20", hasMore: true },
      { items: [aweme("2"), aweme("3"), aweme("1")], cursor: "40", hasMore: true },
    ]);

    const result = await scanTiktokSearch({ ...base, pages: 2, fetchPage });

    assert.deepEqual(
      result.records.map((record) => record.aweme_id),
      ["1", "2", "3"],
    );
    assert.equal(result.duplicates, 3 - 1);
  });

  test("stops once the record cap is reached", async () => {
    const { fetchPage, calls } = createFetchPage([
      { items: [aweme("1"), aweme("2"), aweme("3")], cursor: "20", hasMore: true },
      { items: [aweme("4")], cursor: "40", hasMore: true },
    ]);

    const result = await scanTiktokSearch({ ...base, maxRecords: 2, fetchPage });

    assert.equal(result.records.length, 2);
    assert.equal(calls.length, 1);
  });

  test("ignores a video without an id", async () => {
    const { fetchPage } = createFetchPage([
      { items: [{ desc: "no id" }, aweme("1")], cursor: null, hasMore: false },
    ]);

    const result = await scanTiktokSearch({ ...base, pages: 1, fetchPage });

    assert.deepEqual(
      result.records.map((record) => record.aweme_id),
      ["1"],
    );
  });

  test("a failed page fails the scan", async () => {
    const fetchPage: typeof fetchTiktokVideoSearchPage = async () => {
      throw new Error("402");
    };

    await assert.rejects(scanTiktokSearch({ ...base, fetchPage }), /402/);
  });

  test("fails with a timeout error once the budget is spent", async () => {
    const { fetchPage, calls } = createFetchPage([
      { items: [aweme("1")], cursor: "20", hasMore: true },
    ]);
    let clock = 0;

    await assert.rejects(
      scanTiktokSearch({ ...base, fetchPage, deadlineAt: 1500, now: () => (clock += 1000) }),
      (error: unknown) =>
        error instanceof Error && "code" in error && error.code === "ERR_TIKTOK_RUN_TIMEOUT",
    );
    assert.equal(calls.length, 1);
  });
});
