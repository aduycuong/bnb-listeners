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

export type GetBrightDataSnapshotProgressParams = {
  snapshotId: string;
};

export type BrightDataSnapshotStatus = "running" | "ready" | "failed";

export type GetBrightDataSnapshotProgressResult = {
  status: BrightDataSnapshotStatus;
  records: number | null;
  error: string | null;
};

export type DownloadBrightDataSnapshotParams = {
  snapshotId: string;
};

export type DownloadBrightDataSnapshotResult =
  | { ready: false }
  | { ready: true; body: string };
