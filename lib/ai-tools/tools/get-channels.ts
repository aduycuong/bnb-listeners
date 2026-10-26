import { getChannelMetrics } from "@/lib/metrics/services/get-channel-metrics";

import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { resolveToolPeriod } from "../utils/resolve-tool-period";

export const getChannelsTool = defineAiTool({
  name: "get_channels",
  scope: "reports:read",
  description:
    "Kênh và nguồn trong kỳ: đề cập và cảm xúc theo kênh, đề cập theo thứ và giờ, các nguồn " +
    "(group, page, kênh) nhiều đề cập nhất.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return getChannelMetrics({ projectId, period: resolveToolPeriod(period) });
  },
});
