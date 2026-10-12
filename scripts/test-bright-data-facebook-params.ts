// Probe undocumented Bright Data Facebook post-dataset behavior before relying on it:
//   run 1  num_of_posts = N
//   run 2  num_of_posts = N, posts_to_not_include = the ids from run 1
//   run 3  num_of_posts omitted, limit_multiple_results = --cap
// Calls the Bright Data API directly (no webhook, no workflow, no DB writes) and
// downloads each snapshot. Bright Data bills per delivered record, so the
// record counts printed here are what each run costs.
// Results are saved to .local/experiments/ (git-ignored).
//
// Example:
//   npx tsx scripts/test-bright-data-facebook-params.ts --url https://www.facebook.com/groups/reviewbatdongsanaz
//   npx tsx scripts/test-bright-data-facebook-params.ts --url https://www.facebook.com/groups/reviewbatdongsanaz --yes
//   npm run test:bright-data-params -- --url https://www.facebook.com/somepage --num 5 --cap 20 --yes

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Command } from "commander";
import { z } from "zod";

import { getBrightDataApiToken } from "@/lib/bright-data/utils/get-bright-data-api-token";
import { parseFacebookSourceUrl } from "@/lib/connectors/facebook/utils/parse-facebook-source-url";
import { isBrightDataErrorRecord } from "@/lib/connectors/utils/is-bright-data-error-record";

const SCRIPT = "test-bright-data-facebook-params";
const API = "https://api.brightdata.com/datasets/v3";
const GROUP_POSTS_DATASET_ID = "gd_lz11l67o2cb3r0lkj3";
const PAGE_POSTS_DATASET_ID = "gd_lkaxegm826bjpoo9m5";
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 45 * 60_000;

const optionsSchema = z.object({
  url: z.string().refine((value) => parseFacebookSourceUrl(value) !== null, {
    message: "--url must be a Facebook group or page URL.",
  }),
  num: z.coerce.number().int().min(1).max(50),
  cap: z.coerce.number().int().min(1).max(200),
  yes: z.boolean(),
});

type Options = z.infer<typeof optionsSchema>;

type RunResult = {
  label: string;
  snapshotId: string;
  input: Record<string, unknown>;
  query: Record<string, string>;
  records: unknown[];
  postIds: string[];
  errorRows: unknown[];
};

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Probe num_of_posts, posts_to_not_include and limit_multiple_results.")
    .requiredOption("--url <url>", "Facebook group or page URL")
    .option("--num <n>", "num_of_posts for runs 1 and 2", "5")
    .option("--cap <n>", "limit_multiple_results for run 3", "20")
    .option("--yes", "Trigger the Bright Data jobs (costs records)", false);

  program.parse();
  return optionsSchema.parse(program.opts());
}

async function brightDataFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getBrightDataApiToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

async function trigger(
  datasetId: string,
  input: Record<string, unknown>,
  query: Record<string, string>,
): Promise<string> {
  const url = new URL(`${API}/trigger`);
  url.searchParams.set("dataset_id", datasetId);
  url.searchParams.set("format", "json");
  url.searchParams.set("include_errors", "true");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

  const response = await brightDataFetch(url.toString(), {
    method: "POST",
    body: JSON.stringify([input]),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Trigger failed (${response.status}): ${text}`);
  }

  return z.object({ snapshot_id: z.string() }).parse(JSON.parse(text)).snapshot_id;
}

async function waitForSnapshot(label: string, snapshotId: string): Promise<unknown[]> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await brightDataFetch(`${API}/progress/${snapshotId}`);
    const progress = (await response.json()) as { status?: string; records?: number };
    console.log(`[${SCRIPT}] ${label} progress`, { snapshotId, ...progress });

    if (progress.status === "failed") {
      throw new Error(`${label}: snapshot ${snapshotId} failed`);
    }

    if (progress.status === "ready") {
      const download = await brightDataFetch(`${API}/snapshot/${snapshotId}?format=json`);
      if (download.status === 202) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      if (!download.ok) {
        throw new Error(`${label}: download failed (${download.status}): ${await download.text()}`);
      }
      const body: unknown = await download.json();
      return Array.isArray(body) ? body : [body];
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`${label}: snapshot ${snapshotId} not ready after ${POLL_TIMEOUT_MS / 60_000} min`);
}

async function runExperiment(
  label: string,
  datasetId: string,
  input: Record<string, unknown>,
  query: Record<string, string> = {},
): Promise<RunResult> {
  const snapshotId = await trigger(datasetId, input, query);
  console.log(`[${SCRIPT}] ${label} triggered`, { snapshotId, input, query });

  const records = await waitForSnapshot(label, snapshotId);
  const errorRows = records.filter(isBrightDataErrorRecord);
  const postIds = records
    .filter((record) => !isBrightDataErrorRecord(record))
    .map((record) => (record as { post_id?: unknown }).post_id)
    .filter((id): id is string => typeof id === "string");

  return { label, snapshotId, input, query, records, postIds, errorRows };
}

function summarize(run: RunResult) {
  return {
    snapshotId: run.snapshotId,
    deliveredRecords: run.records.length,
    posts: run.postIds.length,
    errorRows: run.errorRows.length,
    firstError: run.errorRows[0] ?? null,
  };
}

async function main() {
  const options = parseArgs();
  const ref = parseFacebookSourceUrl(options.url)!;
  const datasetId =
    ref.sourceType === "group" ? GROUP_POSTS_DATASET_ID : PAGE_POSTS_DATASET_ID;

  console.log(`[${SCRIPT}] Plan`, {
    url: options.url,
    datasetId,
    run1: { num_of_posts: options.num },
    run2: { num_of_posts: options.num, posts_to_not_include: "ids from run 1" },
    run3: { num_of_posts: "omitted", limit_multiple_results: options.cap },
    maxRecords: options.num * 2 + options.cap,
    mode: options.yes ? "apply" : "dry-run",
  });

  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the jobs.`);
    return;
  }

  const baseInput = { url: options.url, start_date: "", end_date: "" };

  const run1 = await runExperiment("run1", datasetId, {
    ...baseInput,
    num_of_posts: options.num,
  });

  const [run2, run3] = await Promise.all([
    runExperiment("run2", datasetId, {
      ...baseInput,
      num_of_posts: options.num,
      posts_to_not_include: run1.postIds,
    }),
    runExperiment("run3", datasetId, baseInput, {
      limit_multiple_results: String(options.cap),
    }),
  ]);

  const excluded = new Set(run1.postIds);
  const leaked = run2.postIds.filter((id) => excluded.has(id));

  const report = {
    url: options.url,
    datasetId,
    ranAt: new Date().toISOString(),
    run1: summarize(run1),
    run2: {
      ...summarize(run2),
      excludedIds: run1.postIds.length,
      excludedIdsReturnedAnyway: leaked,
      newPostIds: run2.postIds.filter((id) => !excluded.has(id)).length,
    },
    run3: { ...summarize(run3), cap: options.cap },
    verdict: {
      postsToNotIncludeWorks: run1.postIds.length > 0 && leaked.length === 0,
      limitMultipleResultsCaps: run3.records.length <= options.cap,
    },
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));

  const outDir = path.join(".local", "experiments");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `bright-data-params-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(
    outFile,
    JSON.stringify({ report, raw: { run1, run2, run3 } }, null, 2),
  );
  console.log(`[${SCRIPT}] Saved`, { outFile });
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
