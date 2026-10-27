import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { loadToolReports } from "../utils/load-tool-reports";

export const getSentimentTool = defineAiTool({
  name: "get_sentiment",
  scope: "reports:read",
  description:
    "Cảm xúc của project trong kỳ: NSS theo ngày, cảm xúc chi tiết (emotion) và tỷ lệ tích " +
    "cực, tiêu cực theo từng khía cạnh.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return loadToolReports(projectId, period, [{ key: "sentiment-trend" }, { key: "emotions" }, { key: "aspect-sentiment" }]);
  },
});
