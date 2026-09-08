import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  UpdateWorkspaceLlmSettingsParams,
  UpdateWorkspaceLlmSettingsResult,
} from "../types";
import { parseTopicLanguage } from "../utils/parse-topic-language";

export async function updateWorkspaceLlmSettings(
  params: UpdateWorkspaceLlmSettingsParams,
): Promise<UpdateWorkspaceLlmSettingsResult> {
  const dataCollectionScope = params.dataCollectionScope.trim();
  const topicCriteria = params.topicCriteria.trim();

  const [workspace] = await db
    .update(workspaces)
    .set({
      dataCollectionScope,
      autoCreateTopics: params.autoCreateTopics,
      topicLanguage: params.topicLanguage,
      topicCriteria,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, params.workspaceId))
    .returning({
      id: workspaces.id,
      dataCollectionScope: workspaces.dataCollectionScope,
      autoCreateTopics: workspaces.autoCreateTopics,
      topicLanguage: workspaces.topicLanguage,
      topicCriteria: workspaces.topicCriteria,
      updatedAt: workspaces.updatedAt,
    });

  if (!workspace) {
    throw new NotFoundError("workspace", params.workspaceId);
  }

  return {
    id: workspace.id,
    dataCollectionScope: workspace.dataCollectionScope,
    autoCreateTopics: workspace.autoCreateTopics,
    topicLanguage: parseTopicLanguage(workspace.topicLanguage),
    topicCriteria: workspace.topicCriteria,
    updatedAt: workspace.updatedAt.toISOString(),
    message: "LLM settings saved.",
  };
}
