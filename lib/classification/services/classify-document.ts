import { and, eq } from "drizzle-orm";

import { documentTerms, documents, terms } from "@/db/schema";
import { syncDiscussionDocumentTerms } from "@/lib/comments/services/sync-discussion-document-terms";
import { resolveDiscussionParentDocumentId } from "@/lib/comments/utils/resolve-discussion-parent-document-id";
import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { invalidateTermDigest } from "@/lib/term-digests/services/invalidate-term-digest";
import { assignTermGroupsAfterClassification } from "@/lib/term-groups/services/assign-term-groups-after-classification";
import { findTermByName } from "@/lib/terms/utils/find-term-by-name";
import { resolveWorkspaceSystemPrompt } from "@/lib/llm/services/resolve-workspace-system-prompt";
import { getWorkspaceLlmSettings } from "@/lib/workspaces/services/get-workspace-llm-settings";

import type {
  ClassifyDocumentParams,
  ClassifyDocumentResult,
  CreatedTerm,
  ProposedTerm,
  TermAssignment,
} from "../types";
import { classifyWithLlm } from "../utils/classify-with-llm";
import { createAutoTerm } from "../utils/create-auto-term";
import { loadTermsForClassifier } from "../utils/load-terms-for-classifier";
import { proposeTermsWithLlm } from "../utils/propose-term-with-llm";

const LLM_ASSIGNED_BY = "llm_classifier";

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function fetchDocumentTermIds(documentId: string): Promise<string[]> {
  const rows = await db
    .select({ termId: documentTerms.termId })
    .from(documentTerms)
    .where(eq(documentTerms.documentId, documentId));
  return rows.map((r) => r.termId);
}

async function fetchLlmTermIds(documentId: string): Promise<string[]> {
  const rows = await db
    .select({ termId: documentTerms.termId })
    .from(documentTerms)
    .where(
      and(
        eq(documentTerms.documentId, documentId),
        eq(documentTerms.assignedBy, LLM_ASSIGNED_BY),
      ),
    );
  return rows.map((r) => r.termId);
}

/**
 * Invalidate the daily digest partition for every affected term.
 */
async function invalidateAffectedDigests(
  termIds: string[],
  publishedAt: Date | null,
  documentJobId: string,
): Promise<void> {
  if (!publishedAt || termIds.length === 0) return;
  const dateKey = toDateKey(publishedAt);

  await Promise.all(
    termIds.map((termId) =>
      invalidateTermDigest({ termId, dateKey, dataSourceId: documentJobId }),
    ),
  );
}

async function clearAllAssignments(documentId: string): Promise<void> {
  await db
    .delete(documentTerms)
    .where(eq(documentTerms.documentId, documentId));
}

async function clearLlmAssignments(documentId: string): Promise<void> {
  await db
    .delete(documentTerms)
    .where(
      and(
        eq(documentTerms.documentId, documentId),
        eq(documentTerms.assignedBy, LLM_ASSIGNED_BY),
      ),
    );
}

async function assignExistingTerms(
  documentId: string,
  assignments: TermAssignment[],
): Promise<void> {
  if (assignments.length === 0) {
    return;
  }

  await db
    .insert(documentTerms)
    .values(
      assignments.map((assignment) => ({
        documentId,
        termId: assignment.termId,
        confidence: assignment.confidence,
        assignedBy: LLM_ASSIGNED_BY,
      })),
    )
    .onConflictDoNothing();
}

async function buildClassifyResultFromDocumentTerms(
  documentId: string,
): Promise<ClassifyDocumentResult> {
  const rows = await db
    .select({
      termId: documentTerms.termId,
      name: terms.name,
      confidence: documentTerms.confidence,
    })
    .from(documentTerms)
    .innerJoin(terms, eq(documentTerms.termId, terms.id))
    .where(eq(documentTerms.documentId, documentId));

  return {
    documentId,
    assignments: rows.map((row) => ({
      termId: row.termId,
      name: row.name,
      confidence: row.confidence,
    })),
    createdTerms: [],
  };
}

async function assignProposedTerms(
  workspaceId: string,
  documentId: string,
  proposedTerms: ProposedTerm[],
): Promise<ClassifyDocumentResult> {
  const assignments: TermAssignment[] = [];
  const createdTerms: CreatedTerm[] = [];
  const seenNames = new Set<string>();

  for (const proposed of proposedTerms) {
    const name = proposed.name.trim();
    if (!name) {
      continue;
    }

    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) {
      continue;
    }
    seenNames.add(nameKey);

    const existing = await findTermByName(workspaceId, name);
    if (existing) {
      assignments.push({
        termId: existing.id,
        name: existing.name,
        confidence: 1,
      });
      continue;
    }

    const createdTerm = await createAutoTerm(workspaceId, documentId, {
      name,
      description: proposed.description,
    });
    createdTerms.push(createdTerm);
  }

  await assignExistingTerms(documentId, assignments);

  return { documentId, assignments, createdTerms };
}

