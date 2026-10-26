import { asc } from "drizzle-orm";

import { projects } from "@/db/schema";
import { db } from "@/lib/db";

import { METRICS_CONFIG } from "../config";
import { refreshProjectMetricsDaily } from "./refresh-project-metrics-daily";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Nightly job (D28): rewrites the last `dailyRefreshDays` days of L4 for every project, for
 * the comments and engagement that arrive after a day has passed.
 */
export async function refreshRecentMetricsDaily(): Promise<{ projects: number; metricRows: number }> {
  const rows = await db.select({ id: projects.id }).from(projects).orderBy(asc(projects.createdAt));
  const from = new Date(Date.now() - (METRICS_CONFIG.dailyRefreshDays - 1) * DAY_MS);
  let metricRows = 0;
  for (const { id } of rows) {
    const result = await refreshProjectMetricsDaily({ projectId: id, from });
    metricRows += result.metricRows;
  }
  return { projects: rows.length, metricRows };
}
