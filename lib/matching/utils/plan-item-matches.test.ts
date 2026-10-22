import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { MatchItem } from "../types";
import { compileQuery } from "./compile-query";
import { planItemMatches } from "./plan-item-matches";

const queries = [
  compileQuery({
    id: "q1",
    entityId: "e1",
    include: ["Trellia Vista"],
    withTerms: [],
    exclude: [],
    proximity: null,
    ambiguous: [],
  }),
];

function item(fields: Partial<MatchItem> & Pick<MatchItem, "id">): MatchItem {
  return {
    kind: "post",
    rootId: null,
    text: "",
    transcript: "",
    contentHash: fields.id,
    platform: "tiktok",
    sourceId: null,
    authorId: null,
    publishedAt: null,
    origin: "connector",
    collectRunId: null,
    ...fields,
  };
}

describe("planItemMatches with transcripts", () => {
  test("a name in the caption is certain", () => {
    const post = item({ id: "p1", text: "Mở bán Trellia Vista", transcript: "trellia vista" });
    const plan = planItemMatches({ items: [post], roots: new Map(), queries });

    assert.deepEqual(plan.certain.map((match) => match.item.id), ["p1"]);
    assert.equal(plan.pending.length, 0);
  });

  test("a name only in the transcript goes to tier 2", () => {
    const post = item({ id: "p1", text: "Căn hộ đẹp #xuhuong", transcript: "hôm nay review Trellia Vista" });
    const plan = planItemMatches({ items: [post], roots: new Map(), queries });

    assert.equal(plan.certain.length, 0);
    assert.deepEqual(
      plan.pending.map((match) => [match.item.id, match.matchType, match.entityIds, match.terms]),
      [["p1", "direct", ["e1"], ["Trellia Vista"]]],
    );
  });

  test("comments under a video named only in its transcript become context candidates", () => {
    const post = item({ id: "p1", text: "#xuhuong", transcript: "Trellia Vista mở bán" });
    const comment = item({ id: "c1", kind: "comment", rootId: "p1", text: "giá bao nhiêu vậy" });
    const plan = planItemMatches({ items: [comment], roots: new Map([["p1", post]]), queries });

    assert.deepEqual(
      plan.pending.map((match) => [match.item.id, match.matchType, match.entityIds]),
      [["c1", "context", ["e1"]]],
    );
  });

  test("an item with neither is left out", () => {
    const post = item({ id: "p1", text: "Căn hộ đẹp", transcript: "chelia vita mở bán" });
    const plan = planItemMatches({ items: [post], roots: new Map(), queries });

    assert.equal(plan.certain.length + plan.pending.length, 0);
  });
});
