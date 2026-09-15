import { and, eq } from "drizzle-orm";

import { dataSources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { deleteSchedule } from "@/lib/qstash/services/delete-schedule-service";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { DeleteDataSourceParams, DeleteDataSourceResult } from "../types";
import { getDataSourceScheduleId } from "../utils/get-data-source-schedule-id";

export async function deleteDataSource(
  params: DeleteDataSourceParams,
  ctx: WorkspaceContext,
): Promise<DeleteDataSourceResult> {
  const [dataSource] = await db
    .delete(dataSources)
    .where(
      and(eq(dataSources.id, params.id), eq(dataSources.workspaceId, ctx.workspaceId)),
    )
    .returning({ id: dataSources.id });

  if (!dataSource) {
    throw new NotFoundError("data source", params.id);
  }

  await deleteSchedule({ scheduleId: getDataSourceScheduleId(params.id) });

  return {
    id: dataSource.id,
    message: "Job deleted.",
  };
}
