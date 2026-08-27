export type RetrievedChunk = {
  id: string;
  content: string;
  chunkIndex: number;
  qualityScore: number;
  documentId: string;
  title: string | null;
  docType: string;
  sourceName: string;
  publishedAt: string | null;
  rrfScore: number;
};

export type SearchChunksParams = {
  workspaceId: string;
  query: string;
  limit?: number;
  topicIds?: string[];
};
