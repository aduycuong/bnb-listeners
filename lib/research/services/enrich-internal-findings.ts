import { and, asc, eq, inArray } from "drizzle-orm";

import { documentParts } from "@/db/schema";
import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { db } from "@/lib/db";
import { DOCUMENT_TYPE_POST } from "@/lib/documents/document-config";
import type { RetrievedChunk } from "@/lib/retrieval/types";

import {
  RESEARCH_ATTACHMENT_SUMMARY_MAX_CHARS,
  RESEARCH_DOC_CONTEXT_MAX_CHARS,
  RESEARCH_MAX_ATTACHMENTS,
} from "../config";
import type { Finding, FindingAttachment } from "../types";
import { formatInternalFinding } from "../utils/format-internal-finding";

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

/**
 * Fetches the media attachments (image/video eligible parts) for the given
 * post documents, keyed by document id and capped per document.
 */
async function fetchAttachments(
  documentIds: string[],
): Promise<Map<string, FindingAttachment[]>> {
  const byDoc = new Map<string, FindingAttachment[]>();
  if (documentIds.length === 0) return byDoc;

  const rows = await db
    .select({
      documentId: documentParts.documentId,
      contentType: documentParts.contentType,
      summary: documentParts.summary,
      storageUrl: documentParts.storageUrl,
    })
    .from(documentParts)
    .where(
      and(
        inArray(documentParts.documentId, documentIds),
        inArray(documentParts.contentType, ["image", "video"]),
        eq(documentParts.isEligible, true),
      ),
    )
    .orderBy(asc(documentParts.documentId), asc(documentParts.partIndex));

  for (const row of rows) {
    const list = byDoc.get(row.documentId) ?? [];
    if (list.length >= RESEARCH_MAX_ATTACHMENTS) continue;
    list.push({
      type: row.contentType === "video" ? "video" : "image",
      summary: row.summary
        ? truncate(row.summary, RESEARCH_ATTACHMENT_SUMMARY_MAX_CHARS)
        : null,
      url: row.storageUrl,
    });
    byDoc.set(row.documentId, list);
  }

  return byDoc;
}

/**
 * Fetches parent-post text (joined text parts) for the given parent document
 * ids, keyed by parent id and truncated for prompt budget.
 */
async function fetchParentContext(
  parentIds: string[],
): Promise<Map<string, string>> {
  const byParent = new Map<string, string>();
  if (parentIds.length === 0) return byParent;

  const rows = await db
    .select({
      documentId: documentParts.documentId,
      value: documentParts.value,
    })
    .from(documentParts)
    .where(
      and(
        inArray(documentParts.documentId, parentIds),
        eq(documentParts.contentType, "text"),
      ),
    )
    .orderBy(asc(documentParts.documentId), asc(documentParts.partIndex));

  const collected = new Map<string, string[]>();
  for (const row of rows) {
    const value = row.value.trim();
    if (!value) continue;
    const list = collected.get(row.documentId) ?? [];
    list.push(value);
    collected.set(row.documentId, list);
  }

  for (const [documentId, values] of collected) {
    byParent.set(
      documentId,
      truncate(values.join("\n\n"), RESEARCH_DOC_CONTEXT_MAX_CHARS),
    );
  }

  return byParent;
}

/**
 * Enriches internal search chunks into research findings:
 * - post text chunks gain media attachments,
 * - discussion chunks gain parent-post context,
 * - post/image markdown + engagement are folded in by the formatter.
 *
 * Uses two batched queries (attachments, parent context) keyed by id sets to
 * keep the retrieval hot path untouched.
 */
export async function enrichInternalFindings(
  chunks: RetrievedChunk[],
): Promise<Finding[]> {
  const postTextDocIds = Array.from(
    new Set(
      chunks
        .filter(
          (chunk) =>
            chunk.docType === DOCUMENT_TYPE_POST &&
            chunk.contentType === "text",
        )
        .map((chunk) => chunk.documentId),
    ),
  );

  const discussionParentIds = Array.from(
    new Set(
      chunks
        .filter(
          (chunk) =>
            chunk.docType === DISCUSSION_DOC_TYPE && chunk.parentDocumentId,
        )
        .map((chunk) => chunk.parentDocumentId as string),
    ),
  );

  const [attachmentsByDoc, contextByParent] = await Promise.all([
    fetchAttachments(postTextDocIds),
    fetchParentContext(discussionParentIds),
  ]);

  return chunks.map((chunk) => {
    const attachments =
      chunk.docType === DOCUMENT_TYPE_POST && chunk.contentType === "text"
        ? attachmentsByDoc.get(chunk.documentId)
        : undefined;

    const docContext =
      chunk.docType === DISCUSSION_DOC_TYPE && chunk.parentDocumentId
        ? contextByParent.get(chunk.parentDocumentId)
        : undefined;

    return {
      kind: "internal" as const,
      ref: `doc:${chunk.documentId}`,
      title: chunk.title ?? chunk.sourceOriginName,
      content: formatInternalFinding(chunk, { attachments, docContext }),
      docType: chunk.docType,
      publishedAt: chunk.publishedAt,
    };
  });
}
