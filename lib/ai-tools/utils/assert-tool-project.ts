import { NotFoundError } from "@/lib/common/service-errors";
import { assertProjectInWorkspace } from "@/lib/projects/services/assert-project-in-workspace";

import type { AiToolContext } from "../types";

/** The project belongs to the key's workspace and the key may read it. */
export async function assertToolProject(ctx: AiToolContext, projectId: string): Promise<void> {
  if (ctx.projectIds && !ctx.projectIds.includes(projectId)) {
    throw new NotFoundError("project", projectId);
  }
  await assertProjectInWorkspace({ workspaceId: ctx.workspaceId, projectId });
}
