import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  UpdateWorkspaceLlmSettingsParams,
  UpdateWorkspaceLlmSettingsResult,
} from "../types";

export async function updateWorkspaceLlmSettings(
  params: UpdateWorkspaceLlmSettingsParams,
): Promise<UpdateWorkspaceLlmSettingsResult> {
  const dataCollectionScope = params.dataCollectionScope.trim();

  const [workspace] = await db
    .update(workspaces)
    .set({
      dataCollectionScope,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, params.workspaceId))
    .returning({
      id: workspaces.id,
      dataCollectionScope: workspaces.dataCollectionScope,
      updatedAt: workspaces.updatedAt,
    });

  if (!workspace) {
    throw new NotFoundError("workspace", params.workspaceId);
  }

  return {
    id: workspace.id,
    dataCollectionScope: workspace.dataCollectionScope,
    updatedAt: workspace.updatedAt.toISOString(),
    message: "Collection scope saved.",
  };
}
