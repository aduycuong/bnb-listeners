export type DigestPartition = {
  dateKey: string;
  jobId: string;
};

export type AddDocumentTopicAssignmentsFromSourcesParams = {
  sourceTopicIds: string[];
  targetTopicId: string;
};

export type AddDocumentTopicAssignmentsFromSourcesResult = {
  documentsAssigned: number;
  partitionsInvalidated: number;
};
