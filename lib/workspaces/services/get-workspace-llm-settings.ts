import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { WorkspaceLlmSettings } from "../types";
import { parseTermLanguage } from "../utils/parse-term-language";

function toWorkspaceLlmSettings(row: {
  dataCollectionScope: string;
  autoCreateTerms: boolean;
  termLanguage: string;
  termCriteria: string;
}): WorkspaceLlmSettings {
  return {
    dataCollectionScope: row.dataCollectionScope,
    autoCreateTerms: row.autoCreateTerms,
    termLanguage: parseTermLanguage(row.termLanguage),
    termCriteria: row.termCriteria,
  };
}

export async function getWorkspaceLlmSettings(
  workspaceId: string,
): Promise<WorkspaceLlmSettings> {
  const [row] = await db
    .select({
      dataCollectionScope: workspaces.dataCollectionScope,
      autoCreateTerms: workspaces.autoCreateTerms,
      termLanguage: workspaces.termLanguage,
      termCriteria: workspaces.termCriteria,
    })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!row) {
    throw new NotFoundError("workspace", workspaceId);
  }

  return toWorkspaceLlmSettings(row);
}
