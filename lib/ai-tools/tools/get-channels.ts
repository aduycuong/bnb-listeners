import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { loadToolReports } from "../utils/load-tool-reports";

export const getChannelsTool = defineAiTool({
  name: "get_channels",
  scope: "reports:read",
  description:
    "Kênh và nguồn trong kỳ: đề cập và cảm xúc theo kênh, đề cập theo thứ và giờ, các nguồn " +
    "(group, page, kênh) nhiều đề cập nhất.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return loadToolReports(projectId, period, [
      { key: "channel-breakdown" },
      { key: "posting-heatmap" },
      { key: "source-ranking" },
    ]);
  },
});
