import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { computeCorrectionSignature } from "./compute-correction-signature";

describe("computeCorrectionSignature", () => {
  test("does not depend on the order of names and aliases", () => {
    assert.equal(
      computeCorrectionSignature([
        { name: "TT Genesis", aliases: ["T&T Genesis", "TTG"] },
        { name: "Trellia Vista", aliases: [] },
      ]),
      computeCorrectionSignature([
        { name: "Trellia Vista", aliases: [] },
        { name: "TT Genesis", aliases: ["TTG", "T&T Genesis"] },
      ]),
    );
  });

  test("changes when an alias is added", () => {
    assert.notEqual(
      computeCorrectionSignature([{ name: "Trellia Vista", aliases: [] }]),
      computeCorrectionSignature([{ name: "Trellia Vista", aliases: ["Trellia Cove"] }]),
    );
  });
});
