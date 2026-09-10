export type RebuildDocumentChunksParams = {
  documentId: string;
};

export type RebuildDocumentChunksResult = {
  documentId: string;
  chunksCreated: number;
  textChunks: number;
  mediaChunks: number;
};

export type ListDocumentChunksParams = {
  id: string;
};

export type DocumentChunkListItem = {
  id: string;
  chunkIndex: number;
  content: string;
  contentType: string;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  mediaMetadata: Record<string, unknown> | null;
  topicIds: string[] | null;
  createdAt: string;
};

export type ListDocumentChunksResult = {
  items: DocumentChunkListItem[];
  total: number;
};
