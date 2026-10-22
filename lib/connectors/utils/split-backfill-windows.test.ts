import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { splitBackfillWindows } from "./split-backfill-windows";

const iso = (date: Date) => date.toISOString();

describe("splitBackfillWindows", () => {
  test("splits newest first and shortens the oldest window", () => {
    const windows = splitBackfillWindows(
      new Date("2026-10-01T00:00:00Z"),
      new Date("2026-10-06T00:00:00Z"),
      2,
    );

    assert.deepEqual(
      windows.map((window) => [iso(window.since), iso(window.until)]),
      [
        ["2026-10-04T00:00:00.000Z", "2026-10-06T00:00:00.000Z"],
        ["2026-10-02T00:00:00.000Z", "2026-10-04T00:00:00.000Z"],
        ["2026-10-01T00:00:00.000Z", "2026-10-02T00:00:00.000Z"],
      ],
    );
  });

  test("keeps a short range as one window", () => {
    const windows = splitBackfillWindows(
      new Date("2026-10-05T00:00:00Z"),
      new Date("2026-10-06T00:00:00Z"),
      7,
    );
    assert.equal(windows.length, 1);
  });

  test("returns nothing for an empty range", () => {
    const at = new Date("2026-10-05T00:00:00Z");
    assert.deepEqual(splitBackfillWindows(at, at, 2), []);
  });
});
