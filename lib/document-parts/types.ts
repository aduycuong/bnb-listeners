import type {
  DOCUMENT_PART_CONTENT_TYPES,
  DOCUMENT_PART_SCORE_SOURCES,
} from "./config";

export type DocumentPartContentType =
  (typeof DOCUMENT_PART_CONTENT_TYPES)[number];

export type DocumentPartMediaKind = Exclude<DocumentPartContentType, "text">;

export type DocumentPartScoreSource =
  (typeof DOCUMENT_PART_SCORE_SOURCES)[number];

export type RebuildDocumentPartsParams = {
  documentId: string;
};

export type RebuildDocumentPartsResult = {
  documentId: string;
  parts: DocumentPartRow[];
};

/** Row shape shared by services and the UI list endpoint. */
export type DocumentPartRow = {
  id: string;
  documentId: string;
  partIndex: number;
  contentType: DocumentPartContentType;
  value: string;
  storageKey: string | null;
  storageUrl: string | null;
  relevanceScore: number | null;
  detailScore: number | null;
  partScore: number | null;
  summary: string | null;
  isEligible: boolean;
  scoreSource: DocumentPartScoreSource | null;
  scoreError: string | null;
  metadata: Record<string, unknown>;
  scoredAt: Date | null;
  createdAt: Date;
};

export type ListDocumentPartsParams = {
  id: string;
};

export type DocumentPartListItem = Omit<
  DocumentPartRow,
  "scoredAt" | "createdAt"
> & {
  scoredAt: string | null;
  createdAt: string;
};

export type ListDocumentPartsResult = {
  items: DocumentPartListItem[];
  total: number;
  eligibleCount: number;
};
