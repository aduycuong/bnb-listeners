import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getTermDetailSummary } from "@/lib/terms/services/get-term-detail-summary";

import { findTopTermsPeriodSchema } from "../schema";
import { toWorkspaceContext, type SearchMcpContext } from "../types";

function formatTermDetailResult(
  result: Awaited<ReturnType<typeof getTermDetailSummary>>,
): string {
  const { term, digest, chart } = result;

  const groupsText =
    term.groups.length > 0
      ? term.groups.map((group) => group.name).join(", ")
      : "None";

  const chartLines = chart.points
    .map((point) => `${point.label}: ${point.value ?? 0}`)
    .join("\n");

  return [
    term.name,
    term.description?.trim() ? term.description.trim() : null,
    `Term ID: ${term.id}`,
    `Groups: ${groupsText}`,
    `Listening since: ${new Date(term.listeningStartedAt).toLocaleDateString()}`,
    "",
    `Period: ${chart.period.preset} (${chart.period.startDate} → ${chart.period.endDate})`,
    `Document count: ${digest.docCount}`,
    digest.avgQualityScore != null
      ? `Avg quality score: ${digest.avgQualityScore.toFixed(2)}`
      : null,
    digest.trendScore != null ? `Trend score: ${digest.trendScore.toFixed(2)}` : null,
    digest.isStale ? "Status: stale digest" : null,
    "",
    "Document count by period:",
    chartLines,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function registerGetTermDetailTool(
  mcp: McpServer,
  ctx: SearchMcpContext,
): void {
  mcp.registerTool(
    "get_term_detail",
    {
      description:
        "Xem chi tiết và thống kê của một term (từ khóa/chủ đề) cụ thể. " +
        "Trả về mô tả, nhóm term, doc count, quality/trend score và biểu đồ doc count theo thời gian. " +
        "Dùng term ID từ kết quả find_top_terms hoặc search_knowledge.",
      inputSchema: {
        termId: z.uuid().describe("ID của term cần xem chi tiết"),
        period: findTopTermsPeriodSchema,
      },
    },
    async ({ termId, period }) => {
      const result = await getTermDetailSummary(
        { id: termId, period },
        toWorkspaceContext(ctx),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: formatTermDetailResult(result),
          },
        ],
      };
    },
  );
}
