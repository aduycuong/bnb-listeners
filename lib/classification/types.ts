export type ClassifyDocumentParams = {
  documentId: string;
  /** When true, remove every existing term assignment before re-classifying. */
  replaceAllAssignments?: boolean;
};

export type TermAssignment = {
  termId: string;
  name: string;
  confidence: number;
};

export type CreatedTerm = {
  id: string;
  name: string;
};

export type ProposedTerm = {
  name: string;
  description: string;
};

/** One of the workspace's most-used terms, shown to the propose step. */
export type TermVocabularyHint = {
  name: string;
  description: string | null;
};

/**
 * Final, validated outcome for one LLM proposal after the judge step and the
 * duplicate-similarity hard rule. `proposalIndex` points back into the
 * proposal list so every decision is traceable.
 */
export type ProposalDecision =
  | {
      proposalIndex: number;
      kind: "existing";
      termId: string;
      name: string;
      confidence: number;
    }
  | {
      proposalIndex: number;
      kind: "new";
      proposal: ProposedTerm;
      /** Embedding of the proposal, reused when the term is created. */
      embedding: number[] | null;
      confidence: number;
    }
  | {
      proposalIndex: number;
      kind: "skip";
    };

export type ClassifyDocumentResult = {
  documentId: string;
  /** Terms assigned from the existing term list. */
  assignments: TermAssignment[];
  /** Terms auto-created from LLM proposals (0..N per document). */
  createdTerms: CreatedTerm[];
};

/** Document fields sent to the classifier LLM. */
export type ClassifierDocContext = {
  title: string | null;
  rawContent: string;
  docType: string;
  sourceOriginName: string;
  /**
   * Parent post of a discussion document. Sent as framing context only —
   * the LLM classifies the discussion body, not the parent.
   */
  parentContext?: {
    title: string | null;
    rawContent: string;
  };
};

export type ClassifierTerm = {
  id: string;
  name: string;
  description: string | null;
};
