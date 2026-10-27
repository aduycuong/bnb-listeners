import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { mentionSentiments } from "@/db/schema";
import { db } from "@/lib/db";

import { EMOTION_LABELS, EMOTIONS } from "../config";
import type { LlmEnricher, ProjectEnrichContext } from "../types";
import { entitySignature, isSentiment, sentimentEnum } from "./shared";

/**
 * Sentiment toward the project's subject, its score and the dominant emotion (D14, D30). A brand
 * project's subject includes the developer's projects (`product` entities).
 */
export const sentimentEnricher: LlmEnricher = {
  key: "sentiment",
  needsEntities: true,
  signatureInput: (ctx) => ({ entities: entitySignature(ctx.entities), emotions: EMOTIONS }),
  schemaFields: () => ({
    sentiment: sentimentEnum().describe("Sentiment toward the tracked subject"),
    sentimentScore: z.number().describe("-1 very negative … 0 neutral … 1 very positive"),
    emotion: z.enum(EMOTIONS).nullable().describe("Dominant emotion, null if none is clear"),
  }),
  promptLines: (ctx) => [
    `- sentiment: thái độ của người viết đối với ${subjectLabel(ctx)} (không phải tâm trạng chung, không phải thái độ với chủ đầu tư, dự án hay khu vực khác được nhắc cùng). Câu hỏi, thông tin trung lập, tin rao bán, cho thuê, quảng cáo là neutral trừ khi người viết bày tỏ thái độ. Mỉa mai tính theo nghĩa thật.`,
    "- sentimentScore: từ -1 đến 1, khớp với sentiment.",
    `- emotion: một trong ${EMOTIONS.map((key) => `${key} (${EMOTION_LABELS[key]})`).join(", ")}, hoặc null nếu không rõ.`,
  ],
  writes: (_ctx, item, result) => {
    if (!isSentiment(result.sentiment)) {
      return [db.delete(mentionSentiments).where(eq(mentionSentiments.mentionId, item.mentionId))];
    }
    const score = typeof result.sentimentScore === "number" ? result.sentimentScore : 0;
    const emotion = (EMOTIONS as readonly string[]).includes(String(result.emotion))
      ? String(result.emotion)
      : null;
    return [
      db
        .insert(mentionSentiments)
        .values({
          mentionId: item.mentionId,
          sentiment: result.sentiment,
          sentimentScore: Math.max(-1, Math.min(1, score)),
          emotion,
        })
        .onConflictDoUpdate({
          target: mentionSentiments.mentionId,
          set: {
            sentiment: sql`excluded.sentiment`,
            sentimentScore: sql`excluded.sentiment_score`,
            emotion: sql`excluded.emotion`,
          },
        }),
    ];
  },
};

/** The subject as the prompt names it; products belong to the subject of a brand project. */
function subjectLabel(ctx: ProjectEnrichContext) {
  const subject = ctx.entities.find((entity) => entity.role === "subject");
  if (!subject) return "đối tượng được theo dõi";
  const hasProducts = ctx.entities.some((entity) => entity.role === "product");
  return hasProducts
    ? `${subject.name} (${subject.ref}) và các dự án của ${subject.name} trong danh sách đối tượng`
    : `${subject.name} (${subject.ref})`;
}
