import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { fitCommentBudget } from "./fit-comment-budget";
import { getUsageDayStart } from "./get-usage-day-start";

const post = (id: string, sourceId: string | null, numComments: number) => ({
  id,
  sourceId,
  numComments,
});

const ids = (posts: { id: string }[]) => posts.map((item) => item.id).sort();

describe("fitCommentBudget", () => {
  test("keeps everything for unlimited sources", () => {
    const posts = [post("a", "s1", 500), post("b", null, 10)];
    const { kept, deferred } = fitCommentBudget(posts, new Map(), 150);
    assert.deepEqual(ids(kept), ["a", "b"]);
    assert.deepEqual(deferred, []);
  });

  test("most comments first, capped at the rows per post", () => {
    const posts = [post("small", "s1", 20), post("big", "s1", 900), post("mid", "s1", 100)];
    const { kept, deferred } = fitCommentBudget(posts, new Map([["s1", 260]]), 150);
    // big costs 150, mid 100, then small (20) does not fit in the 10 left.
    assert.deepEqual(ids(kept), ["big", "mid"]);
    assert.deepEqual(ids(deferred), ["small"]);
  });

  test("a smaller post still fits after a bigger one did not", () => {
    const posts = [post("big", "s1", 120), post("small", "s1", 5)];
    const { kept, deferred } = fitCommentBudget(posts, new Map([["s1", 50]]), 150);
    assert.deepEqual(ids(kept), ["small"]);
    assert.deepEqual(ids(deferred), ["big"]);
  });

  test("budgets are per source; no budget left defers all", () => {
    const posts = [post("a", "s1", 10), post("b", "s2", 10)];
    const { kept, deferred } = fitCommentBudget(posts, new Map([["s1", 0], ["s2", 10]]), 150);
    assert.deepEqual(ids(kept), ["b"]);
    assert.deepEqual(ids(deferred), ["a"]);
  });
});

describe("getUsageDayStart", () => {
  test("a day starts at midnight Vietnam time (17:00 UTC)", () => {
    assert.equal(
      getUsageDayStart(new Date("2026-10-26T16:59:00Z")).toISOString(),
      "2026-10-25T17:00:00.000Z",
    );
    assert.equal(
      getUsageDayStart(new Date("2026-10-26T17:00:00Z")).toISOString(),
      "2026-10-26T17:00:00.000Z",
    );
    assert.equal(
      getUsageDayStart(new Date("2026-10-26T03:00:00Z")).toISOString(),
      "2026-10-25T17:00:00.000Z",
    );
  });
});
