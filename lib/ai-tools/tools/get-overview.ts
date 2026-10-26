import { getOverviewMetrics } from "@/lib/metrics/services/get-overview-metrics";

import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { resolveToolPeriod } from "../utils/resolve-tool-period";

export const getOverviewTool = defineAiTool({
  name: "get_overview",
  scope: "reports:read",
  description:
    "Tổng quan của project trong kỳ: lượt đề cập, tương tác, số tác giả, NSS, tỷ lệ tiêu " +
    "cực, Share of Voice (so với kỳ trước), đề cập theo ngày và cảm xúc, nguồn và chủ đề " +
    "nhiều đề cập nhất. Chỉ đếm đề cập về bên mình.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    return getOverviewMetrics({ projectId, period: resolveToolPeriod(period) });
  },
});
