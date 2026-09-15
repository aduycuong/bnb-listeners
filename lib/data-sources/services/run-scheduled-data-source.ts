import { eq } from "drizzle-orm";
import { z } from "zod";

import { dataSources } from "@/db/schema";
import { db } from "@/lib/db";
import { buildQstashCron } from "@/lib/qstash/utils/build-qstash-cron";
import type { QstashJobHandlerContext } from "@/lib/qstash/job-config";

import { executeDataSource } from "./execute-data-source";

const runScheduledDataSourcePayloadSchema = z.object({
  dataSourceId: z.uuid(),
});

export async function runScheduledDataSource(
  payload: unknown,
  context: QstashJobHandlerContext,
): Promise<void> {
  const { dataSourceId } = runScheduledDataSourcePayloadSchema.parse(payload);

  const [dataSource] = await db.select().from(dataSources).where(eq(dataSources.id, dataSourceId)).limit(1);

  if (!dataSource || !dataSource.enabled) {
    return;
  }

  const qstashCron = buildQstashCron(dataSource.cronConfig);
  if (!qstashCron) {
    return;
  }

  const result = await executeDataSource({ dataSource, userId: context.userId });

  if (result.status === "failed") {
    throw new Error(result.error ?? "Job failed");
  }
}
