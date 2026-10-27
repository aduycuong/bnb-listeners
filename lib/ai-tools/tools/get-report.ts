import { z } from "zod";

import { getReport } from "@/lib/reports/services/get-report";
import { buildReportFacts } from "@/lib/reports/utils/build-report-prompt";

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
    // The numbers as the report's writer got them: totals and changes, not chart series.
    return { ...report, metrics: buildReportFacts(report.metrics) };
  },
});
