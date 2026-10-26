import { z } from "zod";

import { getReport } from "@/lib/reports/services/get-report";

import { toolProjectIdSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";

export const getReportTool = defineAiTool({
  name: "get_report",
  scope: "reports:read",
  description:
    "Một báo cáo AI: tóm tắt, điểm nổi bật và rủi ro kèm đề cập trích dẫn (đoạn trích, link), " +
    "khuyến nghị, và số liệu của kỳ lúc tạo báo cáo. Báo cáo do AI viết, không có người duyệt.",
  inputSchema: z.object({
    projectId: toolProjectIdSchema,
    reportId: z.uuid().describe("Id báo cáo, lấy từ list_reports."),
  }),
  async run({ projectId, reportId }, ctx) {
    await assertToolProject(ctx, projectId);
    const report = await getReport({ projectId, reportId });
    const { metrics } = report;
    // The daily series and channel tables are for charts; the model gets the totals.
    return {
      ...report,
      metrics: {
        period: metrics.period,
        overview: { ...metrics.overview, daily: undefined },
        sentiment: metrics.sentiment,
        topics: metrics.topics,
        caseMetrics: metrics.caseMetrics,
      },
    };
  },
});
