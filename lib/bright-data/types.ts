export type BrightDataScraperInput = Record<string, unknown>;

export type CreateBrightDataScraperJobParams = {
  datasetId: string;
  input: BrightDataScraperInput[];
  webhookUrl: string;
  webhookAuthorization: string;
  includeErrors?: boolean;
};

export type CreateBrightDataScraperJobResult = {
  snapshotId: string;
};
