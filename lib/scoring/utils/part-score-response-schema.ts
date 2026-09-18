import { z } from "zod";

import type { PartScores } from "../types";

/** Structured output shared by the text and vision scorers. */
export const partScoreResponseSchema = z.object({
  relevance: z
    .number()
    .min(0)
    .max(10)
    .describe("Mức liên quan tới phạm vi thu thập, 0–10"),
  detail: z
    .number()
    .min(0)
    .max(10)
    .describe("Mức chi tiết / đầy đủ thông tin tự thân của phần này, 0–10"),
  summary: z
    .string()
    .describe(
      "1–3 câu tóm tắt thông tin phần này chứa. Chuỗi rỗng nếu không có thông tin đáng kể.",
    ),
});

export type PartScoreResponse = z.infer<typeof partScoreResponseSchema>;

export function toPartScores(response: PartScoreResponse): PartScores {
  const summary = response.summary.trim();

  return {
    relevance: response.relevance / 10,
    detail: response.detail / 10,
    summary: summary || null,
  };
}
