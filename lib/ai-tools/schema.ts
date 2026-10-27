import { z } from "zod";

import { reportPeriodSchema } from "@/lib/metrics/schema";
import { ENTITY_ROLES } from "@/lib/projects/case-templates";

export const toolProjectIdSchema = z
  .uuid()
  .describe("Id của project, lấy từ list_projects.");

export const toolPeriodSchema = reportPeriodSchema
  .optional()
  .describe(
    "Kỳ báo cáo theo timezone của project. rolling: N ngày gần nhất tính cả hôm nay. " +
      "day | week | month | quarter | year: kỳ lịch chứa `date` (YYYY-MM-DD), bỏ trống là kỳ đang chạy; " +
      "tuần từ thứ 2 đến chủ nhật. custom: từ `from` đến `to`, tính cả hai ngày. " +
      "Bỏ trống là 14 ngày gần nhất. Mọi số liệu so với kỳ liền trước cùng độ dài.",
  );

/** Input of the report tools: a project and a period. */
export const projectPeriodInputSchema = z.object({
  projectId: toolProjectIdSchema,
  period: toolPeriodSchema,
});

const toolTermsSchema = z.array(z.string().trim().min(1).max(80)).max(30).optional();

/** An entity to track, as a model writes it: no id, terms optional. */
export const toolEntityInputSchema = z.object({
  role: z
    .enum(ENTITY_ROLES)
    .describe("Vai trò theo case, xem list_case_templates: subject (đúng một), product (dự án của chủ đầu tư, case brand)."),
  name: z.string().trim().min(1).max(120),
  aliases: toolTermsSchema.describe("Tên khác, viết tắt, tên cũ, mã cổ phiếu."),
  ambiguousAliases: toolTermsSchema.describe(
    "Tên dễ nhầm với thứ khác; chỉ khớp khi LLM xác nhận theo ngữ cảnh.",
  ),
  withTerms: toolTermsSchema.describe("Nếu có: bài phải chứa ít nhất một từ này cạnh tên."),
  exclude: toolTermsSchema.describe("Bỏ bài chứa các từ này."),
});

export const toolSourceIdsSchema = z
  .array(z.uuid())
  .min(1)
  .max(100)
  .describe("Id nguồn, lấy từ list_sources.");
