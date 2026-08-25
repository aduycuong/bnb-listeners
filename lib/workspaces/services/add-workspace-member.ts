import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { users, workspaceMembers, workspaces } from "@/db/schema";
import { APIError } from "@/lib/exposers/api-error";
import { db } from "@/lib/db";

import type {
  AddWorkspaceMemberParams,
  AddWorkspaceMemberResult,
} from "../types";
import { invalidateWorkspacePermissionCache } from "./resolve-workspace-permission";

export async function addWorkspaceMember(
  params: AddWorkspaceMemberParams,
): Promise<AddWorkspaceMemberResult> {
  const [workspace] = await db
    .select({ ownerUserId: workspaces.ownerUserId })
    .from(workspaces)
    .where(eq(workspaces.id, params.workspaceId))
    .limit(1);

  if (!workspace) {
    throw new APIError("ERR_NOT_FOUND", "Workspace not found.", 404);
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, params.email))
    .limit(1);

  if (!user) {
    throw new APIError(
      "ERR_USER_NOT_FOUND",
      "No account found with that email. They need to sign up before they can be added.",
      404,
    );
  }

  const [existingMember] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, params.workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (existingMember) {
    throw new APIError(
      "ERR_ALREADY_MEMBER",
      "This user is already a workspace member.",
      409,
    );
  }

  await db.insert(workspaceMembers).values({
    workspaceId: params.workspaceId,
    userId: user.id,
    permission: params.permission,
    grantedBy: params.grantedByUserId,
  });

  invalidateWorkspacePermissionCache({
    workspaceId: params.workspaceId,
    userId: user.id,
  });

  return {
    userId: user.id,
    message: "Member added.",
  };
}
