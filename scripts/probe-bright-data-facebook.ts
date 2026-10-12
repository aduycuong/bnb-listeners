// Probe undocumented Bright Data Facebook dataset behavior before relying on it.
// Calls the Bright Data API directly (no webhook, no workflow, no DB writes) and
// downloads each snapshot. Bright Data bills per delivered record, so the record
// counts printed here are what each run costs. Results go to .local/experiments/.
//
// post-params    run 1: num_of_posts = N
//                run 2: num_of_posts = N, posts_to_not_include = ids from run 1
//                run 3: num_of_posts omitted, limit_multiple_results = --cap
// post-comments  scrape posts by URL (gd_lyclm1571iy3mv57zw) and inspect the
//                embedded `comments` array; --compare also runs the comments
//                dataset on the same posts to measure completeness.
//
// Example:
//   npx tsx scripts/probe-bright-data-facebook.ts post-params --url https://www.facebook.com/groups/reviewbatdongsanaz --yes
//   npx tsx scripts/probe-bright-data-facebook.ts post-comments --post-url <url> --post-url <url> --compare --yes
//   npm run probe:bright-data -- post-comments --post-url <url> --yes

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Command } from "commander";
import { z } from "zod";

import { getBrightDataApiToken } from "@/lib/bright-data/utils/get-bright-data-api-token";
import { parseFacebookSourceUrl } from "@/lib/connectors/facebook/utils/parse-facebook-source-url";
import { isBrightDataErrorRecord } from "@/lib/connectors/utils/is-bright-data-error-record";

const SCRIPT = "probe-bright-data-facebook";
const API = "https://api.brightdata.com/datasets/v3";
const GROUP_POSTS_DATASET_ID = "gd_lz11l67o2cb3r0lkj3";
const PAGE_POSTS_DATASET_ID = "gd_lkaxegm826bjpoo9m5";
const POST_BY_URL_DATASET_ID = "gd_lyclm1571iy3mv57zw";
const COMMENTS_DATASET_ID = "gd_lkay758p1eanlolqw8";
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 45 * 60_000;

type Row = Record<string, unknown>;

type RunResult = {
  label: string;
  snapshotId: string;
  inputs: Row[];
  query: Record<string, string>;
  records: Row[];
  errorRows: Row[];
};

const postParamsOptionsSchema = z.object({
  url: z.string().refine((value) => parseFacebookSourceUrl(value) !== null, {
    message: "--url must be a Facebook group or page URL.",
  }),
  num: z.coerce.number().int().min(1).max(50),
  cap: z.coerce.number().int().min(1).max(200),
  yes: z.boolean(),
});

const postCommentsOptionsSchema = z.object({
  postUrl: z.array(z.url()).min(1).max(10),
  compare: z.boolean(),
  compareLimit: z.coerce.number().int().min(1).max(500),
  yes: z.boolean(),
});

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
  inputs: Row[],
  query: Record<string, string>,
): Promise<string> {
  const url = new URL(`${API}/trigger`);
  url.searchParams.set("dataset_id", datasetId);
  url.searchParams.set("format", "json");
  url.searchParams.set("include_errors", "true");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

  const response = await brightDataFetch(url.toString(), {
    method: "POST",
    body: JSON.stringify(inputs),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Trigger failed (${response.status}): ${text}`);
  }

  return z.object({ snapshot_id: z.string() }).parse(JSON.parse(text)).snapshot_id;
}

async function waitForSnapshot(label: string, snapshotId: string): Promise<Row[]> {
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
      return (Array.isArray(body) ? body : [body]) as Row[];
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`${label}: snapshot ${snapshotId} not ready after ${POLL_TIMEOUT_MS / 60_000} min`);
}

async function runJob(
  label: string,
  datasetId: string,
  inputs: Row[],
  query: Record<string, string> = {},
): Promise<RunResult> {
  const snapshotId = await trigger(datasetId, inputs, query);
  console.log(`[${SCRIPT}] ${label} triggered`, { snapshotId, inputs: inputs.length, query });

  const records = await waitForSnapshot(label, snapshotId);
  return {
    label,
    snapshotId,
    inputs,
    query,
    records,
    errorRows: records.filter(isBrightDataErrorRecord),
  };
}

function okRecords(run: RunResult): Row[] {
  return run.records.filter((record) => !isBrightDataErrorRecord(record));
}

function summarize(run: RunResult) {
  return {
    snapshotId: run.snapshotId,
    deliveredRecords: run.records.length,
    errorRows: run.errorRows.length,
    firstError: run.errorRows[0] ?? null,
  };
}

async function saveReport(name: string, data: unknown): Promise<void> {
  const outDir = path.join(".local", "experiments");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(
    outDir,
    `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(outFile, JSON.stringify(data, null, 2));
  console.log(`[${SCRIPT}] Saved`, { outFile });
}

/** Key → how many objects carry it, recursing into nested arrays of objects. */
function collectKeyShape(rows: unknown[], prefix = "", shape: Record<string, number> = {}) {
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const [key, value] of Object.entries(row)) {
      const name = `${prefix}${key}`;
      shape[name] = (shape[name] ?? 0) + 1;
      if (Array.isArray(value) && value.some((item) => item && typeof item === "object")) {
        collectKeyShape(value, `${name}[].`, shape);
      }
    }
  }
  return shape;
}

