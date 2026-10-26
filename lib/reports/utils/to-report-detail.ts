import type { AiReport } from "@/db/schema";

import type {
  ReportCitation,
  ReportDetail,
  ReportListItem,
  ReportMetrics,
  ReportSections,
  ReportTrigger,
} from "../types";

export function toReportListItem(row: AiReport): ReportListItem {
  return {
    id: row.id,
    periodType: row.periodType,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    complete: row.complete,
    summary: (row.sections as ReportSections).summary,
    generatedAt: row.generatedAt.toISOString(),
  };
}

export function toReportDetail(row: AiReport): ReportDetail {
  return {
    ...toReportListItem(row),
    projectId: row.projectId,
    metrics: row.metrics as ReportMetrics,
    sections: row.sections as ReportSections,
    citations: row.citations as ReportCitation[],
    warnings: row.warnings,
    model: row.model,
    costUsd: row.costUsd,
    trigger: row.trigger as ReportTrigger,
  };
}
