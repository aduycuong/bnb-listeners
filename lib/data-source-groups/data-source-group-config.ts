export const DATA_SOURCE_GROUP_SEGMENT = "data-source-groups";

/** Hard cap on how many groups a single data source may belong to. */
export const MAX_GROUPS_PER_DATA_SOURCE = 10;

export const DATA_SOURCE_GROUP_ASSIGNED_BY = {
  admin: "admin",
} as const;

export const DATA_SOURCE_GROUP_CONFIG = {
  segment: DATA_SOURCE_GROUP_SEGMENT,
  listTitle: "Data source groups",
  listDescription:
    "Organize Facebook page and website jobs into groups for easier document filtering.",
  emptyTitle: "No data source groups yet",
  emptyDescription:
    "Create a group and assign data sources manually.",
  createLabel: "Add group",
  formCreateTitle: "Add data source group",
  formCreateDescription:
    "Create a named group to organize related data sources.",
  formEditTitle: "Edit data source group",
  formEditDescription: "Update the group name or description.",
  membersTitle: "Group members",
  membersListDescription: "Data sources assigned to this group.",
  membersEmptyTitle: "No data sources in this group",
  membersEmptyDescription: "Add data sources to start using this group.",
  addMembersLabel: "Add data sources",
  addMembersTitle: "Add data sources to group",
  addMembersDescription:
    "Select data sources to include in this group.",
  addMembersEmptyTitle: "All data sources are already in this group.",
} as const;

export function getDataSourceGroupHref(
  workspaceIndex: number,
  ...parts: string[]
): string {
  const base = `/w/${workspaceIndex}/${DATA_SOURCE_GROUP_SEGMENT}`;
  if (parts.length === 0) {
    return base;
  }

  return `${base}/${parts.join("/")}`;
}
