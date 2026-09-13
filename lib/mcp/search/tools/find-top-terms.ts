import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { findTopTerms } from "@/lib/terms/services/find-top-terms";
import { resolveTermCardPeriod } from "@/lib/terms/utils/resolve-term-card-period";

import { findTopTermsPeriodSchema } from "../schema";
import { toWorkspaceContext, type SearchMcpContext } from "../types";

function formatTopTermsResult(
  result: Awaited<ReturnType<typeof findTopTerms>>,
): string {
  const headerLines = [
    `Mode: ${result.resolvedMode === "term_group" ? "term group" : "keyword search"}`,
    result.termGroup ? `Term group: ${result.termGroup.name} (${result.termGroup.id})` : null,
    result.searchKeyword
      ? `Search keyword: ${result.searchKeyword}`
      : "Search keyword: (all terms)",
    `Period: ${result.period.preset} (${result.period.startDate} → ${result.period.endDate})`,
  ].filter(Boolean);

  if (result.items.length === 0) {
    return `${headerLines.join("\n")}\n\nNo matching terms found.`;
  }

  const body = result.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} · ${item.docCount} docs · id:${item.id}` +
        (item.description?.trim() ? `\n   ${item.description.trim()}` : ""),
    )
    .join("\n\n");

  return `${headerLines.join("\n")}\n\nTop ${result.items.length} terms:\n\n${body}`;
}

export function registerFindTopTermsTool(
  mcp: McpServer,
  ctx: SearchMcpContext,
): void {
  mcp.registerTool(
    "find_top_terms",
    {
      description:
        "Tìm top 10 terms (từ khóa/chủ đề đang theo dõi) trong workspace.",
      inputSchema: {
        query: z
          .string()
          .describe(
            "Chuỗi tìm kiếm tự nhiên để lọc terms" +
              "(ví dụ: 'giá cả', 'dự án'). " +
              'Để trống ("") để bao gồm tất cả terms.',
          ),
        period: findTopTermsPeriodSchema,
      },
    },
    async ({ query, period }) => {
      const result = await findTopTerms(
        { query, period: resolveTermCardPeriod({ preset: period }) },
        toWorkspaceContext(ctx),
      );

      return {
        content: [
          {
            type: "text" as const,
            text: formatTopTermsResult(result),
          },
        ],
      };
    },
  );
}
