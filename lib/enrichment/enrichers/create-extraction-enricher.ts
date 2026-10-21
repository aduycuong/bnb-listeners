import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { mentionEnrichments, mentionExtractions, mentionTopics } from "@/db/schema";
import { db } from "@/lib/db";

import type { EnricherKey, ExtractionSpec } from "../registry";
import type { LlmEnricher, ProjectEnrichContext } from "../types";
import { aspectSignature } from "./shared";

/**
 * LLM enricher for a case-specific field (`price_quote`, `buyer_question`, …):
 * one zod schema, stored as jsonb rows of `mention_extractions` under the
 * enricher key.
 */
export function createExtractionEnricher(key: EnricherKey, spec: ExtractionSpec): LlmEnricher {
  const rowSchema = (ctx: ProjectEnrichContext) => {
    if (!spec.aspectField) return spec.schema;
    const aspectKeys: [string, ...string[]] = ["other", ...ctx.aspects.map((aspect) => aspect.key)];
    return spec.schema.extend({
      [spec.aspectField]: z
        .enum(aspectKeys)
        .describe("Khía cạnh của project (key ở danh sách Khía cạnh), other nếu không thuộc khía cạnh nào"),
    });
  };

  return {
    key,
    needsAspects: Boolean(spec.aspectField),
    signatureInput: (ctx) => ({
      description: spec.description,
      many: spec.many,
      shape: Object.keys(spec.schema.shape).sort(),
      aspects: spec.aspectField ? aspectSignature(ctx.aspects) : null,
    }),
    schemaFields: (ctx) => ({
      [key]: spec.many
        ? z.array(rowSchema(ctx)).describe(`${spec.description} [] if none`)
        : rowSchema(ctx).nullable().describe(`${spec.description} null if none`),
    }),
    promptLines: () => [`- ${key}: ${spec.description} Không suy đoán khi văn bản không nói rõ.`],
    writes: (ctx, item, result) => {
      const schema = rowSchema(ctx);
      const value = result[key];
      const values = spec.many ? (Array.isArray(value) ? value : []) : value ? [value] : [];
      const rows = values.flatMap((data) => {
        const parsed = schema.safeParse(data);
        return parsed.success
          ? [{ mentionId: item.mentionId, schemaKey: key, data: parsed.data as Record<string, unknown> }]
          : [];
      });
      const writes: BatchItem<"pg">[] = [
        db
          .delete(mentionExtractions)
          .where(and(eq(mentionExtractions.mentionId, item.mentionId), eq(mentionExtractions.schemaKey, key))),
      ];
      if (rows.length > 0) {
        writes.push(db.insert(mentionExtractions).values(rows));
        if (spec.stage) {
          writes.push(
            db
              .insert(mentionEnrichments)
              .values({
                mentionId: item.mentionId,
                enricherKey: spec.stage.enricherKey,
                status: "pending",
              })
              .onConflictDoNothing(),
          );
        }
        return writes;
      }
      if (spec.stage) {
        writes.push(
          db
            .delete(mentionEnrichments)
            .where(
              and(
                eq(mentionEnrichments.mentionId, item.mentionId),
                eq(mentionEnrichments.enricherKey, spec.stage.enricherKey),
              ),
            ),
          db
            .delete(mentionTopics)
            .where(
              and(eq(mentionTopics.mentionId, item.mentionId), eq(mentionTopics.kind, spec.stage.topicKind)),
            ),
        );
      }
      return writes;
    },
  };
}
