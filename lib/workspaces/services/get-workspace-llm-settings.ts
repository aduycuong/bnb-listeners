import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { WorkspaceLlmSettings } from "../types";
import { parseTopicLanguage } from "../utils/parse-topic-language";

function toWorkspaceLlmSettings(row: {
  dataCollectionScope: string;
  autoCreateTopics: boolean;
  topicLanguage: string;
  topicCriteria: string;
}): WorkspaceLlmSettings {
  return {
    dataCollectionScope: row.dataCollectionScope,
    autoCreateTopics: row.autoCreateTopics,
    topicLanguage: parseTopicLanguage(row.topicLanguage),
    topicCriteria: row.topicCriteria,
  };
}

export async function getWorkspaceLlmSettings(
  workspaceId: string,
): Promise<WorkspaceLlmSettings> {
  const [row] = await db
    .select({
      dataCollectionScope: workspaces.dataCollectionScope,
      autoCreateTopics: workspaces.autoCreateTopics,
      topicLanguage: workspaces.topicLanguage,
      topicCriteria: workspaces.topicCriteria,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!row) {
    throw new NotFoundError("workspace", workspaceId);
  }

  return toWorkspaceLlmSettings(row);
}
