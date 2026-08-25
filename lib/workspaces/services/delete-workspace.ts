import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { APIError } from "@/lib/exposers/api-error";
import { db } from "@/lib/db";

import type { DeleteWorkspaceParams, DeleteWorkspaceResult } from "../types";
import { listWorkspacesForUser } from "./list-workspaces-for-user";

export async function deleteWorkspace(
  params: DeleteWorkspaceParams,
): Promise<DeleteWorkspaceResult> {
  const { items } = await listWorkspacesForUser({
    userId: params.userId,
  });

  if (items.length <= 1) {
    throw new APIError(
      "ERR_LAST_WORKSPACE",
      "You cannot delete your only workspace.",
      400,
    );
  }

  const target = items.find((workspace) => workspace.id === params.workspaceId);
  if (!target) {
    throw new APIError("ERR_NOT_FOUND", "Workspace not found.", 404);
  }

  if (target.permission !== "owner") {
    throw new APIError(
      "ERR_FORBIDDEN",
      "Only workspace owners can delete a workspace.",
      403,
    );
  }

  const deleted = await db
    .delete(workspaces)
    .where(eq(workspaces.id, params.workspaceId))
    .returning({ id: workspaces.id });

  if (deleted.length === 0) {
    throw new APIError("ERR_NOT_FOUND", "Workspace not found.", 404);
  }

  return { message: "Workspace deleted." };
}
