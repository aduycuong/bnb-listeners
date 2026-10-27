import { and, asc, eq, inArray } from "drizzle-orm";

import { projectAspects, projects } from "@/db/schema";
import { db } from "@/lib/db";

import { COMPARE_CASE_OF, COMPARE_COMPETITORS, isCompareCase } from "../project-cases";
import type { CheckCompareMembersParams, CheckCompareMembersResult, CompareMember } from "../types";

/**
 * Whether a primary project and these competitors can be compared (D30). Issues block saving:
 * 1–3 competitors besides the primary, all distinct projects of the workspace and of the
 * listening case the compare case takes. Warnings do not: aspects only some members have (left
 * out of the comparison) and differing timezones (days line up by date).
 */
export async function checkCompareMembers(
  params: CheckCompareMembersParams,
): Promise<CheckCompareMembersResult> {
  const requested = [params.primaryId, ...params.competitorIds];
  const ids = [...new Set(requested)];
  const [rows, aspectRows] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        case: projects.listeningCase,
        timezone: projects.timezone,
      })
      .from(projects)
      .where(and(eq(projects.workspaceId, params.workspaceId), inArray(projects.id, ids))),
    db
      .select({
        projectId: projectAspects.projectId,
        key: projectAspects.key,
        name: projectAspects.name,
      })
      .from(projectAspects)
      .where(inArray(projectAspects.projectId, ids))
      .orderBy(asc(projectAspects.sortOrder), asc(projectAspects.name)),
  ]);

  const byId = new Map(rows.map((row) => [row.id, row]));
  const members: CompareMember[] = ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        name: row.name,
        primary: id === params.primaryId,
        case: row.case as CompareMember["case"],
        timezone: row.timezone,
        aspects: aspectRows
          .filter((aspect) => aspect.projectId === id)
          .map(({ key, name }) => ({ key, name })),
      },
    ];
  });

  const caseOf = COMPARE_CASE_OF[params.case];
  const competitors = ids.length - 1;
  const issues: string[] = [];
  if (ids.length !== requested.length) issues.push("Mỗi project chỉ chọn một lần.");
  if (members.length !== ids.length) issues.push("Có project không thuộc workspace này hoặc đã bị xóa.");
  if (competitors < COMPARE_COMPETITORS.min || competitors > COMPARE_COMPETITORS.max) {
    issues.push(`Chọn từ ${COMPARE_COMPETITORS.min} đến ${COMPARE_COMPETITORS.max} đối thủ.`);
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
