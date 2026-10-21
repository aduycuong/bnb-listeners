import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { mentionSentiments } from "@/db/schema";
import { db } from "@/lib/db";

import { EMOTION_LABELS, EMOTIONS } from "../config";
import type { LlmEnricher } from "../types";
import { entitySignature, isSentiment, sentimentEnum } from "./shared";

/** Sentiment toward the tracked subjects, its score and the dominant emotion (D14). */
export const sentimentEnricher: LlmEnricher = {
  key: "sentiment",
  needsEntities: true,
  signatureInput: (ctx) => ({ entities: entitySignature(ctx.entities), emotions: EMOTIONS }),
  schemaFields: () => ({
    sentiment: sentimentEnum().describe("Overall sentiment toward the tracked subjects"),
    sentimentScore: z.number().describe("-1 very negative … 0 neutral … 1 very positive"),
    emotion: z.enum(EMOTIONS).nullable().describe("Dominant emotion, null if none is clear"),
  }),
  promptLines: () => [
    "- sentiment: thái độ của người viết đối với các đối tượng được theo dõi (không phải tâm trạng chung). Câu hỏi, thông tin trung lập, tin rao bán, cho thuê, quảng cáo là neutral trừ khi người viết bày tỏ thái độ. Mỉa mai tính theo nghĩa thật.",
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
