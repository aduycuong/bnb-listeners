import type {
  DocumentPartContentType,
  DocumentPartScoreSource,
} from "@/lib/document-parts/types";

/** Normalised output of any part scorer. Scores are in [0, 1]. */
export type PartScores = {
  relevance: number;
  detail: number;
  summary: string | null;
};

export type ScoreDocumentParams = {
  documentId: string;
};

export type PartScoreSummary = {
  partId: string;
  partIndex: number;
  contentType: DocumentPartContentType;
  relevanceScore: number | null;
  detailScore: number | null;
  partScore: number | null;
  isEligible: boolean;
  scoreSource: DocumentPartScoreSource;
  scoreError: string | null;
  summary: string | null;
};

export type ScoreDocumentResult = {
  documentId: string;
  /** Highest part_score among eligible parts; 0 when none is eligible. */
  qualityScore: number;
  eligibleCount: number;
  parts: PartScoreSummary[];
};
