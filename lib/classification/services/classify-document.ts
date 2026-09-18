import { and, eq, ne } from "drizzle-orm";

import { documentTerms, documents, terms, type Document } from "@/db/schema";
import { syncDiscussionDocumentTerms } from "@/lib/comments/services/sync-discussion-document-terms";
import { findDiscussionDocumentId } from "@/lib/comments/utils/find-discussion-document-id";
import { findDiscussionParentDocument } from "@/lib/comments/utils/find-discussion-parent-document";
import { DISCUSSION_DOC_TYPE } from "@/lib/comments/config";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";
import { getEligibleDocumentParts } from "@/lib/document-parts/services/get-eligible-document-parts";
import { DOCUMENT_TERM_ASSIGNED_BY } from "@/lib/document-terms/document-term-config";
import { invalidateTermDigest } from "@/lib/term-digests/services/invalidate-term-digest";
import { assignTermGroupsAfterClassification } from "@/lib/term-groups/services/assign-term-groups-after-classification";
import { buildTermEmbeddingText } from "@/lib/terms/utils/build-term-embedding-text";
import { embedTermTexts } from "@/lib/terms/utils/embed-term-texts";
import { findTermByName } from "@/lib/terms/utils/find-term-by-name";
import { resolveWorkspaceSystemPrompt } from "@/lib/llm/services/resolve-workspace-system-prompt";
import { getWorkspaceLlmSettings } from "@/lib/workspaces/services/get-workspace-llm-settings";

import { TERM_DUPLICATE_SIMILARITY } from "../config";
import type {
  ClassifierDocContext,
  ClassifierTerm,
  ClassifyDocumentParams,
  ClassifyDocumentResult,
  CreatedTerm,
  ProposedTerm,
  TermAssignment,
} from "../types";
import { buildClassifierContentFromParts } from "../utils/build-classifier-content-from-parts";
import { classifyWithLlm } from "../utils/classify-with-llm";
import { createAutoTerm } from "../utils/create-auto-term";
import {
  findCandidateTermsByEmbeddings,
  type TermCandidate,
} from "../utils/find-candidate-terms-by-embeddings";
import { loadTermVocabularyHint } from "../utils/load-term-vocabulary-hint";
import { proposeTermsWithLlm } from "../utils/propose-term-with-llm";

const LLM_ASSIGNED_BY = DOCUMENT_TERM_ASSIGNED_BY.llmClassifier;

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

