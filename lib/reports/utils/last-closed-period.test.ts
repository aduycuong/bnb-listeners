import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { lastClosedPeriodStart } from "./last-closed-period";

describe("lastClosedPeriodStart", () => {
  test("day: yesterday", () => {
    assert.equal(lastClosedPeriodStart("day", "2026-10-26"), "2026-10-25");
    assert.equal(lastClosedPeriodStart("day", "2026-01-01"), "2025-12-31");
  });

  test("week: the week before the running one, Monday to Sunday", () => {
    // 2026-10-26 is a Monday: last week is 19–25/10.
    assert.equal(lastClosedPeriodStart("week", "2026-10-26"), "2026-10-19");
    assert.equal(lastClosedPeriodStart("week", "2026-10-29"), "2026-10-19");
    assert.equal(lastClosedPeriodStart("week", "2026-11-01"), "2026-10-19");
  });

  test("month and year", () => {
    assert.equal(lastClosedPeriodStart("month", "2026-10-01"), "2026-09-01");
    assert.equal(lastClosedPeriodStart("month", "2026-03-31"), "2026-02-01");
    assert.equal(lastClosedPeriodStart("year", "2026-10-26"), "2025-01-01");
  });
});
