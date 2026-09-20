import { eq } from "drizzle-orm";

import { documentParts, documents } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { rebuildDocumentParts } from "@/lib/document-parts/services/rebuild-document-parts";
import type {
  DocumentPartRow,
  DocumentPartScoreSource,
} from "@/lib/document-parts/types";
import { resolveWorkspaceSystemPrompt } from "@/lib/llm/services/resolve-workspace-system-prompt";
import { MediaArchiveError } from "@/lib/media-assets/media-archive-error";
import { archiveMediaUrl } from "@/lib/media-assets/services/archive-media-url";

import type {
  PartScoreSummary,
  PartScores,
  ScoreDocumentParams,
  ScoreDocumentResult,
} from "../types";
import { computePartScore, isPartEligible } from "../utils/compute-part-score";
import { scoreImagePart } from "../utils/score-image-part";
import { scoreTextPart } from "../utils/score-text-part";
import { scoreVideoPart } from "../utils/score-video-part";

type ScoredPart = {
  scores: PartScores;
  scoreSource: DocumentPartScoreSource;
  scoreError: string | null;
  storageKey: string | null;
  storageUrl: string | null;
  metadata: Record<string, unknown>;
};

/**
 * Rebuilds a document's parts and scores each one independently with an LLM.
 *
 * Steps:
 *   1. Fetch the document; rebuild its parts from body + media metadata.
 *   2. Media parts: download the source URL and archive it on R2 so the URL
 *      the vision model and the embedder read never expires.
 *   3. Score every part on relevance + detail (text model / vision model /
 *      video model). A part whose archive or scoring fails is stored as
 *      `failed` and ineligible — the document as a whole still proceeds.
 *   4. Persist per-part scores and derive documents.quality_score as the
 *      highest part_score among eligible parts (0 when none).
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

  const { parts } = await rebuildDocumentParts({ documentId });

  const [textPrompt, mediaPrompt] = await Promise.all([
    resolveWorkspaceSystemPrompt(doc.workspaceId, "score_text_part"),
    resolveWorkspaceSystemPrompt(doc.workspaceId, "score_media_part"),
  ]);

  const scoredAt = new Date();
  const summaries: PartScoreSummary[] = [];

  for (const part of parts) {
    const scored = await scorePart(part, {
      workspaceId: doc.workspaceId,
      title: doc.title,
      textPrompt,
      mediaPrompt,
    });

    const { relevance, detail, summary } = scored.scores;
    const hasScores = scored.scoreSource !== "failed";
    const partScore = hasScores ? computePartScore(relevance, detail) : null;
    const isEligible = hasScores && isPartEligible(relevance, detail);

    await db
      .update(documentParts)
      .set({
        storageKey: scored.storageKey,
        storageUrl: scored.storageUrl,
        relevanceScore: hasScores ? relevance : null,
        detailScore: hasScores ? detail : null,
        partScore,
        summary,
        isEligible,
        scoreSource: scored.scoreSource,
        scoreError: scored.scoreError,
        metadata: { ...part.metadata, ...scored.metadata },
        scoredAt,
      })
      .where(eq(documentParts.id, part.id));

    summaries.push({
      partId: part.id,
      partIndex: part.partIndex,
      contentType: part.contentType,
      relevanceScore: hasScores ? relevance : null,
      detailScore: hasScores ? detail : null,
      partScore,
      isEligible,
      scoreSource: scored.scoreSource,
      scoreError: scored.scoreError,
      summary,
    });
  }

  const eligible = summaries.filter((part) => part.isEligible);
  const qualityScore = eligible.reduce(
    (max, part) => Math.max(max, part.partScore ?? 0),
    0,
  );

  await db
    .update(documents)
    .set({ qualityScore })
    .where(eq(documents.id, documentId));

  return {
    documentId,
    qualityScore,
    eligibleCount: eligible.length,
    parts: summaries,
  };
}

type ScorePartContext = {
  workspaceId: string;
  title: string | null;
  textPrompt: string;
  mediaPrompt: string;
};

async function scorePart(
  part: DocumentPartRow,
  ctx: ScorePartContext,
): Promise<ScoredPart> {
  if (part.contentType === "text") {
    return runScorer(
      () =>
        scoreTextPart({
          title: ctx.title,
          text: part.value,
          systemPrompt: ctx.textPrompt,
        }),
      { storageKey: null, storageUrl: null, metadata: {} },
    );
  }

  let archived: Pick<ScoredPart, "storageKey" | "storageUrl" | "metadata">;

  try {
    const result = await archiveMediaUrl({
      sourceUrl: part.value,
      kind: part.contentType,
      keySegments: [ctx.workspaceId, part.documentId, part.partIndex],
    });

    archived = {
      storageKey: result.storageKey,
      storageUrl: result.storageUrl,
      metadata: {
        mediaContentType: result.contentType,
        mediaBytes: result.bytes,
      },
    };
  } catch (error) {
    return {
      scores: { relevance: 0, detail: 0, summary: null },
      scoreSource: "failed",
      scoreError: describeError(error),
      storageKey: null,
      storageUrl: null,
      metadata: {},
    };
  }

  const storageUrl = archived.storageUrl;

  if (!storageUrl) {
    return {
      ...archived,
      scores: { relevance: 0, detail: 0, summary: null },
      scoreSource: "failed",
      scoreError: "Archived media has no storage URL.",
    };
  }

  if (part.contentType === "video") {
    return runScorer(
      () =>
        scoreVideoPart({
          videoUrl: storageUrl,
          systemPrompt: ctx.mediaPrompt,
        }),
      archived,
    );
  }

  return runScorer(
    () =>
      scoreImagePart({
        imageUrl: storageUrl,
        systemPrompt: ctx.mediaPrompt,
      }),
    archived,
  );
}

async function runScorer(
  scorer: () => Promise<PartScores>,
  archived: Pick<ScoredPart, "storageKey" | "storageUrl" | "metadata">,
): Promise<ScoredPart> {
  try {
    const scores = await scorer();
    return { ...archived, scores, scoreSource: "llm", scoreError: null };
  } catch (error) {
    return {
      ...archived,
      scores: { relevance: 0, detail: 0, summary: null },
      scoreSource: "failed",
      scoreError: describeError(error),
    };
  }
}

function describeError(error: unknown): string {
  if (error instanceof MediaArchiveError) {
    return `${error.code}: ${error.message}`;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}
