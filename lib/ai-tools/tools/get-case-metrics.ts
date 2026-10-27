import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { loadToolReports } from "../utils/load-tool-reports";

export const getCaseMetricsTool = defineAiTool({
  name: "get_case_metrics",
  scope: "reports:read",
  description:
    "Số liệu riêng theo case của project. Theo dõi dự án: giá rao bán theo ngày và phân bố " +
    "giá, câu hỏi người mua. Uy tín chủ đầu tư: chỉ số uy tín và các trụ cột, xu hướng chỉ " +
    "số, cảm xúc theo từng dự án của chủ đầu tư. Số liệu project không có trả `unavailable`.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return loadToolReports(projectId, period, [
      { key: "price-trend" },
      { key: "price-distribution" },
      { key: "buyer-questions" },
      { key: "reputation-index" },
      { key: "reputation-trend" },
      { key: "product-sentiment" },
    ]);
  },
});
