import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { workspaceApiKeys } from "@/db/schema";

import type { ListWorkspaceKeysResult } from "../types";

export async function listWorkspaceKeys(
  workspaceId: string,
): Promise<ListWorkspaceKeysResult> {
  const rows = await db
    .select()
    .from(workspaceApiKeys)
    .where(eq(workspaceApiKeys.workspaceId, workspaceId))
    .orderBy(workspaceApiKeys.createdAt);

  return {
    items: rows.map((row) => ({
      id: row.id,
      unkeyKeyId: row.unkeyKeyId,
      name: row.name,
      keyStart: row.keyStart,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
