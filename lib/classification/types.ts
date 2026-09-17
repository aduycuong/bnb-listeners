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

export type ClassifiedTermForGroups = {
  id: string;
  name: string;
  description: string | null;
};
