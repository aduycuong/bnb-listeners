import { eq } from "drizzle-orm";

import { systemSchedules, type SystemSchedule } from "@/db/schema";
import { db } from "@/lib/db";

export async function getSystemScheduleByJobName(
  jobName: string,
): Promise<SystemSchedule | null> {
  const [schedule] = await db
    .select()
    .from(systemSchedules)
    .where(eq(systemSchedules.jobName, jobName))
    .limit(1);

  return schedule ?? null;
}

export async function getSystemScheduleById(
  id: string,
): Promise<SystemSchedule | null> {
  const [schedule] = await db
    .select()
    .from(systemSchedules)
    .where(eq(systemSchedules.id, id))
    .limit(1);

  return schedule ?? null;
}
