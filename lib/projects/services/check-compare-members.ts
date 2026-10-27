import { and, asc, eq, inArray } from "drizzle-orm";

import { projectAspects, projects } from "@/db/schema";
import { db } from "@/lib/db";

import { COMPARE_CASE_OF, COMPARE_MEMBERS, isCompareCase } from "../project-cases";
import type { CheckCompareMembersParams, CheckCompareMembersResult, CompareMember } from "../types";

/**
 * Whether these projects can be compared (D30). Issues block saving: 2–4 distinct projects of
 * the workspace, all of the listening case the compare case takes. Warnings do not: aspects
 * only some members have (left out of the comparison) and differing timezones (days line up
 * by date).
 */
export async function checkCompareMembers(
  params: CheckCompareMembersParams,
): Promise<CheckCompareMembersResult> {
  const ids = [...new Set(params.memberIds)];
  const rows = ids.length
    ? await db
        .select({
          id: projects.id,
          name: projects.name,
          case: projects.listeningCase,
          timezone: projects.timezone,
        })
        .from(projects)
        .where(and(eq(projects.workspaceId, params.workspaceId), inArray(projects.id, ids)))
    : [];
  const aspectRows = ids.length
    ? await db
        .select({ projectId: projectAspects.projectId, key: projectAspects.key, name: projectAspects.name })
        .from(projectAspects)
        .where(inArray(projectAspects.projectId, ids))
        .orderBy(asc(projectAspects.sortOrder), asc(projectAspects.name))
    : [];

  const byId = new Map(rows.map((row) => [row.id, row]));
  const members: CompareMember[] = ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        name: row.name,
        case: row.case as CompareMember["case"],
        timezone: row.timezone,
        aspects: aspectRows
          .filter((aspect) => aspect.projectId === id)
          .map(({ key, name }) => ({ key, name })),
      },
    ];
  });

  const caseOf = COMPARE_CASE_OF[params.case];
  const issues: string[] = [];
  if (ids.length !== params.memberIds.length) issues.push("Mỗi project chỉ chọn một lần.");
  if (members.length !== ids.length) issues.push("Có project không thuộc workspace này hoặc đã bị xóa.");
  if (ids.length < COMPARE_MEMBERS.min || ids.length > COMPARE_MEMBERS.max) {
    issues.push(`Chọn từ ${COMPARE_MEMBERS.min} đến ${COMPARE_MEMBERS.max} project.`);
  }
  if (params.compareProjectId && ids.includes(params.compareProjectId)) {
    issues.push("Project so sánh không tự so với chính nó.");
  }
  for (const member of members) {
    if (isCompareCase(member.case)) issues.push(`“${member.name}” là project so sánh.`);
    else if (member.case !== caseOf) issues.push(`“${member.name}” không cùng case với kiểu so sánh này.`);
  }

  const sharedAspects =
    members[0]?.aspects.filter((aspect) =>
      members.every((member) => member.aspects.some((item) => item.key === aspect.key)),
    ) ?? [];
  const warnings: string[] = [];
  const left = [
    ...new Set(
      members.flatMap((member) =>
        member.aspects
          .filter((aspect) => !sharedAspects.some((shared) => shared.key === aspect.key))
          .map((aspect) => aspect.name),
      ),
    ),
  ];
  if (members.length > 1 && left.length) {
    warnings.push(`Khía cạnh không có ở mọi project sẽ không được so sánh: ${left.join(", ")}.`);
  }
  if (new Set(members.map((member) => member.timezone)).size > 1) {
    warnings.push("Các project khác múi giờ: số theo ngày được ghép theo ngày của từng project.");
  }

  return { members, issues, warnings, sharedAspects };
}
