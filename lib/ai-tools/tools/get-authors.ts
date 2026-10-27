import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { loadToolReports } from "../utils/load-tool-reports";

export const getAuthorsTool = defineAiTool({
  name: "get_authors",
  scope: "reports:read",
  description:
    "Tác giả trong kỳ: tác giả có tổng tương tác cao nhất (số đề cập, cảm xúc chính, người " +
    "theo dõi) và số tác giả theo nhóm KOL.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return loadToolReports(projectId, period, [{ key: "top-authors" }, { key: "author-tiers" }]);
  },
});
