import { TERM_DUPLICATE_SIMILARITY } from "../config";
import type { ProposalDecision, ProposedTerm } from "../types";
import type { TermCandidate } from "./find-candidate-terms-by-embeddings";
import type { LlmProposalDecision } from "./judge-proposals-with-llm";

export type ResolveProposalDecisionsParams = {
  proposals: ProposedTerm[];
  /** Positionally aligned with `proposals`. */
  embeddings: number[][];
  /** Positionally aligned with `proposals`; best candidate first. */
  candidatesByProposal: TermCandidate[][];
  llmDecisions: LlmProposalDecision[];
};

function toExisting(
  proposalIndex: number,
  candidate: TermCandidate,
  confidence: number,
): ProposalDecision {
  return {
    proposalIndex,
    kind: "existing",
    termId: candidate.term.id,
    name: candidate.term.name,
    confidence,
  };
}

/**
 * Turns raw judge output into one validated decision per proposal.
 *
 * Rules, in order:
 *   - No decision from the judge → skip (never guess).
 *   - `existing` must name a term from that proposal's own candidate list;
 *     an unknown id falls back to the best candidate when it is a near
 *     duplicate, otherwise → skip.
 *   - `new` is overridden to `existing(best)` when the best candidate is at or
 *     above TERM_DUPLICATE_SIMILARITY — an embedding that close means the
 *     proposal is a rename of an existing term, not a new concept.
 *   - `skip` is always respected: the hard rule prevents duplicate terms, it
 *     does not force assignments the judge declined.
 */
export function resolveProposalDecisions(
  params: ResolveProposalDecisionsParams,
): ProposalDecision[] {
  const { proposals, embeddings, candidatesByProposal, llmDecisions } = params;

  // First decision per index wins; later duplicates from the LLM are ignored.
  const decisionByIndex = new Map<number, LlmProposalDecision>();
  for (const decision of llmDecisions) {
    if (!decisionByIndex.has(decision.proposalIndex)) {
      decisionByIndex.set(decision.proposalIndex, decision);
    }
  }

  return proposals.map((proposal, index): ProposalDecision => {
    const candidates = candidatesByProposal[index] ?? [];
    const best = candidates[0];
    const bestIsDuplicate =
      best !== undefined && best.similarity >= TERM_DUPLICATE_SIMILARITY;
    const decision = decisionByIndex.get(index);

    if (!decision || decision.decision === "skip") {
      return { proposalIndex: index, kind: "skip" };
    }

    if (decision.decision === "existing") {
      const chosen = candidates.find((c) => c.term.id === decision.termId);
      if (chosen) {
        return toExisting(index, chosen, decision.confidence);
      }
      if (bestIsDuplicate) {
        return toExisting(index, best, decision.confidence);
      }
      return { proposalIndex: index, kind: "skip" };
    }

    // decision === "new"
    if (bestIsDuplicate) {
      return toExisting(index, best, decision.confidence);
    }

    return {
      proposalIndex: index,
      kind: "new",
      proposal,
      embedding: embeddings[index] ?? null,
      confidence: decision.confidence,
    };
  });
}
