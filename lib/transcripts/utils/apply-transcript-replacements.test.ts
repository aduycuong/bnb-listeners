import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { applyTranscriptReplacements } from "./apply-transcript-replacements";
import { nameSimilarity } from "./name-similarity";

const glossary = [
  { name: "TT Genesis", aliases: ["T&T Genesis"] },
  { name: "Trellia Vista", aliases: [] },
];

describe("applyTranscriptReplacements", () => {
  test("replaces every occurrence of an accepted phrase and nothing else", () => {
    const result = applyTranscriptReplacements({
      transcript: "chelia vita giá 68 triệu, mua chelia vita ngay",
      replacements: [{ from: "chelia vita", to: "Trellia Vista" }],
      glossary,
    });

    assert.equal(result.text, "Trellia Vista giá 68 triệu, mua Trellia Vista ngay");
    assert.deepEqual(result.applied, [{ from: "chelia vita", to: "Trellia Vista" }]);
    assert.deepEqual(result.dropped, []);
  });

  test("drops a name that only sounds like part of a glossary name", () => {
    const result = applyTranscriptReplacements({
      transcript: "phân khu treleco đã cất nóc, dự án the Park Vista bên cạnh",
      replacements: [
        { from: "treleco", to: "Trellia Vista" },
        { from: "the Park Vista", to: "Trellia Vista" },
      ],
      glossary,
    });

    assert.equal(result.text, "phân khu treleco đã cất nóc, dự án the Park Vista bên cạnh");
    assert.deepEqual(
      result.dropped.map((entry) => [entry.from, entry.reason]),
      [
        ["the Park Vista", "not alike"],
        ["treleco", "not alike"],
      ],
    );
  });

  test("drops a target outside the glossary and a phrase not in the text", () => {
    const result = applyTranscriptReplacements({
      transcript: "sinh Ra Riverside và Titi Genesis",
      replacements: [
        { from: "sinh Ra Riverside", to: "Central Riverside" },
        { from: "TV Genesis", to: "TT Genesis" },
        { from: "Titi Genesis", to: "T&T Genesis" },
      ],
      glossary,
    });

    assert.equal(result.text, "sinh Ra Riverside và T&T Genesis");
    assert.deepEqual(
      result.dropped.map((entry) => entry.reason),
      ["not a glossary name", "not in transcript"],
    );
  });
});

describe("nameSimilarity", () => {
  test("ignores accents, case and spaces", () => {
    assert.equal(nameSimilarity("Trellia Vista", "trellia-vista"), 1);
    assert.equal(nameSimilarity("Đạt", "dat"), 1);
  });

  test("scores a misheard name above a different name", () => {
    assert.ok(nameSimilarity("chelia vista", "Trellia Vista") > nameSimilarity("treleco", "Trellia Vista"));
  });
});
