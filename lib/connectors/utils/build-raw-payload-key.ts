type BuildRawPayloadKeyParams = {
  platform: string;
  connector: string;
  collectRunId: string;
  createdAt: Date;
};

/** L0 archive object key: `raw/{platform}/{connector}/{yyyy}/{mm}/{dd}/{collect_run_id}.json` (UTC date). */
export function buildRawPayloadKey(params: BuildRawPayloadKeyParams): string {
  const yyyy = params.createdAt.getUTCFullYear();
  const mm = String(params.createdAt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(params.createdAt.getUTCDate()).padStart(2, "0");

  return `raw/${params.platform}/${params.connector}/${yyyy}/${mm}/${dd}/${params.collectRunId}.json`;
}
