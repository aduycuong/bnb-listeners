import { asc } from "drizzle-orm";

import { systemSchedules } from "@/db/schema";
import { db } from "@/lib/db";

import type { ListSystemSchedulesResult } from "../types";

function toIsoTimestamp(value: Date): string {
  return value.toISOString();
}

export async function listSystemSchedules(): Promise<ListSystemSchedulesResult> {
  const rows = await db
    .select({
      id: systemSchedules.id,
      scheduleId: systemSchedules.scheduleId,
      jobName: systemSchedules.jobName,
      cronConfig: systemSchedules.cronConfig,
      description: systemSchedules.description,
      enabled: systemSchedules.enabled,
      createdAt: systemSchedules.createdAt,
      updatedAt: systemSchedules.updatedAt,
    })
    .from(systemSchedules)
    .orderBy(asc(systemSchedules.scheduleId));

  return {
    items: rows.map((row) => ({
      id: row.id,
      scheduleId: row.scheduleId,
      jobName: row.jobName,
      cronConfig: row.cronConfig,
      description: row.description,
      enabled: row.enabled,
      createdAt: toIsoTimestamp(row.createdAt),
      updatedAt: toIsoTimestamp(row.updatedAt),
    })),
  };
}
