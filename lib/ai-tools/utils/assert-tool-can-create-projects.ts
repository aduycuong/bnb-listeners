import { InvalidInputError } from "@/lib/common/service-errors";
import { assertWorkspaceAccess } from "@/lib/workspaces/services/assert-workspace-access";

import type { AiToolContext } from "../types";

/**
 * Creating a project needs a key for every project of the workspace, whose member can still
 * edit the workspace (D27); a key limited to some projects could not read the new one.
 */
export async function assertToolCanCreateProjects(ctx: AiToolContext): Promise<void> {
  if (ctx.projectIds) {
    throw new InvalidInputError("Key chỉ dùng cho một số project không tạo được project mới.");
  }
  try {
    await assertWorkspaceAccess({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      minPermission: "edit",
    });
  } catch {
    throw new InvalidInputError("Người tạo key không còn quyền sửa workspace này.");
  }
}
