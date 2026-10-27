import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { SelectableSource } from "../types";
import { groupSelectableSources } from "./group-selectable-sources";

function source(id: string, platform: string, sourceType: string, postCount = 0): SelectableSource {
  return {
    id,
    platform,
    sourceType,
    name: id,
    url: null,
    origin: "connector",
    memberCount: null,
    postCount,
    lastCollectedAt: null,
  };
}

describe("groupSelectableSources", () => {
  test("groups by platform and source type, known channels first", () => {
    const groups = groupSelectableSources([
      source("yt", "youtube", "channel"),
      source("tt", "tiktok", "channel"),
      source("page", "facebook", "page"),
      source("group", "facebook", "group"),
    ]);
    assert.deepEqual(
      groups.map((group) => group.label),
      ["Group Facebook", "Page Facebook", "Kênh TikTok", "youtube · channel"],
    );
  });

  test("puts the sources of a group by post count, most first", () => {
    const [group] = groupSelectableSources([
      source("a", "facebook", "group", 3),
      source("b", "facebook", "group", 10),
    ]);
    assert.deepEqual(
      group.sources.map((item) => item.id),
      ["b", "a"],
    );
  });
});
