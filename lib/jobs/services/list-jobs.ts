import { and, desc, eq } from "drizzle-orm";

import { jobs } from "@/db/schema";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { ListJobsParams, ListJobsResult } from "../types";

export async function listJobs(
  params: ListJobsParams,
  ctx: WorkspaceContext,
): Promise<ListJobsResult> {
  const conditions = [eq(jobs.workspaceId, ctx.workspaceId)];

  if (params.jobType) {
    conditions.push(eq(jobs.jobType, params.jobType));
  }

  const rows = await db
    .select({
      id: jobs.id,
      name: jobs.name,
      jobType: jobs.jobType,
      enabled: jobs.enabled,
      cronConfig: jobs.cronConfig,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt));

  return {
    items: rows.map((row) => ({
      ...row,
      cronConfig: row.cronConfig ?? { cron: "", timezone: "UTC" },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
