export type RetrievedChunkScores = {
  rrfScore: number;
  similarityScore: number;
  multimodalSimilarityScore: number | null;
  ftsScore: number | null;
};

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
  commentCount: number;
} & Partial<RetrievedChunkScores>;

export type RetrievedChunkWithScores = RetrievedChunk & RetrievedChunkScores;

export type SearchChunksParams = {
  workspaceId: string;
  query: string;
  limit?: number;
  termIds?: string[];
  documentId?: string;
  includeScores?: boolean;
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
