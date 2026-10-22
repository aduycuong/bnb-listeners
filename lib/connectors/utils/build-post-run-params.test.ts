import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { APIError } from "@/lib/exposers/api-error";

import { buildPostRunParams } from "./build-post-run-params";

const SINCE = "2026-10-21T00:00:00.000Z";

const facebookGroup = {
  id: "s-fb",
  platform: "facebook",
  sourceType: "group",
  externalId: "123",
  url: "https://www.facebook.com/groups/demo",
  metadata: {},
};

const tiktokChannel = {
  id: "s-tt",
  platform: "tiktok",
  sourceType: "channel",
  externalId: "7000000000000000001",
  url: "https://www.tiktok.com/@demo.channel",
  metadata: { uniqueId: "demo.channel", secUid: "MS4wLjABAAAAdemo" },
};

const tiktokSearch = {
  id: "s-search",
  platform: "tiktok",
  sourceType: "search",
  externalId: "VN:phí quản lý",
  url: null,
  metadata: {},
};

describe("buildPostRunParams", () => {
  test("a Facebook group keeps the params it always had", () => {
    assert.deepEqual(
      buildPostRunParams(facebookGroup, {
        since: SINCE,
        newestKnownAt: "2026-10-21T05:00:00.000Z",
        maxRecords: 50,
      }),
      {
        connector: "facebook-posts",
        params: {
          url: facebookGroup.url,
          since: SINCE,
          newestKnownAt: "2026-10-21T05:00:00.000Z",
          maxRecords: 50,
        },
      },
    );
  });

  test("a TikTok channel passes the stored secUid", () => {
    assert.deepEqual(buildPostRunParams(tiktokChannel, { since: SINCE }), {
      connector: "tiktok-posts",
      params: { url: tiktokChannel.url, since: SINCE, secUid: "MS4wLjABAAAAdemo" },
    });
  });

  test("a channel without a stored secUid leaves it to the connector", () => {
    const { params } = buildPostRunParams(
      { ...tiktokChannel, metadata: {} },
      { since: SINCE },
    );

    assert.equal("secUid" in params, false);
  });

  test("a keyword search gets its keyword and region from the source key", () => {
    assert.deepEqual(buildPostRunParams(tiktokSearch, { maxRecords: 80 }), {
      connector: "tiktok-search",
      params: { keyword: "phí quản lý", region: "VN", maxRecords: 80 },
    });
  });

  test("a keyword search ignores since", () => {
    const { params } = buildPostRunParams(tiktokSearch, { since: SINCE });

    assert.equal("since" in params, false);
  });

  test("rejects a source nothing scans", () => {
    assert.throws(
      () =>
        buildPostRunParams(
          { ...tiktokChannel, platform: "youtube" },
          { since: SINCE },
        ),
      (error: unknown) =>
        error instanceof APIError && error.code === "ERR_SOURCE_NOT_COLLECTABLE",
    );
  });

  test("rejects a channel without a URL or window", () => {
    assert.throws(() => buildPostRunParams({ ...tiktokChannel, url: null }, { since: SINCE }));
    assert.throws(() => buildPostRunParams(tiktokChannel, {}));
  });

  test("rejects a search source whose key has no keyword", () => {
    assert.throws(() => buildPostRunParams({ ...tiktokSearch, externalId: "garbage" }, {}));
  });
});
