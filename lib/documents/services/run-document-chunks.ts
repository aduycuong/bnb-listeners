import { eq } from "drizzle-orm";

import { documentParts } from "@/db/schema";
import { rebuildDocumentChunks } from "@/lib/chunking/services/rebuild-document-chunks";
import type { RebuildDocumentChunksResult } from "@/lib/chunking/types";
import { UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { RunDocumentActionParams } from "../types";
import { getDocument } from "./get-document";

/**
 * Manual "rebuild search index". Rebuilds chunks from the parts that already
 * carry scores — it does not call the LLM. Run "Re-score quality" first when
 * the document has never been scored.
 */
export async function runDocumentChunks(
  params: RunDocumentActionParams,
  ctx: WorkspaceContext,
): Promise<RebuildDocumentChunksResult> {
  await getDocument({ id: params.id }, ctx);

  const [part] = await db
    .select({ id: documentParts.id })
    .from(documentParts)
    .where(eq(documentParts.documentId, params.id))
    .limit(1);

  if (!part) {
    throw new UnknownServiceError(
      "This document has not been scored yet. Run “Re-score quality” before rebuilding the search index.",
    );
  }

  return rebuildDocumentChunks({ documentId: params.id });
}
