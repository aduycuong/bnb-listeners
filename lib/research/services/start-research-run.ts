import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { StartResearchBody, StartResearchResult } from "../types";
import { startResearch } from "./start-research";

export async function startResearchRun(
  params: StartResearchBody,
  ctx: WorkspaceContext,
): Promise<StartResearchResult> {
  return startResearch({
    ...params,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    waitForResult: false,
  });
}
