import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseCursorPage } from "./parse-cursor-page";

describe("parseCursorPage", () => {
  test("reads items, a numeric cursor and a boolean hasMore", () => {
    const page = parseCursorPage(
      { itemList: [{ id: "1" }, { id: "2" }], cursor: 1791936645000, hasMore: true },
      "itemList",
    );

    assert.deepEqual(page, {
      items: [{ id: "1" }, { id: "2" }],
      cursor: "1791936645000",
      hasMore: true,
    });
  });

  test("reads has_more as 0/1", () => {
    assert.equal(parseCursorPage({ comments: [], has_more: 1 }, "comments").hasMore, true);
    assert.equal(parseCursorPage({ comments: [], has_more: 0 }, "comments").hasMore, false);
  });

  test("falls back to max_cursor and keeps a string cursor", () => {
    const page = parseCursorPage({ aweme_list: [], max_cursor: "42" }, "aweme_list");

    assert.equal(page.cursor, "42");
  });

  test("a null list is an empty page", () => {
    const page = parseCursorPage({ comments: null, cursor: 20, has_more: 0 }, "comments");

    assert.deepEqual(page, { items: [], cursor: "20", hasMore: false });
  });

  test("drops items that are not objects", () => {
    const page = parseCursorPage({ comments: [{ cid: "1" }, null, "x", [1]] }, "comments");

    assert.deepEqual(page.items, [{ cid: "1" }]);
  });

  test("an unusable data field is an empty page without a cursor", () => {
    for (const data of [undefined, null, "oops", []]) {
      assert.deepEqual(parseCursorPage(data, "comments"), {
        items: [],
        cursor: null,
        hasMore: false,
      });
    }
  });
});
