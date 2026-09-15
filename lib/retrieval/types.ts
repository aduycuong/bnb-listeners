export type RetrievedChunk = {
  id: string;
  content: string;
  chunkIndex: number;
  qualityScore: number;
  documentId: string;
  title: string | null;
  docType: string;
  sourceOriginName: string;
  publishedAt: string | null;
  rrfScore: number;
  commentCount: number;
};

export type SearchChunksParams = {
  workspaceId: string;
  query: string;
  limit?: number;
  termIds?: string[];
};

export type GetDocumentCommentsParams = {
  workspaceId: string;
  documentId: string;
  offset?: number;
};

export type DocumentCommentItem = {
  id: string;
  sourceItemId: string;
  authorName: string | null;
  content: string;
  likeCount: number;
  publishedAt: string | null;
  role: string | null;
  stance: string | null;
  isSubstantive: boolean | null;
  scoredAt: string | null;
  createdAt: string;
};

export type GetDocumentCommentsResult =
  | { found: false }
  | {
      found: true;
      items: DocumentCommentItem[];
      offset: number;
      hasMore: boolean;
    };
