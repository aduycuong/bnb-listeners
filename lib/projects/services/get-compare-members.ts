import { and, asc, eq } from "drizzle-orm";

import { projectCompareMembers, projects } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { isCompareCase } from "../project-cases";
import type { CheckCompareMembersResult } from "../types";
import { checkCompareMembers } from "./check-compare-members";

/**
 * Members of a compare project, the primary first, with the issues and warnings they raise now.
 * A compare project saved before `is_primary` existed takes its first member as primary.
 */
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
    .select({
      id: projectCompareMembers.memberProjectId,
      isPrimary: projectCompareMembers.isPrimary,
    })
    .from(projectCompareMembers)
    .where(eq(projectCompareMembers.compareProjectId, params.projectId))
    .orderBy(asc(projectCompareMembers.sortOrder));

  const primaryId = (rows.find((row) => row.isPrimary) ?? rows[0])?.id;
  if (!primaryId) {
    return { members: [], issues: ["Chưa có project để so sánh."], warnings: [], sharedAspects: [] };
  }

  return checkCompareMembers({
    workspaceId: params.workspaceId,
    case: project.case,
    primaryId,
    competitorIds: rows.filter((row) => row.id !== primaryId).map((row) => row.id),
    compareProjectId: params.projectId,
  });
}
