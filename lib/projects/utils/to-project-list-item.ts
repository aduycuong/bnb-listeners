import type { Project } from "@/db/schema";
import { parseTermLanguage } from "@/lib/workspaces/utils/parse-term-language";

import { parseProjectCase } from "../project-cases";
import type { ProjectListItem } from "../types";

export function toProjectListItem(row: Project): ProjectListItem {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    case: parseProjectCase(row.listeningCase),
    caseVersion: row.caseVersion,
    mode: row.mode === "sandbox" ? "sandbox" : "live",
    isDemo: row.isDemo,
    configVersion: row.configVersion,
    autoCreateTerms: row.autoCreateTerms,
    termLanguage: parseTermLanguage(row.termLanguage),
    termCriteria: row.termCriteria,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
