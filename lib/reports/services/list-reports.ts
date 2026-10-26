import { desc, eq } from "drizzle-orm";

import { aiReports } from "@/db/schema";
import { db } from "@/lib/db";

import type { ListReportsParams, ReportListItem } from "../types";
import { toReportListItem } from "../utils/to-report-detail";

const DEFAULT_LIMIT = 50;

/** Reports of a project, newest period first (D29). */
export async function listReports(params: ListReportsParams): Promise<{ items: ReportListItem[] }> {
  const rows = await db
    .select()
    .from(aiReports)
    .where(eq(aiReports.projectId, params.projectId))
    .orderBy(desc(aiReports.periodStart), desc(aiReports.generatedAt))
    .limit(params.limit ?? DEFAULT_LIMIT);
  return { items: rows.map(toReportListItem) };
}
