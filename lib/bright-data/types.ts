export type BrightDataScraperInput = Record<string, unknown>;

export type CreateBrightDataScraperJobParams = {
  datasetId: string;
  input: BrightDataScraperInput[];
  webhookUrl: string;
  webhookAuthorization: string;
  includeErrors?: boolean;
  /** Hard cap on delivered records for the whole job (`limit_multiple_results`). */
  limitRecords?: number;
};

export type CreateBrightDataScraperJobResult = {
  snapshotId: string;
};

