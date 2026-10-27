import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { meanOf } from "./formulas";

describe("meanOf", () => {
  test("each value counts once, one decimal", () => {
    assert.equal(meanOf([-20, 60]), 20);
    assert.equal(meanOf([10, 20, 25]), 18.3);
  });

  test("leaves out missing values; null when none is present", () => {
    assert.equal(meanOf([null, 40, null, 10]), 25);
    assert.equal(meanOf([null, null]), null);
    assert.equal(meanOf([]), null);
  });
});
