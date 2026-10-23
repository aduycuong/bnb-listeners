import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { readTiktokSubtitle } from "./read-tiktok-subtitle";

/** Invented values in the shapes the App and Web payloads use. */
function appVideo(captionInfos: Record<string, unknown>[]) {
  return { aweme_id: "7600000000000000002", video: { cla_info: { caption_infos: captionInfos } } };
}

function webVideo(subtitleInfos: Record<string, unknown>[]) {
  return { id: "7600000000000000001", video: { subtitleInfos } };
}

describe("readTiktokSubtitle", () => {
  test("reads an App subtitle and prefers Vietnamese", () => {
    const subtitle = readTiktokSubtitle(
      appVideo([
        { url: "https://cdn.test/en.vtt", language_code: "en", is_auto_generated: true, is_original_caption: true },
        { url: "https://cdn.test/vi.vtt", language_code: "vi", is_auto_generated: true, is_original_caption: true },
      ]),
    );

    assert.deepEqual(subtitle, { url: "https://cdn.test/vi.vtt", language: "vi", source: "asr" });
  });

  test("leaves translations out and marks a written subtitle as the creator's", () => {
    const subtitle = readTiktokSubtitle(
      appVideo([
        { url: "https://cdn.test/vi.vtt", language_code: "vi", is_original_caption: false },
        { url_list: ["https://cdn.test/own.vtt"], language_code: "en", is_auto_generated: false },
      ]),
    );

    assert.deepEqual(subtitle, { url: "https://cdn.test/own.vtt", language: "en", source: "creator" });
  });

  test("reads a Web subtitle and skips machine translations", () => {
    const subtitle = readTiktokSubtitle(
      webVideo([
        { Url: "https://cdn.test/en.vtt", LanguageCodeName: "eng-US", Source: "MT" },
        { Url: "https://cdn.test/vi.vtt", LanguageCodeName: "vie-VN", Source: "ASR" },
      ]),
    );

    assert.deepEqual(subtitle, { url: "https://cdn.test/vi.vtt", language: "vie-VN", source: "asr" });
  });

  test("a video without subtitles, or with translations only, has none", () => {
    assert.equal(readTiktokSubtitle({ aweme_id: "1", video: { cla_info: { no_caption_reason: 1 } } }), null);
    assert.equal(
      readTiktokSubtitle(webVideo([{ Url: "https://cdn.test/en.vtt", Source: "MT" }])),
      null,
    );
    assert.equal(readTiktokSubtitle(null), null);
  });
});
