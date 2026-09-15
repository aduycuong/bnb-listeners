export const dataSourceGroupsQueryKey = (workspaceId: string) =>
  ["data-source-groups", workspaceId] as const;

export const dataSourceGroupQueryKey = (
  workspaceId: string,
  groupId: string,
) => ["data-source-group", workspaceId, groupId] as const;

export const dataSourceGroupMembersQueryKey = (
  workspaceId: string,
  groupId: string,
) => ["data-source-group-members", workspaceId, groupId] as const;
