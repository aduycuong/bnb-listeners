export type DocumentsQueryFilters = {
  groupIds: string[];
  jobIds: string[];
};

export const documentsQueryKey = (
  workspaceId: string,
  filters?: DocumentsQueryFilters,
) =>
  filters
    ? (["documents", workspaceId, filters] as const)
    : (["documents", workspaceId] as const);

export const documentQueryKey = (workspaceId: string, documentId: string) =>
  ["document", workspaceId, documentId] as const;

export const workspaceJobsQueryKey = (workspaceId: string) =>
  ["workspace-jobs", workspaceId] as const;
