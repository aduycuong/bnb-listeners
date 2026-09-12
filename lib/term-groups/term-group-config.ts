export const TERM_GROUP_SEGMENT = "term-groups";

/** Hard cap on how many groups a single term may belong to. */
export const MAX_GROUPS_PER_TERM = 10;

export const TERM_GROUP_ASSIGNED_BY = {
  admin: "admin",
  llmClassifier: "llm_classifier",
  memberRebuild: "term_group_member_rebuild",
} as const;

export const TERM_GROUP_CONFIG = {
  segment: TERM_GROUP_SEGMENT,
  listTitle: "Term groups",
  listDescription:
    "Curated groups for organizing terms — e.g. projects, regions, or themes.",
  emptyTitle: "No term groups yet",
  emptyDescription: "Create a group and assign terms manually or via classification.",
  createLabel: "Add group",
  formCreateTitle: "Add term group",
  formCreateDescription: "Create a named group to organize related terms.",
  formEditTitle: "Edit term group",
  formEditDescription: "Update the group name or description.",
  membersTitle: "Group members",
  membersDescription: "Search and select terms to include in this group.",
  membersListDescription: "Terms assigned to this group.",
  membersEmptyTitle: "No terms in this group",
  membersEmptyDescription: "Add terms to start organizing this group.",
  membersSearchPlaceholder: "Search terms to add...",
  addMembersLabel: "Add terms",
  addMembersTitle: "Add terms to group",
  addMembersDescription: "Search and select terms to add to this group.",
  addMembersEmptyTitle: "All matching terms are already in this group.",
  addMembersSearchEmptyTitle: "No matching terms found.",
  rebuildMembersLabel: "Rebuild members",
  rebuildMembersTitle: "Rebuild group members",
  rebuildMembersDescription:
    "Scan workspace terms with LLM (and optional web research) to assign accurate members to this group.",
  detailTopTermsTitle: "Top terms",
  detailTopTermsDescription:
    "Highest-performing terms in this group for the selected period.",
  detailTopTermsEmptyTitle: "No terms in this group",
  detailTopTermsEmptyDescription:
    "Add terms to this group to see rankings here.",
} as const;

export const TERM_GROUP_TOP_TERMS_LIMIT = 10;

export function getTermGroupHref(
  workspaceIndex: number,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${TERM_GROUP_SEGMENT}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}
