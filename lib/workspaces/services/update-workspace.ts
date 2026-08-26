import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  UpdateWorkspaceParams,
  UpdateWorkspaceResult,
} from "../types";
import { parseTopicLanguage } from "../utils/parse-topic-language";

export async function updateWorkspace(
  params: UpdateWorkspaceParams,
): Promise<UpdateWorkspaceResult> {
  const topicScope = params.topicScope.trim();

  const [workspace] = await db
    .update(workspaces)
    .set({
      topicScope,
      topicLanguage: params.topicLanguage,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, params.workspaceId))
    .returning({
      id: workspaces.id,
      topicScope: workspaces.topicScope,
      topicLanguage: workspaces.topicLanguage,
      updatedAt: workspaces.updatedAt,
    });

  if (!workspace) {
    throw new NotFoundError("workspace", params.workspaceId);
  }

  return {
    id: workspace.id,
    topicScope: workspace.topicScope,
    topicLanguage: parseTopicLanguage(workspace.topicLanguage),
    updatedAt: workspace.updatedAt.toISOString(),
    message: "Workspace settings saved.",
  };
}
