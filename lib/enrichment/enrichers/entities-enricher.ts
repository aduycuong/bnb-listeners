import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { mentionEntities } from "@/db/schema";
import { db } from "@/lib/db";

import type { LlmEnricher } from "../types";
import { entitySignature, isSentiment, sentimentEnum } from "./shared";

/**
 * Which tracked entities a mention talks about, with sentiment toward each. Only entities Match
 * linked the mention to are kept: the model tends to give an untracked developer to the tracked
 * one by role. Mentions without matched entities (added by hand) keep the model's answer.
 */
export const entitiesEnricher: LlmEnricher = {
  key: "entities",
  needsEntities: true,
  signatureInput: (ctx) => ({ entities: entitySignature(ctx.entities) }),
  schemaFields: (ctx) => {
    const fields: Record<string, z.ZodType> = {};
    if (ctx.entities.length === 0) return fields;
    const refs = ctx.entities.map((entity) => entity.ref) as [string, ...string[]];
    fields.entities = z
      .array(z.object({ entity: z.enum(refs), sentiment: sentimentEnum() }))
      .describe("Tracked entities the item talks about, with sentiment toward each; [] if none");
    return fields;
  },
  promptLines: (ctx) =>
    ctx.entities.length
      ? [
          "- entities: các đối tượng theo dõi mục đó nói tới, kèm sentiment với từng đối tượng.",
          "  Chỉ gán khi mục nói về chính đối tượng đó: nhắc tên hoặc tên khác, hoặc rõ ràng nói về đối tượng mà bài gốc nhắc tên. Nhãn trong ngoặc (vai trò) chỉ để hiểu đối tượng, không phải điều kiện để gán: một chủ đầu tư, dự án hay khu vực khác không có trong danh sách thì không gán cho đối tượng nào. Không chắc thì [].",
        ]
      : [],
  writes: (ctx, item, result) => {
    const allowed = new Set(item.matchedEntityIds);
    const entityIds = new Map(
      ctx.entities
        .filter((entity) => allowed.size === 0 || allowed.has(entity.id))
        .map((entity) => [entity.ref, entity.id]),
    );
    const raw = Array.isArray(result.entities)
      ? (result.entities as { entity: string; sentiment: unknown }[])
      : [];
    const rows = [
      ...new Map(
        raw
          .filter((entity) => entityIds.has(entity.entity) && isSentiment(entity.sentiment))
          .map((entity) => [
            entity.entity,
            {
              mentionId: item.mentionId,
              entityId: entityIds.get(entity.entity)!,
              sentiment: String(entity.sentiment),
            },
          ]),
      ).values(),
    ];
    const writes: BatchItem<"pg">[] = [
      db.delete(mentionEntities).where(eq(mentionEntities.mentionId, item.mentionId)),
    ];
    if (rows.length > 0) writes.push(db.insert(mentionEntities).values(rows));
    return writes;
  },
};
