import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { collectFactNumbers, findUnknownNumbers, parseReportNumber } from "./find-unknown-numbers";

describe("parseReportNumber", () => {
  test("reads Vietnamese thousands and decimals", () => {
    assert.equal(parseReportNumber("34.260"), 34260);
    assert.equal(parseReportNumber("1.234.567"), 1234567);
    assert.equal(parseReportNumber("15,2"), 15.2);
    assert.equal(parseReportNumber("15.2"), 15.2);
    assert.equal(parseReportNumber("812"), 812);
  });
});

describe("findUnknownNumbers", () => {
  const facts = collectFactNumbers({ mentions: { current: 34260 }, growth: 15.23, nss: -28, share: [12.6] });

  test("accepts numbers of the facts in either format, rounded", () => {
    assert.deepEqual(
      findUnknownNumbers("34.260 lượt đề cập (+15,2%), NSS −28, tiêu cực 12,6%, tăng 15%", facts),
      [],
    );
  });

  test("lets dates, years and small counts through", () => {
    assert.deepEqual(findUnknownNumbers("Ngày 23/9/2026, 3 chủ đề nổi bật trong 2026", facts), []);
  });

  test("reports numbers the facts do not have", () => {
    assert.deepEqual(findUnknownNumbers("Chiếm 29% đề cập, 68% tích cực", facts), ["29", "68"]);
  });
});
