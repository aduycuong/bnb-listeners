export const documentsQueryKey = (workspaceId: string) =>
  ["documents", workspaceId] as const;

export const documentQueryKey = (workspaceId: string, documentId: string) =>
  ["document", workspaceId, documentId] as const;
