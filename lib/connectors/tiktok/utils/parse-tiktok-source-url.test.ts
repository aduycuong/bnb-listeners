import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildTiktokSearchSourceKey,
  parseTiktokSearchSourceKey,
} from "./build-tiktok-search-source-key";
import { parseTiktokSourceUrl } from "./parse-tiktok-source-url";

describe("parseTiktokSourceUrl", () => {
  test("reads a profile URL and lower-cases the handle", () => {
    assert.deepEqual(parseTiktokSourceUrl("https://www.tiktok.com/@CoChiKimVN"), {
      uniqueId: "cochikimvn",
      canonicalUrl: "https://www.tiktok.com/@cochikimvn",
    });
  });

  test("accepts a trailing slash, a query string and other TikTok hosts", () => {
    for (const url of [
      "https://www.tiktok.com/@demo.channel/",
      "https://tiktok.com/@demo.channel?lang=vi",
      "https://m.tiktok.com/@demo.channel",
      "  https://www.tiktok.com/@demo.channel  ",
    ]) {
      assert.equal(parseTiktokSourceUrl(url)?.uniqueId, "demo.channel", url);
    }
  });

  test("rejects anything that is not a profile root", () => {
    for (const url of [
      "https://www.tiktok.com/@demo.channel/video/7600000000000000001",
      "https://www.tiktok.com/tag/vinhomes",
      "https://www.tiktok.com/search?q=vinhomes",
      "https://www.tiktok.com/",
      "https://www.facebook.com/@demo.channel",
      "https://www.tiktok.com/@",
      "https://www.tiktok.com/@bad handle",
      "not a url",
      "",
    ]) {
      assert.equal(parseTiktokSourceUrl(url), null, url);
    }
  });
});

describe("buildTiktokSearchSourceKey", () => {
  test("joins the upper-cased region and the normalized keyword", () => {
    assert.equal(buildTiktokSearchSourceKey({ keyword: "Vinhomes", region: "vn" }), "VN:vinhomes");
  });

  test("collapses whitespace and keeps Vietnamese diacritics", () => {
    assert.equal(
      buildTiktokSearchSourceKey({ keyword: "  Phí   Quản  Lý ", region: "VN" }),
      "VN:phí quản lý",
    );
    assert.notEqual(
      buildTiktokSearchSourceKey({ keyword: "phí", region: "VN" }),
      buildTiktokSearchSourceKey({ keyword: "phi", region: "VN" }),
    );
  });

  test("treats composed and decomposed Unicode as the same keyword", () => {
    assert.equal(
      buildTiktokSearchSourceKey({ keyword: "phí".normalize("NFD"), region: "VN" }),
      buildTiktokSearchSourceKey({ keyword: "phí".normalize("NFC"), region: "VN" }),
    );
  });

  test("keeps regions apart", () => {
    assert.notEqual(
      buildTiktokSearchSourceKey({ keyword: "vinhomes", region: "VN" }),
      buildTiktokSearchSourceKey({ keyword: "vinhomes", region: "US" }),
    );
  });

  test("refuses an empty keyword", () => {
    assert.throws(() => buildTiktokSearchSourceKey({ keyword: "   ", region: "VN" }));
  });

  test("parseTiktokSearchSourceKey inverts it", () => {
    const key = buildTiktokSearchSourceKey({ keyword: "Giá: bán", region: "VN" });

    assert.deepEqual(parseTiktokSearchSourceKey(key), { region: "VN", keyword: "giá: bán" });
    assert.equal(parseTiktokSearchSourceKey("vinhomes"), null);
    assert.equal(parseTiktokSearchSourceKey("VN:"), null);
  });
});
