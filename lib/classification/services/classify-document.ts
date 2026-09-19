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

import type {
  ClassifierDocContext,
  ClassifyDocumentParams,
  ClassifyDocumentResult,
  CreatedTerm,
  ProposalDecision,
  ProposedTerm,
  TermAssignment,
} from "../types";
import { buildClassifierContentFromParts } from "../utils/build-classifier-content-from-parts";
import { createAutoTerm } from "../utils/create-auto-term";
import { findCandidateTermsByEmbeddings } from "../utils/find-candidate-terms-by-embeddings";
import { judgeProposalsWithLlm } from "../utils/judge-proposals-with-llm";
import { loadTermVocabularyHint } from "../utils/load-term-vocabulary-hint";
import { proposeTermsWithLlm } from "../utils/propose-term-with-llm";
import { resolveProposalDecisions } from "../utils/resolve-proposal-decisions";

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

/**
 * Shared front half of classification:
 *
 *   1. LLM proposes the terms it would tag the document with (guided by the
 *      workspace's most-used terms — names and descriptions).
 *   2. Proposals are embedded and the nearest existing terms are retrieved
 *      per proposal — a short candidate list instead of the whole workspace.
 *   3. The judge LLM sees each proposal together with its own candidates and
 *      the document, and decides per proposal: assign an existing candidate,
 *      create a new term, or skip.
 *   4. Raw judge output is validated (ids must come from the proposal's own
 *      candidates) and the duplicate-similarity hard rule is applied.
 *
 * Nothing is written here; callers assign and (optionally) create.
 */
async function proposeAndJudgeTerms(
  workspaceId: string,
  docContext: ClassifierDocContext,
): Promise<ProposalDecision[]> {
  const [proposePrompt, judgePrompt, vocabularyHint] = await Promise.all([
    resolveWorkspaceSystemPrompt(workspaceId, "propose_term"),
    resolveWorkspaceSystemPrompt(workspaceId, "classify_terms"),
    loadTermVocabularyHint(workspaceId),
  ]);

  const proposals = dedupeProposals(
    await proposeTermsWithLlm(docContext, proposePrompt, vocabularyHint),
  );

  if (proposals.length === 0) {
    return [];
  }

  const embeddings = await embedTermTexts(
    proposals.map(buildTermEmbeddingText),
  );
  const candidatesByProposal = await findCandidateTermsByEmbeddings(
    workspaceId,
    embeddings,
  );

  const llmDecisions = await judgeProposalsWithLlm(
    docContext,
    proposals.map((proposal, index) => ({
      proposal,
      candidates: candidatesByProposal[index] ?? [],
    })),
    judgePrompt,
  );

  return resolveProposalDecisions({
    proposals,
    embeddings,
    candidatesByProposal,
    llmDecisions,
  });
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
 * Existing-term assignments from the decisions, one row per term. Several
 * proposals may resolve to the same term; the highest confidence wins.
 */
function collectExistingAssignments(
  decisions: ProposalDecision[],
): TermAssignment[] {
  const byTermId = new Map<string, TermAssignment>();

  for (const decision of decisions) {
    if (decision.kind !== "existing") continue;

    const previous = byTermId.get(decision.termId);
    if (!previous || previous.confidence < decision.confidence) {
      byTermId.set(decision.termId, {
        termId: decision.termId,
        name: decision.name,
        confidence: decision.confidence,
      });
    }
  }

  return [...byTermId.values()];
}

/**
 * Materialises `new` decisions. An exact name hit (e.g. a term without an
 * embedding yet, so it was never a candidate) is assigned instead of created;
 * otherwise the term is created with the proposal's embedding and assigned.
 */
async function createTermsForNewDecisions(
  workspaceId: string,
  documentId: string,
  decisions: ProposalDecision[],
  alreadyAssignedTermIds: Set<string>,
): Promise<{ assignments: TermAssignment[]; createdTerms: CreatedTerm[] }> {
  const assignedTermIds = new Set(alreadyAssignedTermIds);
  const assignments: TermAssignment[] = [];
  const createdTerms: CreatedTerm[] = [];

  for (const decision of decisions) {
    if (decision.kind !== "new") continue;

    const existing = await findTermByName(workspaceId, decision.proposal.name);
    if (existing) {
      if (!assignedTermIds.has(existing.id)) {
        assignedTermIds.add(existing.id);
        assignments.push({
          termId: existing.id,
          name: existing.name,
          confidence: decision.confidence,
        });
      }
      continue;
    }

    const createdTerm = await createAutoTerm(
      workspaceId,
      documentId,
      decision.proposal,
      decision.embedding,
      decision.confidence,
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
    parentDocumentId: doc.parentDocumentId,
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
    const decisions = await proposeAndJudgeTerms(doc.workspaceId, docContext);
    // `new` decisions are dropped: terms are never created from comment text.
    assignments = collectExistingAssignments(decisions);
    await assignExistingTerms(doc.id, assignments);
  }

  if (parentDocumentId) {
    await syncDiscussionDocumentTerms(parentDocumentId);
  }

  const newTermIds = assignments.map((a) => a.termId);
  const affectedTermIds = [...new Set([...oldTermIds, ...newTermIds])];
  await invalidateAffectedDigests(affectedTermIds, doc.publishedAt, doc.dataSourceId);

  // No term-group step here: discussions never create terms, and only
  // freshly created terms are evaluated against groups.
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
 *   4. A judge LLM decides per proposal: existing (assign a candidate), new,
 *      or skip — with a confidence. A near-duplicate best candidate
 *      (≥ TERM_DUPLICATE_SIMILARITY) always wins over `new`.
 *   5. `new` decisions are auto-created (with their embedding) when
 *      autoCreateTerms is on; an exact name hit is assigned instead.
 *   6. Freshly created terms are evaluated against the workspace's term
 *      groups (same agent + web research + confidence threshold as the
 *      member rebuild). Existing terms are not re-evaluated here.
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

  const [decisions, llmSettings] = await Promise.all([
    proposeAndJudgeTerms(doc.workspaceId, docContext),
    getWorkspaceLlmSettings(doc.workspaceId),
  ]);

  const existingAssignments = collectExistingAssignments(decisions);
  await assignExistingTerms(documentId, existingAssignments);

  // With auto-create off, `new` decisions are dropped.
  const created = llmSettings.autoCreateTerms
    ? await createTermsForNewDecisions(
        doc.workspaceId,
        documentId,
        decisions,
        new Set(existingAssignments.map((a) => a.termId)),
      )
    : { assignments: [], createdTerms: [] };

  const result: ClassifyDocumentResult = {
    documentId,
    assignments: [...existingAssignments, ...created.assignments],
    createdTerms: created.createdTerms,
  };

  // Invalidate daily digest rows for every term whose doc count changed.
  const createdTermIds = result.createdTerms.map((t) => t.id);
  const newTermIds = [
    ...result.assignments.map((a) => a.termId),
    ...createdTermIds,
  ];
  const affectedTermIds = [...new Set([...oldTermIds, ...newTermIds])];
  await invalidateAffectedDigests(affectedTermIds, doc.publishedAt, doc.dataSourceId);

  // Only freshly created terms get evaluated against term groups — existing
  // terms already went through this when they were created (or are curated
  // via admin / member rebuild).
  if (createdTermIds.length > 0) {
    await assignTermGroupsAfterClassification({
      workspaceId: doc.workspaceId,
      termIds: createdTermIds,
    });
  }

  await classifyCompanionDiscussionIfPresent(doc);

  return result;
}
