export type RebuildDocumentChunksParams = {
  documentId: string;
};

export type RebuildDocumentChunksResult = {
  documentId: string;
  chunksCreated: number;
  textChunks: number;
  mediaChunks: number;
};
