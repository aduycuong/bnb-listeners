import { z } from "zod";

import { safeSlice } from "@/lib/common/safe-slice";
import { SENTIMENTS } from "@/lib/enrichment/config";
import { listMentionsQuerySchema } from "@/lib/mentions/schema";
import { listMentions } from "@/lib/mentions/services/list-mentions";

import { AI_TOOLS_CONFIG } from "../config";
import { toolPeriodSchema, toolProjectIdSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { resolveToolPeriod } from "../utils/resolve-tool-period";

function cut(text: string | null, length: number) {
  if (!text) return text;
  return text.length > length ? `${safeSlice(text, length)}…` : text;
}

export const searchMentionsTool = defineAiTool({
  name: "search_mentions",
  scope: "mentions:read",
  description:
    "Tìm các đề cập liên quan của project trong kỳ, mới nhất trước, mỗi trang 50. " +
    "Dùng để đọc nội dung cụ thể và trích dẫn (id, url) cho nhận định. Lọc theo chữ, " +
    "cảm xúc, loại bài, đối tượng, khía cạnh, chủ đề, nguồn, tác giả (id lấy từ get_project " +
    "và các tool số liệu).",
  inputSchema: z.object({
    projectId: toolProjectIdSchema,
    period: toolPeriodSchema,
    q: z.string().trim().max(200).optional().describe("Chữ trong nội dung, tên tác giả hoặc tên chủ đề."),
    sentiment: z.enum(SENTIMENTS).optional(),
    kind: z.enum(["post", "comment", "reply"]).optional(),
    entityId: z.uuid().optional(),
    aspectId: z.uuid().optional(),
    topicId: z.uuid().optional(),
    sourceId: z.uuid().optional(),
    authorId: z.uuid().optional(),
    page: z.number().int().min(1).optional(),
  }),
  async run({ projectId, period, ...filters }, ctx) {
    await assertToolProject(ctx, projectId);
    const result = await listMentions({
      ...listMentionsQuerySchema.parse(filters),
      projectId,
      period: resolveToolPeriod(period),
    });
    return {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      items: result.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        publishedAt: item.publishedAt,
        url: item.url,
        source: item.sourceName,
        author: item.authorName,
        text: cut(item.text, AI_TOOLS_CONFIG.mentionTextLength),
        rootText: cut(item.rootText, AI_TOOLS_CONFIG.rootTextLength),
        sentiment: item.sentiment,
        emotion: item.emotion,
        topic: item.topic?.name ?? null,
      })),
    };
  },
});
