import { and, eq } from "drizzle-orm";

import { documents, dataSources } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetDocumentParams, GetDocumentResult } from "../types";

export async function getDocument(
  params: GetDocumentParams,
  ctx: WorkspaceContext,
): Promise<GetDocumentResult> {
  const [row] = await db
    .select({
      document: documents,
      dataSourceId: dataSources.id,
      dataSourceName: dataSources.name,
      sourceType: dataSources.sourceType,
    })
    .from(documents)
    .innerJoin(dataSources, eq(documents.dataSourceId, dataSources.id))
    .where(
      and(
        eq(documents.id, params.id),
        eq(documents.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("document", params.id);
  }

  return {
    ...row.document,
    dataSourceId: row.dataSourceId,
    dataSourceName: row.dataSourceName,
    sourceType: row.sourceType,
  };
}
