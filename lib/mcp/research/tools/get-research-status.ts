import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getResearchRun } from "@/lib/research/services/get-research-run";
import { formatSourcesText } from "@/lib/research/utils/format-sources-text";

import type { ResearchMcpContext } from "../types";

export function registerGetResearchStatusTool(
  mcp: McpServer,
  ctx: ResearchMcpContext,
): void {
  mcp.registerTool(
    "get_research_status",
    {
      description:
        "Kiểm tra trạng thái một phiên nghiên cứu đã tạo bằng start_research. " +
        "Khi hoàn tất, trả về báo cáo Markdown kèm danh sách nguồn trích dẫn. " +
        "Dùng jobId nhận được từ start_research.",
      inputSchema: {
        jobId: z
          .uuid()
          .describe("jobId trả về từ start_research."),
      },
    },
    async ({ jobId }) => {
      const run = await getResearchRun({
        workspaceId: ctx.workspaceId,
        runId: jobId,
      });

      if (!run.found) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Không tìm thấy phiên nghiên cứu này trong workspace.",
            },
          ],
        };
      }

      if (run.status === "pending" || run.status === "running") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Nghiên cứu đang chạy (trạng thái: ${run.status}). Hãy thử lại sau ít giây.`,
            },
          ],
        };
      }

      if (run.status === "failed") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Nghiên cứu thất bại: ${run.error ?? "unknown error"}`,
            },
          ],
        };
      }

      if (!run.result) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Nghiên cứu đã hoàn tất nhưng không có kết quả.",
            },
          ],
        };
      }

      const sourcesText =
        run.result.sources.length > 0
          ? `\n\n---\nSources:\n${formatSourcesText(run.result.sources)}`
          : "";

      return {
        content: [
          {
            type: "text" as const,
            text: `${run.result.report}${sourcesText}`,
          },
        ],
      };
    },
  );
}
