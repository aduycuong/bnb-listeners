import { count, eq } from "drizzle-orm";

import { collectRuns, contentItems, sources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { AdminCollectRunDetail } from "../types";
import { collectRunRowColumns, toCollectRunRow } from "../utils/collect-run-row";

type GetAdminCollectRunParams = {
  id: string;
};

export async function getAdminCollectRun(
  params: GetAdminCollectRunParams,
): Promise<AdminCollectRunDetail> {
  const [[row], [items]] = await Promise.all([
    db
      .select({
        ...collectRunRowColumns,
        params: collectRuns.params,
        workflowRunId: collectRuns.workflowRunId,
        externalJobId: collectRuns.externalJobId,
      })
      .from(collectRuns)
      .leftJoin(sources, eq(sources.id, collectRuns.sourceId))
      .where(eq(collectRuns.id, params.id))
      .limit(1),
    db
      .select({ value: count() })
      .from(contentItems)
      .where(eq(contentItems.collectRunId, params.id)),
  ]);

  if (!row) {
    throw new NotFoundError("collect run", params.id);
  }

  return {
    ...toCollectRunRow(row),
    params: row.params,
    workflowRunId: row.workflowRunId,
    externalJobId: row.externalJobId,
    payloadKey: row.payloadKey,
    contentItems: items?.value ?? 0,
  };
}
