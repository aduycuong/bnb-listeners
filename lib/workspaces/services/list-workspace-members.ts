import "server-only";

import { asc, eq } from "drizzle-orm";

import { users, workspaceMembers } from "@/db/schema";
import { db } from "@/lib/db";

import type {
  ListWorkspaceMembersParams,
  ListWorkspaceMembersResult,
} from "../types";

export async function listWorkspaceMembers(
  params: ListWorkspaceMembersParams,
): Promise<ListWorkspaceMembersResult> {
  const rows = await db
    .select({
      userId: workspaceMembers.userId,
      permission: workspaceMembers.permission,
      createdAt: workspaceMembers.createdAt,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, params.workspaceId))
    .orderBy(asc(users.email));

  return {
    items: rows.map((row) => ({
      userId: row.userId,
      email: row.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      permission: row.permission as ListWorkspaceMembersResult["items"][number]["permission"],
      isOwner: row.permission === "owner",
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
