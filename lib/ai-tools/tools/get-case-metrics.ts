import { InvalidInputError } from "@/lib/common/service-errors";
import { getBrandCaseMetrics } from "@/lib/metrics/services/get-brand-case-metrics";
import { getProjectCaseMetrics } from "@/lib/metrics/services/get-project-case-metrics";
import { getProjectConfig } from "@/lib/projects/services/get-project-config";

import { projectPeriodInputSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";
import { resolveToolPeriod } from "../utils/resolve-tool-period";

export const getCaseMetricsTool = defineAiTool({
  name: "get_case_metrics",
  scope: "reports:read",
  description:
    "Số liệu riêng theo case của project. Case project (Theo dõi dự án): giá rao bán, " +
    "câu hỏi người mua, NSS theo khía cạnh. Case brand (Uy tín chủ đầu tư): " +
    "chỉ số uy tín và các trụ cột, cảm xúc theo dự án, xu hướng chỉ số. " +
    "Case khác chưa có số liệu riêng.",
  inputSchema: projectPeriodInputSchema,
  async run({ projectId, period }, ctx) {
    await assertToolProject(ctx, projectId);
    const config = await getProjectConfig({ workspaceId: ctx.workspaceId, projectId });
    const params = { projectId, period: resolveToolPeriod(period) };
    if (config.case === "project") return { case: config.case, ...(await getProjectCaseMetrics(params)) };
    if (config.case === "brand") return { case: config.case, ...(await getBrandCaseMetrics(params)) };
    throw new InvalidInputError(`Case ${config.case} chưa có số liệu riêng.`);
  },
});
