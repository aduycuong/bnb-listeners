import { randomUUID } from "node:crypto";

import { z } from "zod";

import { safeSlice } from "@/lib/common/safe-slice";
import { previewMatches } from "@/lib/matching/services/preview-matches";

import { AI_TOOLS_CONFIG } from "../config";
import { toolEntityInputSchema, toolSourceIdsSchema } from "../schema";
import { defineAiTool } from "../utils/define-ai-tool";

/** Tier 1 match counts of entities over sources, as the wizard shows them (no LLM). */
export async function previewEntityMatches(
  sourceIds: string[],
  entities: z.output<typeof toolEntityInputSchema>[],
) {
  const withIds = entities.map((entity) => ({ ...entity, id: randomUUID() }));
  const result = await previewMatches({
    sourceIds,
    entities: withIds.map((entity) => ({
      id: entity.id,
      name: entity.name,
      aliases: entity.aliases ?? [],
      ambiguousAliases: entity.ambiguousAliases ?? [],
      withTerms: entity.withTerms ?? [],
      exclude: entity.exclude ?? [],
    })),
  });
  return {
    days: result.days,
    scannedItems: result.scanned,
    entities: result.entities.map((row, index) => ({
      role: withIds[index].role,
      name: withIds[index].name,
      posts: row.posts,
      comments: row.comments,
      needsConfirmation: row.needsConfirmation,
      contextComments: row.contextComments,
      samples: row.samples.slice(0, AI_TOOLS_CONFIG.previewSamples).map((sample) => ({
        kind: sample.kind,
        text: safeSlice(sample.text, AI_TOOLS_CONFIG.previewSampleLength),
        terms: sample.terms,
      })),
    })),
  };
}

export const previewProjectMatchTool = defineAiTool({
  name: "preview_project_match",
  scope: "projects:write",
  description:
    "Đếm thử số bài và bình luận khớp tên từng đối tượng trên các nguồn chọn, trong những ngày " +
    "gần đây, kèm vài mẫu. Dùng để chỉnh tên, alias và từ loại trừ trước khi tạo project. " +
    "needsConfirmation: khớp tên dễ nhầm, LLM sẽ xác nhận sau.",
  inputSchema: z.object({
    sourceIds: toolSourceIdsSchema,
    entities: z.array(toolEntityInputSchema).min(1).max(60),
  }),
  async run({ sourceIds, entities }) {
    return previewEntityMatches(sourceIds, entities);
  },
});
