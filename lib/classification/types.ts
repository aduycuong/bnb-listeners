export type ClassifyDocumentParams = {
  documentId: string;
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
