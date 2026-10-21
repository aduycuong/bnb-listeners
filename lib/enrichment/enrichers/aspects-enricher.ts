import { eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { mentionAspects } from "@/db/schema";
import { db } from "@/lib/db";

import type { LlmEnricher } from "../types";
import { aspectSignature, isSentiment, sentimentEnum } from "./shared";

/** Which of the project's aspects a mention discusses, each with its own sentiment. */
export const aspectsEnricher: LlmEnricher = {
  key: "aspects",
  needsAspects: true,
  signatureInput: (ctx) => ({ aspects: aspectSignature(ctx.aspects) }),
  schemaFields: (ctx) => {
    const fields: Record<string, z.ZodType> = {};
    if (ctx.aspects.length === 0) return fields;
    const keys = ctx.aspects.map((aspect) => aspect.key) as [string, ...string[]];
    fields.aspects = z
      .array(z.object({ key: z.enum(keys), sentiment: sentimentEnum() }))
      .describe("Aspects the item discusses, each with its own sentiment; [] if none");
    return fields;
  },
  promptLines: (ctx) =>
    ctx.aspects.length ? ["- aspects: các khía cạnh mục đó thực sự bàn tới, mỗi khía cạnh có sentiment riêng."] : [],
  writes: (ctx, item, result) => {
    const aspectIds = new Map(ctx.aspects.map((aspect) => [aspect.key, aspect.id]));
    const raw = Array.isArray(result.aspects) ? (result.aspects as { key: string; sentiment: unknown }[]) : [];
    const rows = [
      ...new Map(
        raw
          .filter((aspect) => aspectIds.has(aspect.key) && isSentiment(aspect.sentiment))
          .map((aspect) => [
            aspect.key,
            { mentionId: item.mentionId, aspectId: aspectIds.get(aspect.key)!, sentiment: String(aspect.sentiment) },
          ]),
      ).values(),
    ];
    const writes: BatchItem<"pg">[] = [
      db.delete(mentionAspects).where(eq(mentionAspects.mentionId, item.mentionId)),
    ];
    if (rows.length > 0) writes.push(db.insert(mentionAspects).values(rows));
    return writes;
  },
};
