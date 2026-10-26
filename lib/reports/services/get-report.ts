import { and, eq } from "drizzle-orm";

import { aiReports } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { GetReportParams, ReportDetail } from "../types";
import { toReportDetail } from "../utils/to-report-detail";

export async function getReport(params: GetReportParams): Promise<ReportDetail> {
  const [row] = await db
    .select()
    .from(aiReports)
    .where(and(eq(aiReports.id, params.reportId), eq(aiReports.projectId, params.projectId)))
    .limit(1);
  if (!row) throw new NotFoundError("report", params.reportId);
  return toReportDetail(row);
}
