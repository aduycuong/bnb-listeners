import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, workspaceApiKeys } from "@/db/schema";

import type { ListWorkspaceKeysResult } from "../types";
import { toWorkspaceKeyItem } from "../utils/to-workspace-key-item";

export async function listWorkspaceKeys(
  workspaceId: string,
): Promise<ListWorkspaceKeysResult> {
  const rows = await db
    .select({ key: workspaceApiKeys, displayName: users.displayName, email: users.email })
    .from(workspaceApiKeys)
    .leftJoin(users, eq(users.id, workspaceApiKeys.createdBy))
    .where(eq(workspaceApiKeys.workspaceId, workspaceId))
    .orderBy(workspaceApiKeys.createdAt);

  return {
    items: rows.map((row) => toWorkspaceKeyItem(row.key, row.displayName ?? row.email)),
  };
}
