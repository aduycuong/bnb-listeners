import "server-only";

import { and, count, eq } from "drizzle-orm";

import { workspaceMembers, workspaces } from "@/db/schema";
import { APIError } from "@/lib/exposers/api-error";
import { db } from "@/lib/db";

import type {
  RemoveWorkspaceMemberParams,
  RemoveWorkspaceMemberResult,
} from "../types";
import { invalidateWorkspacePermissionCache } from "./resolve-workspace-permission";

export async function removeWorkspaceMember(
  params: RemoveWorkspaceMemberParams,
): Promise<RemoveWorkspaceMemberResult> {
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, params.workspaceId))
    .limit(1);

  if (!workspace) {
    throw new APIError("ERR_NOT_FOUND", "Workspace not found.", 404);
  }

  const [member] = await db
    .select({ permission: workspaceMembers.permission })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, params.workspaceId),
        eq(workspaceMembers.userId, params.userId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new APIError("ERR_NOT_FOUND", "Member not found.", 404);
  }

  if (member.permission === "owner") {
    const [{ ownerCount }] = await db
      .select({ ownerCount: count() })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, params.workspaceId),
          eq(workspaceMembers.permission, "owner"),
        ),
      );

    if (ownerCount <= 1) {
      throw new APIError(
        "ERR_CANNOT_REMOVE_LAST_OWNER",
        "The last owner cannot be removed.",
        403,
      );
    }
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, params.workspaceId),
        eq(workspaceMembers.userId, params.userId),
      ),
    );

  invalidateWorkspacePermissionCache({
    workspaceId: params.workspaceId,
    userId: params.userId,
  });

  return {
    message: "Member removed.",
  };
}
