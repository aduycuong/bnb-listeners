import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { resolvePeriodDates } from "./resolve-period-dates";

describe("resolvePeriodDates", () => {
  test("rolling: last days with today, compared with the same days before", () => {
    assert.deepEqual(resolvePeriodDates({ type: "rolling", days: 14 }, "2026-10-26"), {
      type: "rolling",
      start: "2026-10-13",
      end: "2026-10-27",
      days: 14,
      previousStart: "2026-09-29",
      previousEnd: "2026-10-13",
      complete: false,
    });
  });

  test("closed month against the whole month before, whatever its length", () => {
    const dates = resolvePeriodDates({ type: "month", date: "2026-03-10" }, "2026-10-26");
    assert.equal(dates.start, "2026-03-01");
    assert.equal(dates.end, "2026-04-01");
    assert.equal(dates.days, 31);
    assert.equal(dates.previousStart, "2026-02-01");
    assert.equal(dates.previousEnd, "2026-03-01");
    assert.equal(dates.complete, true);
  });

  test("running month to date against last month to date", () => {
    const dates = resolvePeriodDates({ type: "month" }, "2026-10-26");
    assert.equal(dates.start, "2026-10-01");
    assert.equal(dates.end, "2026-10-27");
    assert.equal(dates.days, 26);
    assert.equal(dates.previousStart, "2026-09-01");
    assert.equal(dates.previousEnd, "2026-09-27");
    assert.equal(dates.complete, false);
  });

  test("running month on its last day is not complete yet", () => {
    const dates = resolvePeriodDates({ type: "month" }, "2026-10-31");
    assert.equal(dates.end, "2026-11-01");
    assert.equal(dates.complete, false);
    // March has 31 days, February 28: the period compared stops at the start of the period.
    const march = resolvePeriodDates({ type: "month" }, "2026-03-31");
    assert.equal(march.previousEnd, "2026-03-01");
  });

  test("week runs Monday to Sunday", () => {
    const dates = resolvePeriodDates({ type: "week", date: "2026-10-18" }, "2026-10-26");
    assert.equal(dates.start, "2026-10-12");
    assert.equal(dates.end, "2026-10-19");
    assert.equal(dates.previousStart, "2026-10-05");
    assert.equal(dates.complete, true);
  });

  test("quarter and year", () => {
    const quarter = resolvePeriodDates({ type: "quarter", date: "2026-08-15" }, "2026-10-26");
    assert.equal(quarter.start, "2026-07-01");
    assert.equal(quarter.end, "2026-10-01");
    assert.equal(quarter.previousStart, "2026-04-01");
    const year = resolvePeriodDates({ type: "year", date: "2025-06-01" }, "2026-10-26");
    assert.equal(year.start, "2025-01-01");
    assert.equal(year.end, "2026-01-01");
    assert.equal(year.days, 365);
    assert.equal(year.previousStart, "2024-01-01");
  });

  test("custom: both days included, cut at today, same length before", () => {
    const dates = resolvePeriodDates({ type: "custom", from: "2026-10-20", to: "2026-11-05" }, "2026-10-26");
    assert.equal(dates.end, "2026-10-27");
    assert.equal(dates.days, 7);
    assert.equal(dates.previousStart, "2026-10-13");
    assert.equal(dates.previousEnd, "2026-10-20");
    assert.equal(dates.complete, false);
  });

  test("rejects periods that have not started or are too long", () => {
    assert.throws(() => resolvePeriodDates({ type: "month", date: "2026-11-02" }, "2026-10-26"));
    assert.throws(() => resolvePeriodDates({ type: "custom", from: "2026-10-10", to: "2026-10-01" }, "2026-10-26"));
    assert.throws(() => resolvePeriodDates({ type: "custom", from: "2024-01-01", to: "2026-01-01" }, "2026-10-26"));
  });
});
