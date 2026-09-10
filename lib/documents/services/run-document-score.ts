import { scoreDocument } from "@/lib/scoring/services/score-document";
import type { ScoreDocumentResult } from "@/lib/scoring/types";
import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { RunDocumentActionParams } from "../types";
import { getDocument } from "./get-document";

export async function runDocumentScore(
  params: RunDocumentActionParams,
  ctx: WorkspaceContext,
): Promise<ScoreDocumentResult> {
  await getDocument({ id: params.id }, ctx);
  return scoreDocument({ documentId: params.id });
}
