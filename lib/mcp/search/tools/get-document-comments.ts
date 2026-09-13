import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { DOCUMENT_COMMENTS_PAGE_SIZE } from "@/lib/retrieval/config";
import { getDocumentComments } from "@/lib/retrieval/services/get-document-comments";

import type { SearchMcpContext } from "../types";
import { normalizeToolParam } from "../utils/normalize-tool-param";

export function registerGetDocumentCommentsTool(
  mcp: McpServer,
  ctx: SearchMcpContext,
): void {
  mcp.registerTool(
    "get_document_comments",
    {
      description:
        "Lấy bình luận của một bài đăng/thảo luận trên mạng xã hội, sắp xếp mới nhất trước. " +
        "Gọi khi kết quả tìm kiếm cho thấy tài liệu có bình luận (vd. '12 comments') " +
        "và cần biết người dùng đã nói gì, hỏi gì, tranh luận hay trả lời thế nào. " +
        "Dùng document ID hiển thị sau 'doc:' trong kết quả tìm kiếm. " +
        `Trả về tối đa ${DOCUMENT_COMMENTS_PAGE_SIZE} bình luận mỗi lần gọi; truyền offset để tải trang cũ hơn. ` +
        "Mỗi bình luận gồm tác giả, ngày, vai trò (answer/debate/info), " +
        "và lập trường (agree/disagree/neutral cho tranh luận).",
      inputSchema: {
        documentId: z
          .uuid()
          .describe("ID tài liệu hiển thị sau 'doc:' trong kết quả tìm kiếm"),
        offset: z
          .number()
          .int()
          .min(0)
          .nullable()
          .describe(
            `Số bình luận bỏ qua để phân trang (kích thước trang ${DOCUMENT_COMMENTS_PAGE_SIZE}). Truyền null để bắt đầu từ đầu.`,
          ),
      },
    },
    async ({ documentId, offset }) => {
      const result = await getDocumentComments({
        workspaceId: ctx.workspaceId,
        documentId,
        offset: normalizeToolParam(offset),
      });

      if (!result.found) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Document not found in this workspace.",
            },
          ],
        };
      }

      if (result.items.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No comments found for this document yet.",
            },
          ],
        };
      }

      const rangeStart = result.offset + 1;
      const rangeEnd = result.offset + result.items.length;
      const header = [
        `Comments ${rangeStart}-${rangeEnd} (newest first)`,
        result.hasMore
          ? `Call again with offset=${result.offset + DOCUMENT_COMMENTS_PAGE_SIZE} for older comments`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const body = result.items
        .map((comment) => {
          const meta = [
            comment.authorName ?? "Anonymous",
            comment.publishedAt
              ? new Date(comment.publishedAt).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })
              : null,
            comment.role,
            comment.stance,
            comment.likeCount > 0 ? `${comment.likeCount} likes` : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return `${meta}\n${comment.content}`;
        })
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `${header}\n\n${body}`,
          },
        ],
      };
    },
  );
}
