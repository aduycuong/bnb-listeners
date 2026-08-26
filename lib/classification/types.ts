export type ClassifyDocumentParams = {
  documentId: string;
};

export type TopicAssignment = {
  topicId: string;
  name: string;
  confidence: number;
};

export type CreatedTopic = {
  id: string;
  name: string;
};

export type ProposedTopic = {
  name: string;
  description: string;
};

export type ClassifyDocumentResult = {
  documentId: string;
  /** Topics assigned from the existing topic list. */
  assignments: TopicAssignment[];
  /** Topics auto-created because no existing topic matched. */
  createdTopics: CreatedTopic[];
};

export type ClassifierTopic = {
  id: string;
  name: string;
  description: string | null;
  parentName: string | null;
};
