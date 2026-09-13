import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { RETRIEVAL_RETURN_LIMIT } from "@/lib/retrieval/config";
import { searchChunks } from "@/lib/retrieval/services/search-chunks";
import {
  formatRetrievalContext,
  formatSources,
} from "@/lib/retrieval/utils/format-retrieval-context";

import type { SearchMcpContext } from "../types";
import { normalizeToolParam } from "../utils/normalize-tool-param";

export function registerSearchKnowledgeTool(
  mcp: McpServer,
  ctx: SearchMcpContext,
): void {
  mcp.registerTool(
    "search_knowledge",
    {
      description:
        "Tìm kiếm nội dung đã thu thập từ mạng xã hội trong workspace (bài đăng, thảo luận, bình luận đã được lập chỉ mục). " +
        "Đây KHÔNG phải cơ sở tri thức nội bộ hay tài liệu do người dùng tự upload. " +
        "Chỉ dùng khi cần tra cứu những gì người dùng mạng xã hội đã nói/viết về các chủ đề (term) đang được theo dõi — " +
        "ví dụ: phản hồi khách hàng, ý kiến cộng đồng, tranh luận, xu hướng đề cập trên Facebook, TikTok, Reddit, v.v. " +
        "Không dùng cho câu hỏi chung chung không liên quan đến dữ liệu mạng xã hội đã thu thập. " +
        "Hỗ trợ tìm kiếm ngữ nghĩa kết hợp full-text.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Câu truy vấn tìm kiếm bằng ngôn ngữ tự nhiên"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(RETRIEVAL_RETURN_LIMIT * 2)
          .nullable()
          .describe(
            `Số kết quả trả về (mặc định ${RETRIEVAL_RETURN_LIMIT}). Truyền null để dùng mặc định.`,
          ),
        termIds: z
          .array(z.uuid())
          .nullable()
          .describe(
            "Lọc kết quả theo ID của các term (chủ đề) cụ thể. Truyền null để không lọc.",
          ),
      },
    },
    async ({ query, limit, termIds }) => {
      console.log(
        "--------------------------------- search_knowledge ------------------------------",
        { query, limit, termIds },
      );

      const chunks = await searchChunks({
        workspaceId: ctx.workspaceId,
        query,
        limit: normalizeToolParam(limit) ?? RETRIEVAL_RETURN_LIMIT,
        termIds: normalizeToolParam(termIds),
      });

      if (chunks.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No relevant information found for this query.",
            },
          ],
        };
      }

      const context = formatRetrievalContext(chunks);
      const sources = formatSources(chunks);

      const sourcesText = sources
        .map(
          (s) =>
            `[${s.index}] ${s.title} (${s.docType})${s.publishedAt ? ` · ${new Date(s.publishedAt).toLocaleDateString()}` : ""}${s.docType !== DISCUSSION_DOC_TYPE && s.commentCount > 0 ? ` · ${s.commentCount} comments` : ""} · doc:${s.documentId}`,
        )
        .join("\n");

      console.log(
        "--------------------------------- search_knowledge ------------------------------",
        { context, sourcesText },
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${chunks.length} relevant result(s):\n\n${context}\n\n---\nSources:\n${sourcesText}`,
          },
        ],
      };
    },
  );
}
