import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { startResearch } from "@/lib/research/services/start-research";
import { formatSourcesText } from "@/lib/research/utils/format-sources-text";

import type { ResearchMcpContext } from "../types";

export function registerStartResearchTool(
  mcp: McpServer,
  ctx: ResearchMcpContext,
): void {
  mcp.registerTool(
    "start_research",
    {
      description:
        "Bắt đầu một phiên nghiên cứu sâu (deep research) trên dữ liệu mạng xã hội đã thu thập của workspace, " +
        "kèm tra cứu web bổ sung khi cần. Quy trình tự động: lập kế hoạch → tìm kiếm → đánh giá → tìm thêm → tổng hợp báo cáo có trích dẫn. " +
        "Chạy nền và trả về jobId; dùng get_research_status để lấy kết quả. " +
        "Nếu chủ đề không liên quan đến phạm vi thu thập dữ liệu của workspace, tool từ chối ngay và không tạo phiên nghiên cứu. " +
        "Nếu yêu cầu chưa đủ rõ, tool có thể trả về danh sách câu hỏi làm rõ — hãy trả lời rồi gọi lại kèm 'clarifications' (và gửi lại 'query'+'context' như cũ).",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe(
            "Mục tiêu/câu hỏi nghiên cứu cốt lõi bằng ngôn ngữ tự nhiên: bạn muốn tìm hiểu điều gì và mục đích cuối.",
          ),
        context: z
          .string()
          .nullable()
          .describe(
            "Bối cảnh nền định hình nghiên cứu: điều đã biết, mục đích, phạm vi quan tâm, ràng buộc, " +
              "đối tượng đọc, định dạng/độ chi tiết mong muốn, hoặc phát hiện trước đó. Truyền null nếu không có.",
          ),
        clarifications: z
          .array(
            z.object({
              question: z.string(),
              answer: z.string(),
            }),
          )
          .nullable()
          .describe(
            "Trả lời cho các câu hỏi làm rõ ở lần gọi trước (được coi là bối cảnh bổ sung). Truyền null ở lần gọi đầu.",
          ),
        clarificationMode: z
          .enum(["ask", "assume", "off"])
          .nullable()
          .describe(
            "ask = hỏi lại khi mơ hồ; assume = tự chạy kèm giả định; off = không hỏi. Truyền null để dùng mặc định (ask).",
          ),
        depth: z
          .enum(["quick", "standard", "deep"])
          .nullable()
          .describe(
            "Mức độ đào sâu: quick = nhanh một vòng; standard = cân bằng; deep = nhiều vòng, phủ rộng. Truyền null để dùng mặc định (standard).",
          ),
      },
    },
    async ({ query, context, clarifications, clarificationMode, depth }) => {
      const result = await startResearch({
        workspaceId: ctx.workspaceId,
        query,
        context: context ?? undefined,
        clarifications: clarifications ?? undefined,
        clarificationMode: clarificationMode ?? undefined,
        depth: depth ?? undefined,
      });

      if (result.status === "out_of_scope") {
        return {
          content: [
            {
              type: "text" as const,
              text:
                "Không thực hiện nghiên cứu: chủ đề không liên quan đến phạm vi thu thập dữ liệu của workspace này.\n" +
                `Lý do: ${result.reason}`,
            },
          ],
        };
      }

      if (result.status === "needs_clarification") {
        const questions = result.questions
          .map((question, index) => `${index + 1}. ${question}`)
          .join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text:
                "Cần làm rõ trước khi nghiên cứu. Hãy trả lời các câu hỏi sau rồi gọi lại start_research " +
                "với cùng 'query'/'context' và thêm 'clarifications':\n\n" +
                questions,
            },
          ],
        };
      }

      if (result.status === "completed") {
        const sourcesText =
          result.sources.length > 0
            ? `\n\n---\nSources:\n${formatSourcesText(result.sources)}`
            : "";

        return {
          content: [
            {
              type: "text" as const,
              text: `${result.report}${sourcesText}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text:
              `Đã bắt đầu nghiên cứu. jobId: ${result.jobId}\n` +
              "Gọi get_research_status với jobId này để theo dõi tiến trình và lấy báo cáo khi hoàn tất.",
          },
        ],
      };
    },
  );
}
