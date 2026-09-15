export type DigestPartition = {
  dateKey: string;
  dataSourceId: string;
};

export type AddDocumentTermAssignmentsFromSourcesParams = {
  sourceTermIds: string[];
  targetTermId: string;
};

export type AddDocumentTermAssignmentsFromSourcesResult = {
  documentsAssigned: number;
  partitionsInvalidated: number;
};
