import { and, asc, eq, or } from "drizzle-orm";

import { workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

import type { WorkspacePermission } from "../constants";
import type {
  ListWorkspacesForUserParams,
  ListWorkspacesForUserResult,
} from "../types";

export async function listWorkspacesForUser(
  params: ListWorkspacesForUserParams,
): Promise<ListWorkspacesForUserResult> {
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      ownerUserId: workspaces.ownerUserId,
      memberPermission: workspaceMembers.permission,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaces)
    .leftJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, workspaces.id),
        eq(workspaceMembers.userId, params.userId),
      ),
    )
    .where(
      or(
        eq(workspaces.ownerUserId, params.userId),
        eq(workspaceMembers.userId, params.userId),
      ),
    )
    .orderBy(asc(workspaces.createdAt));

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerUserId: row.ownerUserId,
      permission:
        row.ownerUserId === params.userId
          ? "owner"
          : ((row.memberPermission as WorkspacePermission | null) ?? "read"),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
