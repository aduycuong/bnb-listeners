import { desc, eq } from "drizzle-orm";

import { systemScheduleRuns } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  SystemScheduleRunStatus,
  SystemScheduleRunTrigger,
} from "../constants";
import type {
  ListSystemScheduleRunsParams,
  ListSystemScheduleRunsResult,
  SystemScheduleRunListItem,
} from "../types";
import { getSystemScheduleById } from "./get-system-schedule";

const DEFAULT_LIMIT = 30;

function toRunListItem(row: {
  id: string;
  systemScheduleId: string;
  workspaceId: string | null;
  status: string;
  trigger: string;
  result: Record<string, unknown> | null;
  error: string | null;
  qstashMessageId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}): SystemScheduleRunListItem {
  return {
    id: row.id,
    systemScheduleId: row.systemScheduleId,
    workspaceId: row.workspaceId,
    status: row.status as SystemScheduleRunStatus,
    trigger: row.trigger as SystemScheduleRunTrigger,
    result: row.result,
    error: row.error,
    qstashMessageId: row.qstashMessageId,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

export async function listSystemScheduleRuns(
  params: ListSystemScheduleRunsParams,
): Promise<ListSystemScheduleRunsResult> {
  const schedule = await getSystemScheduleById(params.systemScheduleId);
  if (!schedule) {
    throw new NotFoundError("system schedule", params.systemScheduleId);
  }

  const limit = params.limit ?? DEFAULT_LIMIT;

  const rows = await db
    .select({
      id: systemScheduleRuns.id,
      systemScheduleId: systemScheduleRuns.systemScheduleId,
      workspaceId: systemScheduleRuns.workspaceId,
      status: systemScheduleRuns.status,
      trigger: systemScheduleRuns.trigger,
      result: systemScheduleRuns.result,
      error: systemScheduleRuns.error,
      qstashMessageId: systemScheduleRuns.qstashMessageId,
      startedAt: systemScheduleRuns.startedAt,
      finishedAt: systemScheduleRuns.finishedAt,
    })
    .from(systemScheduleRuns)
    .where(eq(systemScheduleRuns.systemScheduleId, params.systemScheduleId))
    .orderBy(desc(systemScheduleRuns.startedAt))
    .limit(limit);

  return {
    items: rows.map((row) =>
      toRunListItem({
        ...row,
        result: row.result ?? null,
      }),
    ),
  };
}
