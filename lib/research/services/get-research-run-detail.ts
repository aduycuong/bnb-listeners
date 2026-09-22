import type { WorkspaceContext } from "@/lib/workspaces/types";

import type { GetResearchRunResult } from "../types";
import { getResearchRun } from "./get-research-run";

export type GetResearchRunDetailParams = {
  runId: string;
};

export async function getResearchRunDetail(
  params: GetResearchRunDetailParams,
  ctx: WorkspaceContext,
): Promise<GetResearchRunResult> {
  return getResearchRun({
    workspaceId: ctx.workspaceId,
    runId: params.runId,
  });
}
