import { and, eq } from "drizzle-orm";

import { documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetDocumentParams, GetDocumentResult } from "../types";

export async function getDocument(
  params: GetDocumentParams,
  ctx: WorkspaceContext,
): Promise<GetDocumentResult> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, params.id),
        eq(documents.workspaceId, ctx.workspaceId),
      ),
    )
    .limit(1);

  if (!doc) {
    throw new NotFoundError("document", params.id);
  }

  return doc;
}
