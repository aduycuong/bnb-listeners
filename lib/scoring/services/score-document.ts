import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";

import { SCORING_WEIGHTS } from "../config";
import type {
  ScoreDocumentParams,
  ScoreDocumentResult,
  ScoringDimensions,
} from "../types";
import { combineScores } from "../utils/combine-scores";
import { scoreCompleteness } from "../utils/score-completeness";
import { scoreFreshness } from "../utils/score-freshness";
import { scoreRelevance } from "../utils/score-relevance";
import { scoreSourceCredibility } from "../utils/score-source-credibility";

/**
 * Scores a document across multiple quality dimensions and persists the result.
 *
 * Steps:
 *   1. Fetch the document.
 *   2. Compute dimension scores (rule-based in parallel with LLM relevance).
 *   3. Combine into a single quality_score and persist to documents.
 *
 * Near-duplicate detection is NOT performed here — it runs in check-near-duplicate
 * after embeddings are generated, before chunks are written to the database.
 */
export async function scoreDocument(
  params: ScoreDocumentParams,
): Promise<ScoreDocumentResult> {
  const { documentId } = params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    throw new NotFoundError("document", documentId);
  }

  const relevanceScore = await scoreRelevance(doc.rawContent, doc.title);

  const dimensions: ScoringDimensions = {
    sourceCredibility: {
      score: scoreSourceCredibility(doc.sourceKey),
      weight: SCORING_WEIGHTS.sourceCredibility,
    },
    completeness: {
      score: scoreCompleteness(doc.rawContent, doc.title, doc.metadata),
      weight: SCORING_WEIGHTS.completeness,
    },
    freshness: {
      score: scoreFreshness(doc.createdAt, doc.publishedAt),
      weight: SCORING_WEIGHTS.freshness,
    },
    relevance: {
      score: relevanceScore,
      weight: SCORING_WEIGHTS.relevance,
    },
  };

  const qualityScore = combineScores(dimensions);

  await db
    .update(documents)
    .set({ qualityScore })
    .where(eq(documents.id, documentId));

  return { documentId, qualityScore, dimensions };
}
