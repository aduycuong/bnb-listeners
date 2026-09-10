import { rebuildDocumentChunks } from "@/lib/chunking/services/rebuild-document-chunks";
import type { RebuildDocumentChunksResult } from "@/lib/chunking/types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { RunDocumentActionParams } from "../types";
import { getDocument } from "./get-document";

export async function runDocumentChunks(
  params: RunDocumentActionParams,
  ctx: WorkspaceContext,
): Promise<RebuildDocumentChunksResult> {
  await getDocument({ id: params.id }, ctx);
  return rebuildDocumentChunks({ documentId: params.id });
}
