import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { safeSlice } from "./safe-slice";

describe("safeSlice", () => {
  test("drops an emoji cut in half", () => {
    // "ab🔥" is 4 code units; cutting at 3 would keep half of the emoji.
    assert.equal(safeSlice("ab🔥", 3), "ab");
  });

  test("keeps a whole emoji and plain text as slice does", () => {
    assert.equal(safeSlice("ab🔥c", 4), "ab🔥");
    assert.equal(safeSlice("Trellia Vista", 7), "Trellia");
  });
});
