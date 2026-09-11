import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type {
  UpdateWorkspaceLlmSettingsParams,
  UpdateWorkspaceLlmSettingsResult,
} from "../types";
import { parseTermLanguage } from "../utils/parse-term-language";

export async function updateWorkspaceLlmSettings(
  params: UpdateWorkspaceLlmSettingsParams,
): Promise<UpdateWorkspaceLlmSettingsResult> {
  const dataCollectionScope = params.dataCollectionScope.trim();
  const termCriteria = params.termCriteria.trim();

  const [workspace] = await db
    .update(workspaces)
    .set({
      dataCollectionScope,
      autoCreateTerms: params.autoCreateTerms,
      termLanguage: params.termLanguage,
      termCriteria,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, params.workspaceId))
    .returning({
      id: workspaces.id,
      dataCollectionScope: workspaces.dataCollectionScope,
      autoCreateTerms: workspaces.autoCreateTerms,
      termLanguage: workspaces.termLanguage,
      termCriteria: workspaces.termCriteria,
      updatedAt: workspaces.updatedAt,
    });

  if (!workspace) {
    throw new NotFoundError("workspace", params.workspaceId);
  }

  return {
    id: workspace.id,
    dataCollectionScope: workspace.dataCollectionScope,
    autoCreateTerms: workspace.autoCreateTerms,
    termLanguage: parseTermLanguage(workspace.termLanguage),
    termCriteria: workspace.termCriteria,
    updatedAt: workspace.updatedAt.toISOString(),
    message: "LLM settings saved.",
  };
}
