import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { WorkspaceLlmSettings } from "../types";

export async function getWorkspaceLlmSettings(
  workspaceId: string,
): Promise<WorkspaceLlmSettings> {
  const [row] = await db
    .select({
      dataCollectionScope: workspaces.dataCollectionScope,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!row) {
    throw new NotFoundError("workspace", workspaceId);
  }

  return {
    dataCollectionScope: row.dataCollectionScope,
  };
}
