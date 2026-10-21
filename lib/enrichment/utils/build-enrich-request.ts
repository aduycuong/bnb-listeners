import { z } from "zod";

import { ENRICH_CONFIG } from "../config";
import { ENRICHER_REGISTRY, type EnricherKey, type EnricherSpec } from "../registry";
import type { EnrichItem, LlmEnricher, ProjectEnrichContext } from "../types";

const KIND_LABELS: Record<string, string> = {
  post: "bài gốc",
  comment: "bình luận",
  reply: "trả lời",
};

function clip(text: string, max: number) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Keys that run as extractions are grouped under one `extractions` object in the output. */
function split(enrichers: LlmEnricher[]) {
  const builtIn = enrichers.filter((enricher) => !isExtraction(enricher.key));
  const extractions = enrichers.filter((enricher) => isExtraction(enricher.key));
  return { builtIn, extractions };
}

function isExtraction(key: EnricherKey) {
  const spec: EnricherSpec = ENRICHER_REGISTRY[key];
  return spec.kind === "llm" && Boolean(spec.extraction);
}

/**
 * Output schema for one call: the union of the fields of the enrichers taking
 * part (D18). Each enricher reads back only its own fields.
 */
export function buildEnrichSchema(ctx: ProjectEnrichContext, enrichers: LlmEnricher[]) {
  const { builtIn, extractions } = split(enrichers);
  const item: Record<string, z.ZodType> = {
    index: z.int().describe("The [n] index of the item"),
  };
  for (const enricher of builtIn) Object.assign(item, enricher.schemaFields(ctx));
  if (extractions.length > 0) {
    const fields: Record<string, z.ZodType> = {};
    for (const enricher of extractions) Object.assign(fields, enricher.schemaFields(ctx));
    item.extractions = z.object(fields);
  }
  return z.object({ items: z.array(z.object(item)) });
}

export type EnrichResponse = {
  items: ({ index: number; extractions?: Record<string, unknown> } & Record<string, unknown>)[];
};

/** One item's output flattened so every enricher finds its fields at the top level. */
export function flattenItemResult(entry: EnrichResponse["items"][number]): Record<string, unknown> {
  const { extractions, ...rest } = entry;
  return { ...rest, ...(extractions ?? {}) };
}

/** Enrich prompt for some mentions of one thread; the root post is context. */
export function buildEnrichPrompt(params: {
  ctx: ProjectEnrichContext;
  enrichers: LlmEnricher[];
  rootText: string;
  items: EnrichItem[];
}): { system: string; user: string } {
  const { ctx, enrichers } = params;
  const { builtIn, extractions } = split(enrichers);
  const needsEntities = enrichers.some((enricher) => enricher.needsEntities) && ctx.entities.length > 0;
  const needsAspects = enrichers.some((enricher) => enricher.needsAspects) && ctx.aspects.length > 0;

  const system = [
    "Bạn phân tích nội dung mạng xã hội về bất động sản bằng tiếng Việt cho một project theo dõi.",
    "Với mỗi mục được đánh số, cho biết:",
    ...builtIn.flatMap((enricher) => enricher.promptLines(ctx)),
    extractions.length ? "- extractions: các trường riêng bên dưới; không suy đoán khi văn bản không nói rõ." : "",
    "Bài gốc là ngữ cảnh để hiểu bình luận ngắn. Chỉ trả lời cho các mục được đánh số.",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    needsEntities
      ? `Đối tượng theo dõi:\n${ctx.entities
          .map(
            (entity) =>
              `- ${entity.ref}: ${entity.name} (${entity.role})${entity.aliases.length ? `, tên khác: ${entity.aliases.join(", ")}` : ""}`,
          )
          .join("\n")}`
      : "",
    needsAspects
      ? `Khía cạnh:\n${ctx.aspects
          .map((aspect) => `- ${aspect.key}: ${aspect.name}${aspect.description ? ` (${aspect.description})` : ""}`)
          .join("\n")}`
      : "",
    extractions.length
      ? `Trường riêng:\n${extractions.flatMap((enricher) => enricher.promptLines(ctx)).join("\n")}`
      : "",
    `Bài gốc: ${clip(params.rootText, ENRICH_CONFIG.maxPostChars) || "(không có chữ)"}`,
    "Các mục:",
    ...params.items.map(
      (item, index) =>
        `[${index}] (${KIND_LABELS[item.kind] ?? item.kind}) ${clip(item.text, ENRICH_CONFIG.maxItemChars) || "(không có chữ)"}`,
    ),
  ].filter(Boolean);

  return { system, user: lines.join("\n\n") };
}