async function fetchNonAdminTermIds(documentId: string): Promise<string[]> {
  const rows = await db
    .select({ termId: documentTerms.termId })
    .from(documentTerms)
    .where(
      and(
        eq(documentTerms.documentId, documentId),
        ne(documentTerms.assignedBy, DOCUMENT_TERM_ASSIGNED_BY.admin),
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

/**
 * Classifier input built only from parts that passed both score thresholds.
 * Null when nothing is eligible.
 */
async function loadEligibleContent(documentId: string): Promise<string | null> {
  const parts = await getEligibleDocumentParts(documentId);
  const content = buildClassifierContentFromParts(parts);
  return content || null;
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

/** Remove every assignment except those an admin set by hand. */
async function clearNonAdminAssignments(documentId: string): Promise<void> {
  await db
    .delete(documentTerms)
    .where(
      and(
        eq(documentTerms.documentId, documentId),
        ne(documentTerms.assignedBy, DOCUMENT_TERM_ASSIGNED_BY.admin),
      ),
    );
}

/**
 * Ask the LLM to pick matching terms from the candidate list and map the
 * response back onto known terms (unknown ids are dropped).
 */
async function selectExistingTermsWithLlm(
  docContext: ClassifierDocContext,
  classifierTerms: ClassifierTerm[],
  classifyPrompt: string,
): Promise<TermAssignment[]> {
  const { assignments: llmAssignments } = await classifyWithLlm(
    docContext,
    classifierTerms,
    classifyPrompt,
  );

  const termById = new Map(classifierTerms.map((term) => [term.id, term]));
  const assignments: TermAssignment[] = [];
  const seen = new Set<string>();

  for (const { id, confidence } of llmAssignments) {
    const term = termById.get(id);
    if (!term || seen.has(term.id)) continue;
    seen.add(term.id);
    assignments.push({ termId: term.id, name: term.name, confidence });
  }

  return assignments;
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

/** Outcome of propose → embed → retrieve candidates → judge. */
type ProposalMatch = {
  proposals: ProposedTerm[];
  /** Positionally aligned with `proposals`. */
  embeddings: number[][];
  /** Positionally aligned with `proposals`; best candidate first. */
  candidatesByProposal: TermCandidate[][];
  /** Existing terms the judge confirmed for this document. */
  assignments: TermAssignment[];
};

const EMPTY_MATCH: ProposalMatch = {
  proposals: [],
  embeddings: [],
  candidatesByProposal: [],
  assignments: [],
};

/**
 * Shared front half of classification:
 *
 *   1. LLM proposes the terms it would tag the document with (guided by the
 *      workspace's most-used term names).
 *   2. Proposals are embedded and the nearest existing terms are retrieved
 *      per proposal — a short candidate list instead of the whole workspace.
 *   3. The judge LLM sees only those candidates plus the document and decides
 *      which existing terms apply, with a confidence per assignment.
 *
 * Nothing is written here; callers assign and (optionally) create.
 */
async function proposeAndJudgeTerms(
  workspaceId: string,
  docContext: ClassifierDocContext,
): Promise<ProposalMatch> {
  const [proposePrompt, vocabularyHint] = await Promise.all([
    resolveWorkspaceSystemPrompt(workspaceId, "propose_term"),
    loadTermVocabularyHint(workspaceId),
  ]);

  const proposals = dedupeProposals(
    await proposeTermsWithLlm(docContext, proposePrompt, vocabularyHint),
  );

  if (proposals.length === 0) {
    return EMPTY_MATCH;
  }

  const embeddings = await embedTermTexts(
    proposals.map(buildTermEmbeddingText),
  );
  const candidatesByProposal = await findCandidateTermsByEmbeddings(
    workspaceId,
    embeddings,
  );

  const candidateById = new Map<string, ClassifierTerm>();
  for (const candidates of candidatesByProposal) {
    for (const { term } of candidates) {
      candidateById.set(term.id, term);
    }
  }

  let assignments: TermAssignment[] = [];

  if (candidateById.size > 0) {
    const classifyPrompt = await resolveWorkspaceSystemPrompt(
      workspaceId,
      "classify_terms",
    );
    assignments = await selectExistingTermsWithLlm(
      docContext,
      [...candidateById.values()],
      classifyPrompt,
    );
  }

  return { proposals, embeddings, candidatesByProposal, assignments };
}

/** Drop blank names and case-insensitive duplicates, keeping first occurrence. */
function dedupeProposals(proposals: ProposedTerm[]): ProposedTerm[] {
  const seen = new Set<string>();
  const result: ProposedTerm[] = [];

  for (const proposal of proposals) {
    const name = proposal.name.trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({ name, description: proposal.description.trim() });
  }

  return result;
}

/**
 * A proposal is "covered" when it already maps onto an existing term:
 * either the judge assigned one of its candidates, or its best candidate is
 * so similar that creating a new term would be a duplicate.
 */
function isProposalCovered(
  candidates: TermCandidate[],
  assignedTermIds: Set<string>,
): boolean {
  if (candidates.some((c) => assignedTermIds.has(c.term.id))) {
    return true;
  }

  const best = candidates[0];
  return best !== undefined && best.similarity >= TERM_DUPLICATE_SIMILARITY;
}

/**
 * Creates terms for proposals that matched nothing. An exact name hit (e.g. a
 * term without an embedding yet) is assigned instead of created.
 */
async function createTermsForUncoveredProposals(
  workspaceId: string,
  documentId: string,
  match: ProposalMatch,
): Promise<{ assignments: TermAssignment[]; createdTerms: CreatedTerm[] }> {
  const assignedTermIds = new Set(match.assignments.map((a) => a.termId));
  const assignments: TermAssignment[] = [];
  const createdTerms: CreatedTerm[] = [];

  for (const [index, proposal] of match.proposals.entries()) {
    const candidates = match.candidatesByProposal[index] ?? [];
    if (isProposalCovered(candidates, assignedTermIds)) {
      continue;
    }

    const existing = await findTermByName(workspaceId, proposal.name);
    if (existing) {
      if (!assignedTermIds.has(existing.id)) {
        assignedTermIds.add(existing.id);
        assignments.push({
          termId: existing.id,
          name: existing.name,
          confidence: 1,
        });
      }
      continue;
    }

    const createdTerm = await createAutoTerm(
      workspaceId,
      documentId,
      proposal,
      match.embeddings[index] ?? null,
    );
    assignedTermIds.add(createdTerm.id);
    createdTerms.push(createdTerm);
  }

  await assignExistingTerms(documentId, assignments);

  return { assignments, createdTerms };
}

/**
 * Classifies a companion discussion document.
 *
 * Discussion terms = terms the LLM finds in the discussion body (with the
 * parent post as framing context) ∪ terms mirrored from the parent post.
 *
 *   1. Drop every assignment except `admin` (LLM, backfill and old mirror rows).
 *   2. Propose → match → judge against existing terms only — new terms are
 *      never created from comment text.
 *   3. Re-mirror the parent's terms as `parent_mirror`.
 *
 * Triggered when the discussion body changes (`process-document`) and again
 * whenever the parent post is classified (new parent context + parent terms).
 *
 * The admin-only preservation applies regardless of replaceAllAssignments.
 */
async function classifyDiscussionDocument(
  doc: Document,
): Promise<ClassifyDocumentResult> {
  const parent = await findDiscussionParentDocument({
    workspaceId: doc.workspaceId,
    docType: doc.docType,
    sourceOriginKey: doc.sourceOriginKey,
    sourceItemId: doc.sourceItemId,
    metadata: doc.metadata,
  });
  const parentDocumentId = parent?.id ?? null;

  const eligibleContent = await loadEligibleContent(doc.id);

  const docContext: ClassifierDocContext = {
    title: doc.title,
    rawContent: eligibleContent ?? "",
    docType: doc.docType,
    sourceOriginName: doc.sourceOriginName,
    parentContext: parent
      ? { title: parent.title, rawContent: parent.rawContent }
      : undefined,
  };

  const oldTermIds = await fetchNonAdminTermIds(doc.id);
  await clearNonAdminAssignments(doc.id);

  let assignments: TermAssignment[] = [];

  if (eligibleContent) {
    const match = await proposeAndJudgeTerms(doc.workspaceId, docContext);
    assignments = match.assignments;
    await assignExistingTerms(doc.id, assignments);
  }

  if (parentDocumentId) {
    await syncDiscussionDocumentTerms(parentDocumentId);
  }

  const newTermIds = assignments.map((a) => a.termId);
  const affectedTermIds = [...new Set([...oldTermIds, ...newTermIds])];
  await invalidateAffectedDigests(affectedTermIds, doc.publishedAt, doc.dataSourceId);

  if (newTermIds.length > 0) {
    await assignTermGroupsAfterClassification({
      workspaceId: doc.workspaceId,
      termIds: newTermIds,
      doc: docContext,
    });
  }

  return buildClassifyResultFromDocumentTerms(doc.id);
}

/**
 * After a parent post is classified, re-run classification on its companion
 * discussion (if one exists). Discussion classify remirrors parent terms and
 * re-evaluates the discussion body against the latest parent context.
 */
async function classifyCompanionDiscussionIfPresent(
  parent: Document,
): Promise<void> {
  const discussionDocumentId = await findDiscussionDocumentId({
    workspaceId: parent.workspaceId,
    sourceOriginKey: parent.sourceOriginKey,
    sourceItemId: parent.sourceItemId,
  });

  if (!discussionDocumentId) {
    return;
  }

  await classifyDocument({ documentId: discussionDocumentId });
}

/**
 * Classifies a document into terms using an LLM.
 *
 * Steps:
 *   1. Fetch the document and build the classifier input from its eligible
 *      parts only (text body + media summaries that passed both score
 *      thresholds). When nothing is eligible the document gets no LLM terms.
 *   2. LLM proposes 0..N terms for the document (see proposeAndJudgeTerms).
 *   3. Proposals are embedded; the nearest existing terms become candidates.
 *   4. A judge LLM picks which candidates truly apply → assigned with confidence.
 *   5. Proposals that map to no existing term are auto-created (with their
 *      embedding) when autoCreateTerms is on; an exact name hit is assigned.
 *
 * By default only prior LLM assignments are replaced; admin and backfill
 * assignments are preserved. Set replaceAllAssignments to clear every
 * existing assignment first (used by manual re-classify).
 *
 * Discussion documents take a separate path — see classifyDiscussionDocument.
 * After classifying a parent document, the companion discussion (if any) is
 * classified again so its own terms and parent_mirror rows stay in sync
 * with the latest post content and assignments.
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
    return classifyDiscussionDocument(doc);
  }

  const oldTermIds = replaceAllAssignments
    ? await fetchDocumentTermIds(documentId)
    : await fetchLlmTermIds(documentId);

  if (replaceAllAssignments) {
    await clearAllAssignments(documentId);
  } else {
    await clearLlmAssignments(documentId);
  }

  const eligibleContent = await loadEligibleContent(documentId);

  // Nothing passed the score thresholds — no chunks will exist, so no terms either.
  if (!eligibleContent) {
    await invalidateAffectedDigests(oldTermIds, doc.publishedAt, doc.dataSourceId);
    await classifyCompanionDiscussionIfPresent(doc);
    return { documentId, assignments: [], createdTerms: [] };
  }

  const docContext: ClassifierDocContext = {
    title: doc.title,
    rawContent: eligibleContent,
    docType: doc.docType,
    sourceOriginName: doc.sourceOriginName,
  };

  const [match, llmSettings] = await Promise.all([
    proposeAndJudgeTerms(doc.workspaceId, docContext),
    getWorkspaceLlmSettings(doc.workspaceId),
  ]);

  await assignExistingTerms(documentId, match.assignments);

  const created = llmSettings.autoCreateTerms
    ? await createTermsForUncoveredProposals(doc.workspaceId, documentId, match)
    : { assignments: [], createdTerms: [] };

  const result: ClassifyDocumentResult = {
    documentId,
    assignments: [...match.assignments, ...created.assignments],
    createdTerms: created.createdTerms,
  };

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

  await classifyCompanionDiscussionIfPresent(doc);

  return result;
}
