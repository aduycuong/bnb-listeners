import { z } from "zod";

import { REPORT_CONFIG } from "./config";

const citedItemSchema = z.object({
  title: z.string().describe("Một câu ngắn, ý chính."),
  body: z.string().describe("1–2 câu giải thích, có số liệu từ snapshot khi có."),
  citations: z
    .array(z.string())
    .max(REPORT_CONFIG.maxCitations)
    .describe("Nhãn đề cập làm bằng chứng, như M3. Chỉ dùng nhãn có trong danh sách."),
});

/** What the model writes; numbers and key figures come from the snapshot, not from here. */
export const reportDraftSchema = z.object({
  summary: z.string().describe("Tóm tắt điều hành, 2–3 câu."),
  highlights: z.array(citedItemSchema).max(REPORT_CONFIG.maxItems),
  risks: z.array(citedItemSchema).max(REPORT_CONFIG.maxItems),
  recommendations: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .max(REPORT_CONFIG.maxItems),
  suggestedQuestions: z
    .array(z.string())
    .max(REPORT_CONFIG.suggestedQuestions)
    .describe(
      `${REPORT_CONFIG.suggestedQuestions} câu hỏi ngắn (dưới 80 ký tự) người đọc nên hỏi tiếp về dữ liệu của kỳ này, bám vào điểm nổi bật, rủi ro hoặc biến động trong FACTS.`,
    ),
});

export type ReportDraft = z.infer<typeof reportDraftSchema>;
