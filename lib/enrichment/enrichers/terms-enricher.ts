import { and, eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { mentionEnrichments, mentionExtractions } from "@/db/schema";
import { db } from "@/lib/db";

import { ENRICH_CONFIG } from "../config";
import { TERM_KINDS } from "../registry";
import type { LlmEnricher } from "../types";

/**
 * Terms a mention names, as the model wrote them (D16/D18). Stored raw in
 * `mention_extractions`; the `terms_index` stage normalizes, filters and
 * writes `mention_terms`, so filters and the dictionary can change without
 * another model call.
 */
export const termsEnricher: LlmEnricher = {
  key: "terms",
  signatureInput: () => ({ kinds: TERM_KINDS, max: ENRICH_CONFIG.maxTermsPerMention }),
  schemaFields: () => ({
    terms: z
      .array(
        z.object({
          kind: z.enum(TERM_KINDS).describe("keyword: thing, cost, procedure; place: location; brand: project or brand; org: organization or legal document"),
          text: z.string().describe("1–4 words, Vietnamese with diacritics"),
        }),
      )
      .describe(`0–${ENRICH_CONFIG.maxTermsPerMention} terms the item names; [] if none`),
  }),
  promptLines: () => [
    `- terms: 0–${ENRICH_CONFIG.maxTermsPerMention} cụm danh từ ngắn (1–4 chữ) mà mục đó thực sự nhắc tới, mỗi cụm kèm loại: keyword là sự vật, chi phí, thủ tục cụ thể (ví dụ "sổ hồng", "phí quản lý", "ngập nước", "cắt lỗ"); place là địa điểm, đường, quận, khu vực (ví dụ "Vành đai 3", "Thủ Đức"); brand là dự án, thương hiệu, chủ đầu tư được nêu tên (kể cả đối tượng theo dõi); org là cơ quan, ngân hàng, văn bản pháp luật (ví dụ "Sở Xây dựng", "Luật Kinh doanh BĐS 2023"). Chỉ lấy điều văn bản của mục nhắc tới, không suy ra nhóm chủ đề ("Rẻ thiệt", "Ở đâu vậy" là []). Với keyword, không lấy tên khía cạnh hay từ chung chung về bất động sản như "giá", "vị trí", "pháp lý", "tiện ích", "tiến độ", "dự án", "chủ đầu tư", "căn hộ", "nhà", "mua". Viết tiếng Việt có dấu, đúng chính tả, viết đầy đủ chữ viết tắt ("PQL" → "phí quản lý"). Không lấy từ chức năng, đại từ, từ chỉ thái độ, con số, số tiền, diện tích hay kích thước ("3 tỷ", "50m2").`,
  ],
  writes: (_ctx, item, result) => {
    const raw = Array.isArray(result.terms) ? (result.terms as { kind: unknown; text: unknown }[]) : [];
    const items = raw
      .filter(
        (term): term is { kind: (typeof TERM_KINDS)[number]; text: string } =>
          typeof term.text === "string" &&
          term.text.trim().length > 0 &&
          (TERM_KINDS as readonly string[]).includes(String(term.kind)),
      )
      .map((term) => ({ kind: term.kind, text: term.text.replace(/\s+/g, " ").trim() }))
      .slice(0, ENRICH_CONFIG.maxTermsPerMention);
    const writes: BatchItem<"pg">[] = [
      db
        .delete(mentionExtractions)
        .where(and(eq(mentionExtractions.mentionId, item.mentionId), eq(mentionExtractions.schemaKey, "terms"))),
      db.insert(mentionExtractions).values({ mentionId: item.mentionId, schemaKey: "terms", data: { items } }),
      // New raw terms always go through the index stage again.
      db
        .insert(mentionEnrichments)
        .values({ mentionId: item.mentionId, enricherKey: "terms_index", status: "pending" })
        .onConflictDoUpdate({
          target: [mentionEnrichments.mentionId, mentionEnrichments.enricherKey],
          set: { status: "pending", error: null, updatedAt: sql`now()` },
        }),
    ];
    return writes;
  },
};
