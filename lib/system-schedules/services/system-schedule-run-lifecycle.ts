import { eq } from "drizzle-orm";

import { systemScheduleRuns } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import {
  SYSTEM_SCHEDULE_RUN_STATUS,
  type SystemScheduleRunTrigger,
} from "../constants";

export type CreateSystemScheduleRunParams = {
  systemScheduleId: string;
  trigger: SystemScheduleRunTrigger;
  qstashMessageId?: string;
  workspaceId?: string;
};

export type CreateSystemScheduleRunResult = {
  id: string;
  startedAt: Date;
};

export async function createSystemScheduleRun(
  params: CreateSystemScheduleRunParams,
): Promise<CreateSystemScheduleRunResult> {
  const [run] = await db
    .insert(systemScheduleRuns)
    .values({
      systemScheduleId: params.systemScheduleId,
      status: SYSTEM_SCHEDULE_RUN_STATUS.running,
      trigger: params.trigger,
      qstashMessageId: params.qstashMessageId ?? null,
      workspaceId: params.workspaceId ?? null,
    })
    .returning({
      id: systemScheduleRuns.id,
      startedAt: systemScheduleRuns.startedAt,
    });

  if (!run) {
    throw new CreateFailedError("system schedule run");
  }

  return run;
}

export type FinalizeSystemScheduleRunParams = {
  runId: string;
  status: typeof SYSTEM_SCHEDULE_RUN_STATUS.success | typeof SYSTEM_SCHEDULE_RUN_STATUS.failed;
  result?: Record<string, unknown>;
  error?: string;
};

export async function finalizeSystemScheduleRun(
  params: FinalizeSystemScheduleRunParams,
): Promise<void> {
  await db
    .update(systemScheduleRuns)
    .set({
      status: params.status,
      result: params.result ?? null,
      error: params.error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(systemScheduleRuns.id, params.runId));
}
