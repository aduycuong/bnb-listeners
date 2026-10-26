import { z } from "zod";

import { listReports } from "@/lib/reports/services/list-reports";

import { toolProjectIdSchema } from "../schema";
import { assertToolProject } from "../utils/assert-tool-project";
import { defineAiTool } from "../utils/define-ai-tool";

export const listReportsTool = defineAiTool({
  name: "list_reports",
  scope: "reports:read",
  description:
    "Các báo cáo AI đã tạo của project, kỳ mới nhất trước: id, loại kỳ, ngày đầu và cuối, kỳ đã " +
    "kết thúc chưa, tóm tắt. Đọc chi tiết bằng get_report.",
  inputSchema: z.object({
    projectId: toolProjectIdSchema,
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async run({ projectId, limit }, ctx) {
    await assertToolProject(ctx, projectId);
    return listReports({ projectId, limit: limit ?? 20 });
  },
});
