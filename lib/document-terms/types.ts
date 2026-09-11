export type DigestPartition = {
  dateKey: string;
  jobId: string;
};

export type AddDocumentTermAssignmentsFromSourcesParams = {
  sourceTermIds: string[];
  targetTermId: string;
};

export type AddDocumentTermAssignmentsFromSourcesResult = {
  documentsAssigned: number;
  partitionsInvalidated: number;
};
