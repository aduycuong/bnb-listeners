import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getTermAnalytics } from "@/lib/terms/services/get-term-analytics";
import { resolveTermCardPeriod } from "@/lib/terms/utils/resolve-term-card-period";

import { findTopTermsPeriodSchema } from "../schema";
import { toWorkspaceContext, type SearchMcpContext } from "../types";

const MAX_TERM_IDS = 20;

export function registerGetTermAnalyticsTool(
  mcp: McpServer,
  ctx: SearchMcpContext,
): void {
  mcp.registerTool(
    "get_term_analytics",
    {
      description:
        "Lấy thống kê theo ngày cho một hoặc nhiều term (từ khóa/chủ đề). " +
        "Trả về doc count, quality score và trend score cho từng ngày trong khoảng thời gian, " +
        "kèm tổng hợp cho cả period. " +
        "Dùng term ID từ kết quả find_top_terms hoặc search_knowledge.",
      inputSchema: {
        termIds: z
          .array(z.uuid())
          .min(1)
          .max(MAX_TERM_IDS)
          .describe("Danh sách ID của các term cần xem thống kê"),
        period: findTopTermsPeriodSchema,
      },
    },
    async ({ termIds, period }) => {
      const result = await getTermAnalytics(
        { termIds, period: resolveTermCardPeriod({ preset: period }) },
        toWorkspaceContext(ctx),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
