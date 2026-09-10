import { classifyDocument } from "@/lib/classification/services/classify-document";
import type { ClassifyDocumentResult } from "@/lib/classification/types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { RunDocumentActionParams } from "../types";
import { getDocument } from "./get-document";

export async function runDocumentClassify(
  params: RunDocumentActionParams,
  ctx: WorkspaceContext,
): Promise<ClassifyDocumentResult> {
  await getDocument({ id: params.id }, ctx);
  return classifyDocument({ documentId: params.id });
}
