import { and, asc, eq, or } from "drizzle-orm";

import { workspaceMembers, workspaces } from "@/db/schema";
import { db } from "@/lib/db";

import type { WorkspacePermission } from "../constants";
import { parseTopicLanguage } from "../utils/parse-topic-language";
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
      dataCollectionScope: workspaces.dataCollectionScope,
      autoCreateTopics: workspaces.autoCreateTopics,
      topicLanguage: workspaces.topicLanguage,
      topicCriteria: workspaces.topicCriteria,
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
      dataCollectionScope: row.dataCollectionScope,
      autoCreateTopics: row.autoCreateTopics,
      topicLanguage: parseTopicLanguage(row.topicLanguage),
      topicCriteria: row.topicCriteria,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}
