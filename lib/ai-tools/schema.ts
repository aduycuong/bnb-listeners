import { z } from "zod";

import { reportPeriodSchema } from "@/lib/metrics/schema";

export const toolProjectIdSchema = z
  .uuid()
  .describe("Id của project, lấy từ list_projects.");

export const toolPeriodSchema = reportPeriodSchema
  .optional()
  .describe(
    "Kỳ báo cáo theo timezone của project. rolling: N ngày gần nhất tính cả hôm nay. " +
      "week | month | quarter | year: kỳ lịch chứa `date` (YYYY-MM-DD), bỏ trống là kỳ đang chạy; " +
      "tuần từ thứ 2 đến chủ nhật. custom: từ `from` đến `to`, tính cả hai ngày. " +
      "Bỏ trống là 14 ngày gần nhất. Mọi số liệu so với kỳ liền trước cùng độ dài.",
  );

/** Input of the report tools: a project and a period. */
export const projectPeriodInputSchema = z.object({
  projectId: toolProjectIdSchema,
  period: toolPeriodSchema,
});
