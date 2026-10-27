import { and, eq } from "drizzle-orm";

import { projectCompareMembers, projects } from "@/db/schema";
import { InvalidInputError, NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import { isCompareCase } from "../project-cases";
import type { CheckCompareMembersResult, UpdateCompareMembersParams } from "../types";
import { toCompareMemberRows } from "../utils/to-compare-member-rows";
import { checkCompareMembers } from "./check-compare-members";

/** Replaces the primary project and competitors of a compare project, in the given order. */
export async function updateCompareMembers(
  params: UpdateCompareMembersParams,
): Promise<CheckCompareMembersResult & { message: string }> {
  const [project] = await db
    .select({ case: projects.listeningCase })
    .from(projects)
    .where(and(eq(projects.id, params.projectId), eq(projects.workspaceId, params.workspaceId)))
    .limit(1);
  if (!project) throw new NotFoundError("project", params.projectId);
  if (!isCompareCase(project.case)) throw new InvalidInputError("Project này không phải project so sánh.");

  const check = await checkCompareMembers({
    workspaceId: params.workspaceId,
    case: project.case,
    primaryId: params.primaryId,
    competitorIds: params.competitorIds,
    compareProjectId: params.projectId,
  });
  if (check.issues.length) throw new InvalidInputError(check.issues.join(" "));

  await db.batch([
    db
      .delete(projectCompareMembers)
      .where(eq(projectCompareMembers.compareProjectId, params.projectId)),
    db.insert(projectCompareMembers).values(toCompareMemberRows(params.projectId, params)),
    db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, params.projectId)),
  ]);

  return { ...check, message: "Đã lưu các project so sánh." };
}
