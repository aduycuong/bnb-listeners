import type { Project } from "@/db/schema";

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
    configVersion: row.configVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