function truncateStrings(value: unknown, max = 160): unknown {
  if (typeof value === "string") return value.length > max ? `${value.slice(0, max)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 3).map((item) => truncateStrings(item, max));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, truncateStrings(item, max)]),
    );
  }
  return value;
}

function readPostId(url: string): string | null {
  return url.match(/\/posts\/(\d+)/)?.[1] ?? null;
}

async function postParams(rawOptions: unknown) {
  const options = postParamsOptionsSchema.parse(rawOptions);
  const ref = parseFacebookSourceUrl(options.url)!;
  const datasetId =
    ref.sourceType === "group" ? GROUP_POSTS_DATASET_ID : PAGE_POSTS_DATASET_ID;

  console.log(`[${SCRIPT}] post-params plan`, {
    url: options.url,
    datasetId,
    maxRecords: options.num * 2 + options.cap,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the jobs.`);
    return;
  }

  const baseInput = { url: options.url, start_date: "", end_date: "" };
  const postIds = (run: RunResult) =>
    okRecords(run)
      .map((record) => record.post_id)
      .filter((id): id is string => typeof id === "string");

  const run1 = await runJob("run1", datasetId, [{ ...baseInput, num_of_posts: options.num }]);
  const run1Ids = postIds(run1);

  const [run2, run3] = await Promise.all([
    runJob("run2", datasetId, [
      { ...baseInput, num_of_posts: options.num, posts_to_not_include: run1Ids },
    ]),
    runJob("run3", datasetId, [baseInput], {
      limit_multiple_results: String(options.cap),
    }),
  ]);

  const leaked = postIds(run2).filter((id) => run1Ids.includes(id));
  const report = {
    url: options.url,
    datasetId,
    run1: summarize(run1),
    run2: { ...summarize(run2), excludedIds: run1Ids.length, excludedIdsReturnedAnyway: leaked },
    run3: { ...summarize(run3), cap: options.cap },
    verdict: {
      postsToNotIncludeWorks: run1Ids.length > 0 && leaked.length === 0,
      limitMultipleResultsCaps: run3.records.length <= options.cap,
    },
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-params", { report, raw: { run1, run2, run3 } });
}

async function postComments(rawOptions: unknown) {
  const options = postCommentsOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] post-comments plan`, {
    posts: options.postUrl.length,
    postRecords: options.postUrl.length,
    compareCommentsDataset: options.compare
      ? `up to ${options.compareLimit} records per post`
      : false,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the jobs.`);
    return;
  }

  const [postsRun, commentsRun] = await Promise.all([
    runJob(
      "posts-by-url",
      POST_BY_URL_DATASET_ID,
      options.postUrl.map((url) => ({ url })),
    ),
    options.compare
      ? runJob(
          "comments-dataset",
          COMMENTS_DATASET_ID,
          options.postUrl.map((url) => ({
            url,
            get_all_replies: true,
            limit_records: options.compareLimit,
            comments_sort: "Most relevant",
          })),
        )
      : Promise.resolve(null),
  ]);

  const posts = okRecords(postsRun);
  const embedded = posts.flatMap((post) =>
    Array.isArray(post.comments) ? (post.comments as unknown[]) : [],
  );

  const perPost = posts.map((post) => {
    const comments = Array.isArray(post.comments) ? (post.comments as Row[]) : [];
    const postId = typeof post.post_id === "string" ? post.post_id : null;
    const datasetComments = commentsRun
      ? okRecords(commentsRun).filter((row) => row.post_id === postId)
      : null;

    return {
      postId,
      url: post.url,
      numComments: post.num_comments,
      embeddedComments: comments.length,
      embeddedType: Array.isArray(post.comments) ? "array" : typeof post.comments,
      ...(datasetComments && {
        commentsDatasetRows: datasetComments.length,
        commentsDatasetReplies: datasetComments.filter((row) => row.reply === true).length,
      }),
    };
  });

  const report = {
    posts: summarize(postsRun),
    comments: commentsRun ? summarize(commentsRun) : null,
    perPost,
    missingInputs: options.postUrl.filter(
      (url) => !posts.some((post) => readPostId(String(post.url)) === readPostId(url)),
    ),
    embeddedCommentShape: collectKeyShape(embedded),
    embeddedCommentSamples: truncateStrings(embedded.slice(0, 3)),
    commentsDatasetSample: commentsRun
      ? truncateStrings(okRecords(commentsRun).slice(0, 1))
      : null,
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-post-comments", {
    report,
    raw: { postsRun, commentsRun },
  });
}

async function main() {
  const program = new Command()
    .name(SCRIPT)
    .description("Probe Bright Data Facebook dataset behavior.");

  program
    .command("post-params")
    .description("num_of_posts, posts_to_not_include and limit_multiple_results")
    .requiredOption("--url <url>", "Facebook group or page URL")
    .option("--num <n>", "num_of_posts for runs 1 and 2", "5")
    .option("--cap <n>", "limit_multiple_results for run 3", "20")
    .option("--yes", "Trigger the Bright Data jobs (costs records)", false)
    .action(postParams);

  program
    .command("post-comments")
    .description("Embedded comments of posts scraped by URL")
    .requiredOption(
      "--post-url <url>",
      "Facebook post URL (repeatable)",
      (value: string, previous: string[] = []) => [...previous, value],
    )
    .option("--compare", "Also run the comments dataset on the same posts", false)
    .option("--compare-limit <n>", "limit_records per post for --compare", "200")
    .option("--yes", "Trigger the Bright Data jobs (costs records)", false)
    .action(postComments);

  await program.parseAsync();
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