/**
 * Classifies a document against existing terms using an LLM.
 *
 * Steps:
 *   1. Fetch the document and all terms (including LLM-created ones).
 *   2. Ask the LLM to select matching terms; when none fit, optionally propose new terms.
 *   3. Assign existing terms, or auto-create proposed terms (0..N) when appropriate.
 *      If a proposed name already exists, assign that term instead.
 *
 * By default only prior LLM assignments are replaced; admin and backfill
 * assignments are preserved. Set replaceAllAssignments to clear every
 * existing assignment first (used by manual re-classify).
 *
 * Discussion documents never run the LLM directly. Pipeline classify mirrors
 * the parent post; manual re-classify re-runs classification on the parent
 * and then mirrors the result onto the discussion document.
 *
 * Digest invalidation runs for every classified document (all documents belong to a dataSource).
 */
export async function classifyDocument(
  params: ClassifyDocumentParams,
): Promise<ClassifyDocumentResult> {
  const { documentId, replaceAllAssignments = false } = params;

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    throw new NotFoundError("document", documentId);
  }

  if (doc.docType === DISCUSSION_DOC_TYPE) {
    const parentDocumentId = await resolveDiscussionParentDocumentId({
      workspaceId: doc.workspaceId,
      docType: doc.docType,
      sourceOriginKey: doc.sourceOriginKey,
      sourceItemId: doc.sourceItemId,
      metadata: doc.metadata,
    });

    if (!parentDocumentId) {
      return { documentId, assignments: [], createdTerms: [] };
    }

    if (replaceAllAssignments) {
      await classifyDocument({
        documentId: parentDocumentId,
        replaceAllAssignments: true,
      });
    } else {
      await syncDiscussionDocumentTerms(parentDocumentId);
    }

    return buildClassifyResultFromDocumentTerms(documentId);
  }

  const docContext = {
    title: doc.title,
    rawContent: doc.rawContent,
    docType: doc.docType,
    sourceOriginName: doc.sourceOriginName,
  };

  const oldTermIds = replaceAllAssignments
    ? await fetchDocumentTermIds(documentId)
    : await fetchLlmTermIds(documentId);

  if (replaceAllAssignments) {
    await clearAllAssignments(documentId);
  } else {
    await clearLlmAssignments(documentId);
  }

  const [classifierTerms, llmSettings] = await Promise.all([
    loadTermsForClassifier(doc.workspaceId),
    getWorkspaceLlmSettings(doc.workspaceId),
  ]);
  const classifyPrompt = await resolveWorkspaceSystemPrompt(
    doc.workspaceId,
    "classify_terms",
  );

  let result: ClassifyDocumentResult;

  if (classifierTerms.length === 0) {
    if (!llmSettings.autoCreateTerms) {
      result = { documentId, assignments: [], createdTerms: [] };
    } else {
      const proposePrompt = await resolveWorkspaceSystemPrompt(
        doc.workspaceId,
        "propose_term",
      );
      const proposedTerms = await proposeTermsWithLlm(docContext, proposePrompt);
      result = await assignProposedTerms(
        doc.workspaceId,
        documentId,
        proposedTerms,
      );
    }
  } else {
    const { assignments: llmAssignments } = await classifyWithLlm(
      docContext,
      classifierTerms,
      classifyPrompt,
    );

    const termById = new Map(
      classifierTerms.map((term) => [term.id, term]),
    );
    const assignments: TermAssignment[] = [];

    for (const { id, confidence } of llmAssignments) {
      const term = termById.get(id);
      if (!term) continue;
      assignments.push({ termId: term.id, name: term.name, confidence });
    }

    if (assignments.length > 0) {
      await assignExistingTerms(documentId, assignments);
      result = { documentId, assignments, createdTerms: [] };
    } else if (!llmSettings.autoCreateTerms) {
      result = { documentId, assignments: [], createdTerms: [] };
    } else {
      const proposePrompt = await resolveWorkspaceSystemPrompt(
        doc.workspaceId,
        "propose_term",
      );
      const proposedTerms = await proposeTermsWithLlm(docContext, proposePrompt);
      result = await assignProposedTerms(
        doc.workspaceId,
        documentId,
        proposedTerms,
      );
    }
  }

  // Invalidate daily digest rows for every term whose doc count changed.
  const newTermIds = [
    ...result.assignments.map((a) => a.termId),
    ...result.createdTerms.map((t) => t.id),
  ];
  const affectedTermIds = [...new Set([...oldTermIds, ...newTermIds])];
  await invalidateAffectedDigests(affectedTermIds, doc.publishedAt, doc.dataSourceId);

  if (newTermIds.length > 0) {
    await assignTermGroupsAfterClassification({
      workspaceId: doc.workspaceId,
      termIds: newTermIds,
      doc: docContext,
    });
  }

  await syncDiscussionDocumentTerms(documentId);

  return result;
}
