import type { ReportDataMap, ReportPeriod, ReportPeriodInfo, ReportResult } from "@/lib/metrics/types";
import type { ProjectCase } from "@/lib/projects/project-cases";

import type { REPORT_SNAPSHOT_REPORTS, REPORT_TRIGGERS } from "./config";

export type ReportTrigger = (typeof REPORT_TRIGGERS)[number];

type SnapshotKey = (typeof REPORT_SNAPSHOT_REPORTS)[number]["key"];

/** Numbers a report was written from, frozen at generation (D29). */
export type ReportMetrics = {
  projectName: string;
  case: ProjectCase;
  timezone: string;
  period: ReportPeriodInfo;
  /** Name of the project's subject. */
  subject: string | null;
  /** `REPORT_SNAPSHOT_REPORTS` by key. */
  reports: { [K in SnapshotKey]: ReportResult<ReportDataMap[K]> };
};

/** A sample mention given to the model, cited by its label. */
export type ReportEvidence = {
  /** Label the model cites, `M1`… */
  label: string;
  mentionId: string;
  kind: string;
  text: string;
  rootText: string | null;
  author: string | null;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
  sentiment: string | null;
  engagement: number;
  topic: string | null;
  aspects: string[];
};

export type ReportItem = { title: string; body: string; mentionIds: string[] };

export type ReportSections = {
  summary: string;
  highlights: ReportItem[];
  risks: ReportItem[];
  recommendations: { title: string; body: string }[];
  /** Follow-up questions for the chat widget; reports made before this field have none. */
  suggestedQuestions?: string[];
};

/** A cited mention as it was at generation. */
export type ReportCitation = {
  mentionId: string;
  kind: string;
  text: string;
  author: string | null;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
  sentiment: string | null;
};

export type ReportListItem = {
  id: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  complete: boolean;
  summary: string;
  generatedAt: string;
};

export type ReportDetail = ReportListItem & {
  projectId: string;
  metrics: ReportMetrics;
  sections: ReportSections;
  citations: ReportCitation[];
  warnings: string[];
  model: string;
  costUsd: number;
  trigger: ReportTrigger;
};

export type GenerateReportParams = {
  projectId: string;
  period: ReportPeriod;
  trigger: ReportTrigger;
};

export type ListReportsParams = { projectId: string; limit?: number };

export type GetReportParams = { projectId: string; reportId: string };
