import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { DEFAULT_TOPIC_SCOPE } from "../constants";
import type { WorkspaceLlmSettings } from "../types";
import { parseTopicLanguage } from "../utils/parse-topic-language";

export async function getWorkspaceLlmSettings(
  workspaceId: string,
): Promise<WorkspaceLlmSettings> {
  const [workspace] = await db
    .select({
      topicScope: workspaces.topicScope,
      topicLanguage: workspaces.topicLanguage,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new NotFoundError("workspace", workspaceId);
  }

  return {
    topicScope: workspace.topicScope.trim() || DEFAULT_TOPIC_SCOPE,
    topicLanguage: parseTopicLanguage(workspace.topicLanguage),
  };
}
