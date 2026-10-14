import { z } from "zod";

import { EMOTION_LABELS, EMOTIONS, ENRICH_CONFIG, SENTIMENTS } from "../config";
import type { EnrichItem, ProjectEnrichContext } from "../types";

const KIND_LABELS: Record<string, string> = {
  post: "bài gốc",
  comment: "bình luận",
  reply: "trả lời",
};

function clip(text: string, max: number) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Output schema for one call, built from the project's aspects, entities and case extractions. */
export function buildEnrichSchema(ctx: ProjectEnrichContext) {
  const sentiment = z.enum(SENTIMENTS);
  const item: Record<string, z.ZodType> = {
    index: z.int().describe("The [n] index of the item"),
    sentiment: sentiment.describe("Overall sentiment toward the tracked subjects"),
    sentimentScore: z.number().describe("-1 very negative … 0 neutral … 1 very positive"),
    emotion: z.enum(EMOTIONS).nullable().describe("Dominant emotion, null if none is clear"),
  };

  if (ctx.aspects.length > 0) {
    const keys = ctx.aspects.map((aspect) => aspect.key) as [string, ...string[]];
    item.aspects = z
      .array(z.object({ key: z.enum(keys), sentiment }))
      .describe("Aspects the item discusses, each with its own sentiment; [] if none");
  }
  if (ctx.entities.length > 0) {
    const refs = ctx.entities.map((entity) => entity.ref) as [string, ...string[]];
    item.entities = z
      .array(z.object({ entity: z.enum(refs), sentiment }))
      .describe("Tracked entities the item talks about, with sentiment toward each; [] if none");
  }
  if (ctx.extractions.length > 0) {
    const fields: Record<string, z.ZodType> = {};
    for (const extraction of ctx.extractions) {
      fields[extraction.key] = extraction.many
        ? z.array(extraction.schema).describe(`${extraction.description} [] if none`)
        : extraction.schema.nullable().describe(`${extraction.description} null if none`);
    }
    item.extractions = z.object(fields);
  }

  return z.object({ items: z.array(z.object(item)) });
}

export type EnrichResponse = {
  items: {
    index: number;
    sentiment: (typeof SENTIMENTS)[number];
    sentimentScore: number;
    emotion: (typeof EMOTIONS)[number] | null;
    aspects?: { key: string; sentiment: (typeof SENTIMENTS)[number] }[];
    entities?: { entity: string; sentiment: (typeof SENTIMENTS)[number] }[];
    extractions?: Record<string, unknown>;
  }[];
};

/** Enrich prompt for some mentions of one thread; the root post is context. */
export function buildEnrichPrompt(params: {
  ctx: ProjectEnrichContext;
  rootText: string;
  items: EnrichItem[];
}): { system: string; user: string } {
  const { ctx } = params;
  const system = [
    "Bạn phân tích nội dung mạng xã hội về bất động sản bằng tiếng Việt cho một project theo dõi.",
    "Với mỗi mục được đánh số, cho biết:",
    "- sentiment: thái độ của người viết đối với các đối tượng được theo dõi (không phải tâm trạng chung). Câu hỏi, thông tin trung lập là neutral. Mỉa mai tính theo nghĩa thật.",
    "- sentimentScore: từ -1 đến 1, khớp với sentiment.",
    `- emotion: một trong ${EMOTIONS.map((key) => `${key} (${EMOTION_LABELS[key]})`).join(", ")}, hoặc null nếu không rõ.`,
    ctx.aspects.length ? "- aspects: các khía cạnh mục đó thực sự bàn tới, mỗi khía cạnh có sentiment riêng." : "",
    ctx.entities.length ? "- entities: các đối tượng mục đó nói tới, kèm sentiment với từng đối tượng." : "",
    ctx.extractions.length ? "- extractions: các trường riêng bên dưới; không suy đoán khi văn bản không nói rõ." : "",
    "Bài gốc là ngữ cảnh để hiểu bình luận ngắn. Chỉ trả lời cho các mục được đánh số.",
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    ctx.entities.length
      ? `Đối tượng theo dõi:\n${ctx.entities
          .map(
            (entity) =>
              `- ${entity.ref}: ${entity.name} (${entity.role})${entity.aliases.length ? `, tên khác: ${entity.aliases.join(", ")}` : ""}`,
          )
          .join("\n")}`
      : "",
    ctx.aspects.length
      ? `Khía cạnh:\n${ctx.aspects
          .map((aspect) => `- ${aspect.key}: ${aspect.name}${aspect.description ? ` (${aspect.description})` : ""}`)
          .join("\n")}`
      : "",
    ctx.extractions.length
      ? `Trường riêng:\n${ctx.extractions.map((extraction) => `- ${extraction.key}: ${extraction.description}`).join("\n")}`
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
