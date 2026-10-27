import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { loadToolReports } from "../utils/load-tool-reports";

export const getOverviewTool = defineAiTool({
  name: "get_overview",
  scope: "reports:read",
  description:
    "Tổng quan của project trong kỳ: lượt đề cập, tương tác, số tác giả, NSS, tỷ lệ tiêu " +
    "cực (so với kỳ trước), đề cập theo ngày và cảm xúc, nguồn và chủ đề nhiều đề cập nhất. " +
    "Chỉ đếm đề cập về đối tượng project theo dõi.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return loadToolReports(projectId, period, [
      { key: "kpis" },
      { key: "sentiment-breakdown" },
      { key: "sentiment-trend" },
      { key: "source-ranking", params: { limit: 6 } },
      { key: "topics", params: { limit: 6 } },
    ]);
  },
});
