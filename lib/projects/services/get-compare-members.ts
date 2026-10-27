import { and, asc, eq } from "drizzle-orm";

import { projectCompareMembers, projects } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { isCompareCase } from "../project-cases";
import type { CheckCompareMembersResult } from "../types";
import { checkCompareMembers } from "./check-compare-members";

/** Members of a compare project in display order, with the issues and warnings they raise now. */
export async function getCompareMembers(params: {
  workspaceId: string;
  projectId: string;
}): Promise<CheckCompareMembersResult> {
  const [project] = await db
    .select({ case: projects.listeningCase })
    .from(projects)
    .where(and(eq(projects.id, params.projectId), eq(projects.workspaceId, params.workspaceId)))
    .limit(1);
  if (!project) throw new NotFoundError("project", params.projectId);
  if (!isCompareCase(project.case)) throw new InvalidInputError("Project này không phải project so sánh.");

  const rows = await db
    .select({ id: projectCompareMembers.memberProjectId })
    .from(projectCompareMembers)
    .where(eq(projectCompareMembers.compareProjectId, params.projectId))
    .orderBy(asc(projectCompareMembers.sortOrder));

  return checkCompareMembers({
    workspaceId: params.workspaceId,
    case: project.case,
    memberIds: rows.map((row) => row.id),
    compareProjectId: params.projectId,
  });
}
