import { and, eq } from "drizzle-orm";

import { documents, jobs } from "@/db/schema";
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
      jobId: jobs.id,
      jobName: jobs.name,
      jobType: jobs.jobType,
    })
    .from(documents)
    .innerJoin(jobs, eq(documents.jobId, jobs.id))
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
    jobId: row.jobId,
    jobName: row.jobName,
    jobType: row.jobType,
  };
}
