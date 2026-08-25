import type { ScoringDimensionKey } from "./config";

export type DimensionScore = {
  /** Raw score for this dimension, in [0, 1]. */
  score: number;
  /** Relative weight applied when combining dimensions. */
  weight: number;
};

export type ScoringDimensions = Record<ScoringDimensionKey, DimensionScore>;

export type ScoreDocumentParams = {
  documentId: string;
};

export type ScoreDocumentResult = {
  documentId: string;
  qualityScore: number;
  dimensions: ScoringDimensions;
};
