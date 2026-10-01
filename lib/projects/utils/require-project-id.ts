import { UnknownServiceError } from "@/lib/common/service-errors";
import type { WorkspaceContext } from "@/lib/workspaces/types";

export function requireProjectId(ctx: WorkspaceContext): string {
  if (!ctx.projectId) {
    throw new UnknownServiceError("Project is required.");
  }

  return ctx.projectId;
}
