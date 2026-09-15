import { eq } from "drizzle-orm";

import { sourceRuns, type DataSource } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { isSourceType } from "@/lib/data-sources/constants";
import { getSourceHandler, parseSourceParams } from "@/lib/data-sources/handlers/registry";

export type ExecuteDataSourceParams = {
  dataSource: DataSource;
  userId?: string;
};

export type ExecuteDataSourceResult = {
  id: string;
  runType: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export async function executeDataSource(
  params: ExecuteDataSourceParams,
): Promise<ExecuteDataSourceResult> {
  const { dataSource, userId } = params;

  if (!isSourceType(dataSource.sourceType)) {
    throw new Error(`No data source handler registered for source type: ${dataSource.sourceType}`);
  }

  const handler = getSourceHandler(dataSource.sourceType);

  const [run] = await db
    .insert(sourceRuns)
    .values({
      dataSourceId: dataSource.id,
      status: "running",
      runType: handler.defaultRunType,
    })
    .returning();

  if (!run) {
    throw new CreateFailedError("source run");
  }

  try {
    const parsedParams = parseSourceParams(dataSource.sourceType, dataSource.params);
    await handler.execute(parsedParams, {
      userId,
      dataSourceId: dataSource.id,
      sourceRunId: run.id,
    });

    if (handler.completesAsynchronously) {
      return {
        id: run.id,
        runType: run.runType,
        status: "running",
        result: run.result ?? null,
        error: null,
        startedAt: run.startedAt,
        finishedAt: null,
      };
    }

    const finishedAt = new Date();
    await db
      .update(sourceRuns)
      .set({
        status: "success",
        finishedAt,
      })
      .where(eq(sourceRuns.id, run.id));

    return {
      id: run.id,
      runType: run.runType,
      status: "success",
      result: run.result ?? null,
      error: null,
      startedAt: run.startedAt,
      finishedAt,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    const finishedAt = new Date();

    await db
      .update(sourceRuns)
      .set({
        status: "failed",
        error: message,
        finishedAt,
      })
      .where(eq(sourceRuns.id, run.id));

    return {
      id: run.id,
      runType: run.runType,
      status: "failed",
      result: run.result ?? null,
      error: message,
      startedAt: run.startedAt,
      finishedAt,
    };
  }
}
