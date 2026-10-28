import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isValidCronExpression } from "./cron-presets";

describe("isValidCronExpression", () => {
  test("accepts 5-field crons", () => {
    assert.equal(isValidCronExpression("0 * * * *"), true);
    assert.equal(isValidCronExpression(" */15 8-22 * * 1-5 "), true);
  });

  test("rejects empty, 6-field and malformed crons", () => {
    assert.equal(isValidCronExpression(""), false);
    assert.equal(isValidCronExpression("0 0 * * * *"), false);
    assert.equal(isValidCronExpression("every hour"), false);
    assert.equal(isValidCronExpression("61 * * * *"), false);
  });
});
