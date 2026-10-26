import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { DEFAULT_COLLECT_SETTINGS as settings } from "../settings";
import { getPostConnectorKey } from "./get-post-connector-key";
import { getSourceIntervalHours } from "./get-source-interval-hours";

describe("getPostConnectorKey", () => {
  test("picks the connector by platform and source type", () => {
    assert.equal(getPostConnectorKey({ platform: "facebook", sourceType: "group" }), "facebook-posts");
    assert.equal(getPostConnectorKey({ platform: "facebook", sourceType: "page" }), "facebook-posts");
    assert.equal(getPostConnectorKey({ platform: "tiktok", sourceType: "channel" }), "tiktok-posts");
    assert.equal(getPostConnectorKey({ platform: "tiktok", sourceType: "search" }), "tiktok-search");
  });

  test("returns null where nothing scans the source", () => {
    assert.equal(getPostConnectorKey({ platform: "tiktok", sourceType: "hashtag" }), null);
    assert.equal(getPostConnectorKey({ platform: "youtube", sourceType: "channel" }), null);
    assert.equal(getPostConnectorKey({ platform: "news", sourceType: "site" }), null);
  });
});

describe("getSourceIntervalHours", () => {
  const tiers = settings.tiers.intervalHours;

  test("a group or channel follows its activity tier", () => {
    for (const [platform, sourceType] of [
      ["facebook", "group"],
      ["tiktok", "channel"],
    ]) {
      assert.equal(getSourceIntervalHours({ platform, sourceType, activityTier: "hot" }, settings), tiers.hot);
      assert.equal(getSourceIntervalHours({ platform, sourceType, activityTier: "normal" }, settings), tiers.normal);
      assert.equal(getSourceIntervalHours({ platform, sourceType, activityTier: "low" }, settings), tiers.low);
    }
  });

  test("a keyword search runs at its own interval whatever the tier", () => {
    for (const activityTier of ["hot", "normal", "low"]) {
      assert.equal(
        getSourceIntervalHours({ platform: "tiktok", sourceType: "search", activityTier }, settings),
        settings.tiktokSearch.intervalHours,
      );
    }
  });

  test("a paused source has no interval", () => {
    assert.equal(
      getSourceIntervalHours({ platform: "tiktok", sourceType: "search", activityTier: "paused" }, settings),
      null,
    );
    assert.equal(
      getSourceIntervalHours({ platform: "facebook", sourceType: "group", activityTier: "paused" }, settings),
      null,
    );
  });
});
