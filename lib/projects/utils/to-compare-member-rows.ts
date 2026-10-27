import type { NewProjectCompareMember } from "@/db/schema";

/** Rows of `project_compare_members`: the primary project first, then the competitors in order. */
export function toCompareMemberRows(
  compareProjectId: string,
  members: { primaryId: string; competitorIds: string[] },
): NewProjectCompareMember[] {
  return [members.primaryId, ...members.competitorIds].map((memberProjectId, sortOrder) => ({
    compareProjectId,
    memberProjectId,
    sortOrder,
    isPrimary: memberProjectId === members.primaryId,
  }));
}
