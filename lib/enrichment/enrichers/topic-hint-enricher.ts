import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { mentionEnrichments, mentionExtractions, mentionTopics } from "@/db/schema";
import { db } from "@/lib/db";

import { ENRICH_CONFIG } from "../config";
import type { LlmEnricher } from "../types";

/**
 * Short phrase naming the concrete issue of a mention (D15). Stored raw in
 * `mention_extractions`; the `topic_assign` stage groups it. A hint that
 * appears or changes puts the stage back to `pending`; one that disappears
 * removes the mention from its topic.
 */
export const topicHintEnricher: LlmEnricher = {
  key: "topic_hint",
  signatureInput: () => ({ maxChars: ENRICH_CONFIG.maxTopicHintChars }),
  schemaFields: () => ({
    topicHint: z
      .string()
      .nullable()
      .describe("Short phrase naming the concrete issue or event the item is about; null if none"),
  }),
  promptLines: () => [
    '- topicHint: cụm từ 3–8 chữ nêu sự việc hoặc vấn đề cụ thể mục đó bàn tới, đủ cụ thể để gom các mục cùng chuyện (ví dụ "chậm bàn giao tòa S2", "phí quản lý tăng", "dự án mang danh Châu Âu nhưng không giống"). Ghi vấn đề, không ghi tên dự án, khu, thương hiệu, trừ khi vấn đề chỉ đúng với một nơi (ví dụ "ngập đường Nguyễn Hữu Cảnh"); không ghi con số cụ thể, không ghi thái độ. Bình luận ngắn hiểu theo bài gốc. null nếu chỉ là cảm thán, tag người, chấm hóng, xin thông tin chung chung.',
  ],
  writes: (_ctx, item, result) => {
    const text =
      typeof result.topicHint === "string"
        ? result.topicHint.replace(/\s+/g, " ").trim().slice(0, ENRICH_CONFIG.maxTopicHintChars)
        : "";
    const writes: BatchItem<"pg">[] = [
      db
        .delete(mentionExtractions)
        .where(and(eq(mentionExtractions.mentionId, item.mentionId), eq(mentionExtractions.schemaKey, "topic_hint"))),
    ];
    if (!text) {
      writes.push(
        db
          .delete(mentionEnrichments)
          .where(
            and(eq(mentionEnrichments.mentionId, item.mentionId), eq(mentionEnrichments.enricherKey, "topic_assign")),
          ),
        db.delete(mentionTopics).where(and(eq(mentionTopics.mentionId, item.mentionId), eq(mentionTopics.kind, "topic"))),
      );
      return writes;
    }
    writes.push(
      db.insert(mentionExtractions).values({ mentionId: item.mentionId, schemaKey: "topic_hint", data: { text } }),
      // A new hint waits for the stage; an existing row keeps its state, the stage
      // notices a changed hint by its embedding hash (D15).
      db
        .insert(mentionEnrichments)
        .values({ mentionId: item.mentionId, enricherKey: "topic_assign", status: "pending" })
        .onConflictDoNothing(),
    );
    return writes;
  },
};
