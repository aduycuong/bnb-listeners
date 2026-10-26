import { getTopicReport } from "@/lib/topics/services/get-topic-report";

import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { resolveToolPeriod } from "../utils/resolve-tool-period";

export const getTopicsTool = defineAiTool({
  name: "get_topics",
  description:
    "Chủ đề trong kỳ: số đề cập, tăng trưởng so với kỳ trước, tỷ lệ tích cực và tiêu cực " +
    "của từng chủ đề, và từ khóa nổi bật.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return getTopicReport({ projectId, period: resolveToolPeriod(period) });
  },
});
