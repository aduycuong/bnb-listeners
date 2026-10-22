import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { vttToText } from "./vtt-to-text";

describe("vttToText", () => {
  test("keeps the spoken lines and drops header, cue ids, timings and tags", () => {
    const vtt = [
      "﻿WEBVTT",
      "",
      "NOTE generated",
      "by TikTok",
      "",
      "1",
      "00:00:00.000 --> 00:00:02.500",
      "Chelia Vista <i>mở bán</i>",
      "",
      "2",
      "00:00:02.500 --> 00:00:04.000",
      "giá từ",
      "68",
      "",
      "00:00:04.000 --> 00:00:05.000",
      "68",
      "triệu một mét vuông",
    ].join("\r\n");

    assert.equal(vttToText(vtt), "Chelia Vista mở bán giá từ 68 triệu một mét vuông");
  });

  test("an empty file gives an empty text", () => {
    assert.equal(vttToText("WEBVTT\n\n"), "");
  });
});
