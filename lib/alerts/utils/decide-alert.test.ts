import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { countFires, deviationFires, growthFires, shareFires } from "./decide-alert";
import { volumeAlertCopy } from "./format-alert-copy";

describe("alert decisions", () => {
  test("growth fires only above the threshold and the minimum count", () => {
    assert.equal(growthFires({ current: 100, previous: 50, threshold: 30, minMentions: 20 }).fires, true);
    assert.equal(growthFires({ current: 10, previous: 1, threshold: 30, minMentions: 20 }).fires, false);
    assert.equal(growthFires({ current: 40, previous: 0, threshold: 30, minMentions: null }).fires, false);
  });

  test("negative share uses classified mentions as the minimum", () => {
    assert.equal(shareFires({ part: 40, total: 100, threshold: 30, minMentions: 20 }).fires, true);
    assert.equal(shareFires({ part: 4, total: 5, threshold: 30, minMentions: 20 }).fires, false);
  });

  test("a keyword count and a price deviation compare against the threshold", () => {
    assert.equal(countFires(5, 5), true);
    assert.equal(countFires(4, 5), false);
    assert.equal(deviationFires(80, 68, 15).fires, true);
    assert.equal(deviationFires(68, 68, 15).fires, false);
  });

  test("volume copy names the growth and the window", () => {
    const copy = volumeAlertCopy({
      scopeLabel: "Toàn project",
      window: "24h",
      current: 130,
      growth: 30,
      threshold: 30,
    });
    assert.match(copy.title, /Lượng thảo luận tăng \+30%/);
    assert.match(copy.body, /130 đề cập trong 24 giờ/);
  });
});
