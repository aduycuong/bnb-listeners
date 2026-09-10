export type DocumentsQueryFilters = {
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

export const documentChunksQueryKey = (
  workspaceId: string,
  documentId: string,
) => ["document-chunks", workspaceId, documentId] as const;

export const documentCommentsQueryKey = (
  workspaceId: string,
  documentId: string,
) => ["document-comments", workspaceId, documentId] as const;

export const documentCommentChunksQueryKey = (
  workspaceId: string,
  documentId: string,
) => ["document-comment-chunks", workspaceId, documentId] as const;
