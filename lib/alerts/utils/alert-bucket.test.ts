import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { alertBucket, alertWindowRange } from "./alert-bucket";

const WEEK = 7 * 24 * 60 * 60 * 1000;

describe("alert windows", () => {
  test("a window and the one before it have the same length", () => {
    const now = new Date("2026-10-23T07:30:00.000Z");
    const range = alertWindowRange("24h", now);
    assert.equal(range.end.getTime() - range.start.getTime(), 24 * 60 * 60 * 1000);
    assert.equal(range.start.getTime() - range.previousStart.getTime(), 24 * 60 * 60 * 1000);
  });

  test("hour and day buckets follow the project timezone", () => {
    const now = new Date("2026-10-23T07:30:00.000Z");
    assert.equal(alertBucket("1h", now, "Asia/Ho_Chi_Minh"), "2026-10-23T14");
    assert.equal(alertBucket("24h", now, "Asia/Ho_Chi_Minh"), "2026-10-23");
    assert.equal(alertBucket(null, now, "Asia/Ho_Chi_Minh"), "once");
  });

  test("a 7-day bucket stays put for six days and moves on the seventh", () => {
    const start = new Date(Math.floor(Date.now() / WEEK) * WEEK + 1000);
    assert.equal(alertBucket("7d", start, "UTC"), alertBucket("7d", new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000), "UTC"));
    assert.notEqual(
      alertBucket("7d", start, "UTC"),
      alertBucket("7d", new Date(start.getTime() + WEEK), "UTC"),
    );
  });
});
