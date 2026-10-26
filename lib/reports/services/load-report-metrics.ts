import { eq } from "drizzle-orm";

import { projects } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getBrandCaseMetrics } from "@/lib/metrics/services/get-brand-case-metrics";
import { getChannelMetrics } from "@/lib/metrics/services/get-channel-metrics";
import { getOverviewMetrics } from "@/lib/metrics/services/get-overview-metrics";
import { getProjectCaseMetrics } from "@/lib/metrics/services/get-project-case-metrics";
import { getSentimentMetrics } from "@/lib/metrics/services/get-sentiment-metrics";
import type { ReportPeriod } from "@/lib/metrics/types";
import { parseProjectCase } from "@/lib/projects/project-cases";
import { getTopicReport } from "@/lib/topics/services/get-topic-report";

import { REPORT_CONFIG } from "../config";
import type { ReportMetrics } from "../types";

/** Snapshot of the report numbers (D29): the dashboard services for the period, trimmed. */
export async function loadReportMetrics(params: {
  projectId: string;
  period: ReportPeriod;
}): Promise<ReportMetrics> {
  const [project] = await db
    .select({ name: projects.name, listeningCase: projects.listeningCase })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);
  if (!project) throw new NotFoundError("Project", params.projectId);
  const projectCase = parseProjectCase(project.listeningCase);

  const [overview, sentiment, channels, topics, caseMetrics] = await Promise.all([
    getOverviewMetrics(params),
    getSentimentMetrics(params),
    getChannelMetrics(params),
    getTopicReport(params),
    projectCase === "project"
      ? getProjectCaseMetrics(params)
      : projectCase === "brand"
        ? getBrandCaseMetrics(params)
        : null,
  ]);

  const { period, timezone, ...overviewRest } = overview;
  // Case results carry the period and timezone again; the snapshot keeps them once.
  const caseRest = caseMetrics
    ? Object.fromEntries(
        Object.entries(caseMetrics).filter(([key]) => key !== "period" && key !== "timezone"),
      )
    : null;
  const snapshotCase =
    caseRest && (projectCase === "project" || projectCase === "brand")
      ? ({ case: projectCase, ...caseRest } as ReportMetrics["caseMetrics"])
      : null;

  return {
    projectName: project.name,
    case: projectCase,
    timezone,
    period,
    overview: overviewRest,
    sentiment: { emotions: sentiment.emotions, aspects: sentiment.aspects },
    channels: { channels: channels.channels, sources: channels.sources },
    topics: {
      items: topics.items.slice(0, REPORT_CONFIG.topTopics),
      keywords: topics.keywords.slice(0, REPORT_CONFIG.topKeywords),
    },
    caseMetrics: snapshotCase,
  };
}
