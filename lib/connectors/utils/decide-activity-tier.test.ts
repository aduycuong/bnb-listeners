import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { DEFAULT_COLLECT_SETTINGS } from "../settings";
import { decideActivityTier } from "./decide-activity-tier";
import { findNextRefreshCheckpoint } from "./find-next-refresh-checkpoint";
import { getPostsPerDay } from "./get-posts-per-day";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const now = new Date("2026-10-26T12:00:00Z");

describe("getPostsPerDay", () => {
  test("averages over the window", () => {
    const oldest = new Date(now.getTime() - 6.5 * DAY_MS);
    assert.equal(getPostsPerDay({ posts: 70, oldestPublishedAt: oldest, windowDays: 7, now }), 10.8);
  });

  test("a newer source is measured over what it has, at least one day", () => {
    const twoDays = new Date(now.getTime() - 2 * DAY_MS);
    assert.equal(getPostsPerDay({ posts: 60, oldestPublishedAt: twoDays, windowDays: 7, now }), 30);

    const oneHour = new Date(now.getTime() - HOUR_MS);
    assert.equal(getPostsPerDay({ posts: 5, oldestPublishedAt: oneHour, windowDays: 7, now }), 5);
  });

  test("no posts is zero", () => {
    assert.equal(getPostsPerDay({ posts: 0, oldestPublishedAt: null, windowDays: 7, now }), 0);
  });
});

describe("decideActivityTier", () => {
  const thresholds = { hot: 30, normal: 3 };

  test("picks the tier by threshold, inclusive", () => {
    assert.equal(decideActivityTier(30, thresholds), "hot");
    assert.equal(decideActivityTier(29.9, thresholds), "normal");
    assert.equal(decideActivityTier(3, thresholds), "normal");
    assert.equal(decideActivityTier(2.9, thresholds), "low");
    assert.equal(decideActivityTier(0, thresholds), "low");
  });

  test("follows changed thresholds", () => {
    assert.equal(decideActivityTier(12, { hot: 10, normal: 1 }), "hot");
  });
});

describe("findNextRefreshCheckpoint", () => {
  const { checkpointsHours } = DEFAULT_COLLECT_SETTINGS.commentRefresh;

  test("skips checkpoints already passed", () => {
    const publishedAt = new Date(now.getTime() - 10 * HOUR_MS);
    const next = findNextRefreshCheckpoint({ publishedAt, now, checkpointsHours });
    assert.equal(next?.checkpointHours, 24);
    assert.equal(next?.dueAt.getTime(), publishedAt.getTime() + 24 * HOUR_MS);
  });

  test("uses the given checkpoints", () => {
    const publishedAt = new Date(now.getTime() - 10 * HOUR_MS);
    const next = findNextRefreshCheckpoint({ publishedAt, now, checkpointsHours: [12, 48] });
    assert.equal(next?.checkpointHours, 12);
  });

  test("null past the last checkpoint", () => {
    const publishedAt = new Date(now.getTime() - 100 * HOUR_MS);
    assert.equal(findNextRefreshCheckpoint({ publishedAt, now, checkpointsHours }), null);
  });
});
