// Probe Bright Data TikTok datasets before writing a connector. Calls the Bright
// Data API directly (no webhook, no workflow, no DB writes) and downloads each
// snapshot. Bright Data bills per delivered record, so the record counts printed
// here are what each run costs. Results go to .local/experiments/.
//
// Dataset ids are passed with --dataset (repeatable): the same input is sent to
// every dataset so their fields, record counts and duration can be compared.
//
// profile-posts  profile URL (https://www.tiktok.com/@user) with num_of_posts,
//                optionally start_date = now minus --since-hours (ISO). Reports
//                the field shape, the date range and a sample record per dataset.
// post-by-url    video URLs; reports the field shape and a sample per dataset.
// comments       comments dataset on video URLs; extra input fields via --field,
//                row count capped by --cap, compared with a post-by-url report.
// search-url     Search URL Fast API: keyword in the search URL, start_date /
//                end_date filtering, row order.
// keyword        discover posts by keyword / hashtag: relevance of the results,
//                date range, row order and author spread per keyword.
//
// Example:
//   npx tsx scripts/probe-bright-data-tiktok.ts profile-posts --url https://www.tiktok.com/@mrbeast --dataset gd_xxx --dataset gd_yyy --yes
//   npx tsx scripts/probe-bright-data-tiktok.ts profile-posts --url https://www.tiktok.com/@mrbeast --dataset gd_xxx --since-hours 72 --cap 30 --yes
//   npx tsx scripts/probe-bright-data-tiktok.ts post-by-url --post-url https://www.tiktok.com/@mrbeast/video/7553327774983802143 --dataset gd_zzz --yes

import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Command } from "commander";
import { z } from "zod";

import { getBrightDataApiToken } from "@/lib/bright-data/utils/get-bright-data-api-token";
import { isBrightDataErrorRecord } from "@/lib/connectors/utils/is-bright-data-error-record";

import { commandArgv } from "./script-argv";

const SCRIPT = "probe-bright-data-tiktok";
const API = "https://api.brightdata.com/datasets/v3";
const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 30 * 60_000;

type Row = Record<string, unknown>;

type RunResult = {
  datasetId: string;
  snapshotId: string;
  durationSeconds: number;
  inputs: Row[];
  query: Record<string, string>;
  records: Row[];
  errorRows: Row[];
};

const datasetOption = z.array(z.string().regex(/^gd_\w+$/)).min(1).max(3);
const tiktokUrl = z.url().refine((value) => /(^|\.)tiktok\.com$/.test(new URL(value).hostname), {
  message: "Must be a tiktok.com URL.",
});

const profilePostsOptionsSchema = z.object({
  url: tiktokUrl,
  dataset: datasetOption,
  num: z.coerce.number().int().min(1).max(50).optional(),
  sinceHours: z.coerce.number().min(0.5).max(24 * 30).optional(),
  cap: z.coerce.number().int().min(1).max(200),
  yes: z.boolean(),
});

const postByUrlOptionsSchema = z.object({
  postUrl: z.array(tiktokUrl).min(1).max(10),
  dataset: datasetOption,
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
  datasetId: string,
  inputs: Row[],
  query: Record<string, string> = {},
): Promise<RunResult> {
  const startedAt = Date.now();
  const snapshotId = await trigger(datasetId, inputs, query);
  console.log(`[${SCRIPT}] ${datasetId} triggered`, { snapshotId, inputs: inputs.length, query });

  const records = await waitForSnapshot(datasetId, snapshotId);
  return {
    datasetId,
    snapshotId,
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    inputs,
    query,
    records,
    errorRows: records.filter(isBrightDataErrorRecord),
  };
}

function okRecords(run: RunResult): Row[] {
  return run.records.filter((record) => !isBrightDataErrorRecord(record));
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

/** The date field name is not known up front: take the first key that parses as a date. */
function readPostedAt(record: Row): { key: string; iso: string } | null {
  for (const [key, value] of Object.entries(record)) {
    if (!/(date|time|created)/i.test(key)) continue;
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) continue;
    return { key, iso: new Date(value).toISOString() };
  }
  return null;
}

function summarize(run: RunResult, since?: string) {
  const records = okRecords(run);
  const dated = records.map(readPostedAt).filter((value) => value !== null);
  const isoDates = dated.map((value) => value.iso).sort();

  return {
    datasetId: run.datasetId,
    snapshotId: run.snapshotId,
    durationSeconds: run.durationSeconds,
    deliveredRecords: run.records.length,
    errorRows: run.errorRows.length,
    firstError: run.errorRows[0] ?? null,
    dateKey: dated[0]?.key ?? null,
    oldest: isoDates[0] ?? null,
    newest: isoDates.at(-1) ?? null,
    ...(since && { beforeSince: isoDates.filter((iso) => iso < since).length }),
    keyShape: collectKeyShape(records),
    sample: truncateStrings(records.slice(0, 1)),
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

async function profilePosts(rawOptions: unknown) {
  const options = profilePostsOptionsSchema.parse(rawOptions);
  const since = options.sinceHours
    ? new Date(Date.now() - options.sinceHours * 60 * 60_000).toISOString()
    : undefined;

  console.log(`[${SCRIPT}] profile-posts plan`, {
    url: options.url,
    datasets: options.dataset,
    num_of_posts: options.num,
    start_date: since ?? null,
    maxRecordsPerDataset: options.cap,
    maxRecords: options.cap * options.dataset.length,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the jobs.`);
    return;
  }

  const input = {
    url: options.url,
    ...(options.num !== undefined && { num_of_posts: options.num }),
    ...(since && { start_date: since, end_date: "" }),
  };

  const runs = await Promise.all(
    options.dataset.map(async (datasetId) => {
      try {
        return {
          run: await runJob(datasetId, [input], {
            limit_multiple_results: String(options.cap),
          }),
          error: null,
        };
      } catch (error) {
        return { run: null, datasetId, error: String(error) };
      }
    }),
  );

  const report = {
    input,
    cap: options.cap,
    datasets: runs.map((result) =>
      result.run ? summarize(result.run, since) : result,
    ),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-tiktok-profile-posts", { report, raw: runs });
}

async function postByUrl(rawOptions: unknown) {
  const options = postByUrlOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] post-by-url plan`, {
    datasets: options.dataset,
    posts: options.postUrl.length,
    maxRecords: options.postUrl.length * options.dataset.length,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the jobs.`);
    return;
  }

  const inputs = options.postUrl.map((url) => ({ url }));
  const runs = await Promise.all(
    options.dataset.map(async (datasetId) => {
      try {
        return { run: await runJob(datasetId, inputs), error: null };
      } catch (error) {
        return { run: null, datasetId, error: String(error) };
      }
    }),
  );

  const report = {
    inputs,
    datasets: runs.map((result) => (result.run ? summarize(result.run) : result)),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-tiktok-post-by-url", { report, raw: runs });
}

const commentsOptionsSchema = z.object({
  postUrl: z.array(tiktokUrl).min(1).max(5),
  dataset: z.string().regex(/^gd_\w+$/),
  field: z.array(z.string().regex(/^\w+=.+$/)).default([]),
  cap: z.coerce.number().int().min(1).max(300),
  baseline: z.string().optional(),
  yes: z.boolean(),
});

/** `key=value` → JSON value when it parses (numbers, booleans), else the string. */
function parseField(raw: string): [string, unknown] {
  const index = raw.indexOf("=");
  const value = raw.slice(index + 1);
  try {
    return [raw.slice(0, index), JSON.parse(value)];
  } catch {
    return [raw.slice(0, index), value];
  }
}

function readCommentId(row: Row): string | null {
  const entry = Object.entries(row).find(
    ([key, value]) => /^(comment_id|cid)$/i.test(key) && value != null,
  );
  return entry ? String(entry[1]) : null;
}

/**
 * Comments dataset on video URLs. The input fields beyond `url` are unknown, so
 * extra ones are passed with --field key=value; limit_multiple_results is the
 * hard cost cap. --baseline is a post-by-url report whose embedded comments
 * are compared with the dataset's rows.
 */
async function comments(rawOptions: unknown) {
  const options = commentsOptionsSchema.parse(rawOptions);
  const extra = Object.fromEntries(options.field.map(parseField));

  console.log(`[${SCRIPT}] comments plan`, {
    dataset: options.dataset,
    posts: options.postUrl.length,
    extraInputFields: extra,
    maxRecords: options.cap,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the job.`);
    return;
  }

  const run = await runJob(
    options.dataset,
    options.postUrl.map((url) => ({ url, ...extra })),
    { limit_multiple_results: String(options.cap) },
  );
  const rows = okRecords(run);

  const embeddedIds = new Set<string>();
  if (options.baseline) {
    const baseline = JSON.parse(await readFile(options.baseline, "utf8")) as {
      raw: { run: RunResult | null }[];
    };
    for (const entry of baseline.raw) {
      for (const post of entry.run ? okRecords(entry.run) : []) {
        const embedded = Array.isArray(post.comments) ? (post.comments as Row[]) : [];
        for (const comment of embedded) {
          const id = readCommentId(comment);
          if (id) embeddedIds.add(id);
        }
      }
    }
  }

  const ids = rows.map(readCommentId);
  const report = {
    ...summarize(run),
    extraInputFields: extra,
    cap: options.cap,
    rows: rows.length,
    distinctIds: new Set(ids.filter(Boolean)).size,
    withoutId: ids.filter((id) => !id).length,
    perInputUrl: options.postUrl.map((url) => ({
      url,
      rows: rows.filter((row) => JSON.stringify(row.input ?? {}).includes(url)).length,
    })),
    ...(options.baseline && {
      embeddedInBaseline: embeddedIds.size,
      datasetRowsAlsoEmbedded: ids.filter((id) => id && embeddedIds.has(id)).length,
    }),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-tiktok-comments", { report, raw: { run } });
}

const keywordOptionsSchema = z.object({
  keyword: z.array(z.string().trim().min(1)).min(1).max(5),
  dataset: z.string().regex(/^gd_\w+$/),
  num: z.coerce.number().int().min(1).max(50),
  country: z.string().default(""),
  cap: z.coerce.number().int().min(1).max(200),
  previous: z.string().optional(),
  exclude: z.boolean(),
  yes: z.boolean(),
});

/** keyword → post ids delivered by an earlier `keyword` report. */
async function readPreviousIds(file: string): Promise<Map<string, string[]>> {
  const previous = JSON.parse(await readFile(file, "utf8")) as { raw: { run: RunResult } };
  const byKeyword = new Map<string, string[]>();
  for (const row of okRecords(previous.raw.run)) {
    const term = (row.discovery_input as Row | undefined)?.search_keyword;
    if (typeof term !== "string" || typeof row.post_id !== "string") continue;
    byKeyword.set(term, [...(byKeyword.get(term) ?? []), row.post_id]);
  }
  return byKeyword;
}

function foldVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

/**
 * "Discover by keyword" shares the posts dataset id; the mode is selected by
 * the `type=discover_new&discover_by=keyword` query. Reports, per keyword, how
 * many posts came back, whether the caption mentions the keyword, the date
 * range, the order of the rows and how many distinct authors there are.
 */
async function keyword(rawOptions: unknown) {
  const options = keywordOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] keyword plan`, {
    dataset: options.dataset,
    keywords: options.keyword,
    num_of_posts: options.num,
    country: options.country || null,
    maxRecords: options.cap,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the job.`);
    return;
  }

  const previousIds = options.previous ? await readPreviousIds(options.previous) : null;

  const run = await runJob(
    options.dataset,
    options.keyword.map((search_keyword) => ({
      search_keyword,
      num_of_posts: options.num,
      country: options.country,
      ...(options.exclude && { posts_to_not_include: previousIds?.get(search_keyword) ?? [] }),
    })),
    {
      type: "discover_new",
      discover_by: "keyword",
      limit_multiple_results: String(options.cap),
    },
  );
  const rows = okRecords(run);

  const perKeyword = options.keyword.map((term) => {
    const own = rows.filter((row) => {
      // The keyword comes back under `discovery_input`, not under `input` (a URL).
      const input = row.discovery_input as Row | undefined;
      return input?.search_keyword === term;
    });
    const needle = foldVietnamese(term.replace(/^#/, ""));
    const mentions = own.filter((row) => {
      const text = foldVietnamese(
        `${String(row.description ?? "")} ${((row.hashtags as string[] | undefined) ?? []).join(" ")}`,
      );
      return text.includes(needle);
    });
    const dates = own.map((row) => readPostedAt(row)?.iso).filter((iso): iso is string => !!iso);

    return {
      term,
      rows: own.length,
      captionOrHashtagContainsKeyword: mentions.length,
      ...(previousIds && {
        previousRunPosts: previousIds.get(term)?.length ?? 0,
        alsoInPreviousRun: own.filter((row) => previousIds.get(term)?.includes(String(row.post_id))).length,
        newSincePreviousRun: own.filter((row) => !previousIds.get(term)?.includes(String(row.post_id))).length,
      }),
      distinctAuthors: new Set(own.map((row) => String(row.profile_id ?? row.profile_username))).size,
      oldest: [...dates].sort()[0] ?? null,
      newest: [...dates].sort().at(-1) ?? null,
      sortedNewestFirst: dates.every((iso, index) => index === 0 || iso <= dates[index - 1]),
      createTimeInOrder: dates.map((iso) => iso.slice(0, 10)),
      views: own.map((row) => row.play_count),
    };
  });

  const report = {
    ...summarize(run),
    query: run.query,
    cap: options.cap,
    perKeyword,
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-tiktok-keyword", { report, raw: { run } });
}

const discoverUrlOptionsSchema = z.object({
  url: z.array(tiktokUrl).min(1).max(3),
  dataset: z.string().regex(/^gd_\w+$/),
  cap: z.coerce.number().int().min(1).max(100),
  yes: z.boolean(),
});

/**
 * "Discover by url": a hashtag page or a search URL instead of a keyword. The
 * input fields beyond `url` are unknown, so only `url` is sent; the report shows
 * whether the dates follow the page's order.
 */
async function discoverUrl(rawOptions: unknown) {
  const options = discoverUrlOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] discover-url plan`, {
    dataset: options.dataset,
    urls: options.url,
    maxRecords: options.cap,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the job.`);
    return;
  }

  const run = await runJob(
    options.dataset,
    // This mode rejects `url` and requires the upper-case `URL` field.
    options.url.map((url) => ({ URL: url })),
    {
      type: "discover_new",
      discover_by: "url",
      limit_multiple_results: String(options.cap),
    },
  );
  const report = {
    ...summarize(run),
    query: run.query,
    cap: options.cap,
    dates: okRecords(run).map((row) => readPostedAt(row)?.iso.slice(0, 10) ?? null),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-tiktok-discover-url", { report, raw: { run } });
}

const searchUrlOptionsSchema = z.object({
  query: z.string().trim().min(1),
  dataset: z.string().regex(/^gd_\w+$/),
  num: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  country: z.string().default(""),
  cap: z.coerce.number().int().min(1).max(200),
  /** The `t` (epoch ms) query param seen in TikTok search URLs; meaning to be probed. */
  t: z.string().regex(/^\d{13}$/).optional(),
  yes: z.boolean(),
});

/**
 * Posts by Search URL Fast API: the keyword goes in the search URL's `q`, and
 * start_date / end_date are inputs. The date format is not documented, so it
 * is passed through as typed. The report shows how many posts fall before
 * --start-date and after --end-date, and whether the rows are newest first.
 */
async function searchUrl(rawOptions: unknown) {
  const options = searchUrlOptionsSchema.parse(rawOptions);
  const url =
    `https://www.tiktok.com/search?lang=en&q=${encodeURIComponent(options.query)}` +
    (options.t ? `&t=${options.t}` : "");
  const input = {
    url,
    ...(options.num !== undefined && { num_of_posts: options.num }),
    country: options.country,
    ...(options.startDate && { start_date: options.startDate }),
    ...(options.endDate && { end_date: options.endDate }),
  };

  console.log(`[${SCRIPT}] search-url plan`, {
    dataset: options.dataset,
    input,
    maxRecords: options.cap,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to trigger the job.`);
    return;
  }

  const run = await runJob(options.dataset, [input], {
    limit_multiple_results: String(options.cap),
  });
  const rows = okRecords(run);
  const posted = rows.map((row) => readPostedAt(row)?.iso).filter((iso): iso is string => !!iso);
  const toIsoDay = (value?: string) => {
    if (!value) return null;
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return match ? `${match[3]}-${match[1]}-${match[2]}` : value.slice(0, 10);
  };
  const startDay = toIsoDay(options.startDate);
  const endDay = toIsoDay(options.endDate);

  const report = {
    ...summarize(run),
    input,
    cap: options.cap,
    posts: rows.length,
    distinctPostIds: new Set(rows.map((row) => String(row.post_id))).size,
    // Below the cap and nothing before start_date: the job stopped on its own.
    hitCap: run.records.length >= options.cap,
    beforeStartExact: options.startDate
      ? posted.filter((iso) => iso < new Date(options.startDate!).toISOString()).length
      : null,
    beforeStart: startDay ? posted.filter((iso) => iso.slice(0, 10) < startDay).length : null,
    afterEnd: endDay ? posted.filter((iso) => iso.slice(0, 10) > endDay).length : null,
    newestFirst: posted.every((iso, index) => index === 0 || iso <= posted[index - 1]),
    dates: posted,
    views: rows.map((row) => row.play_count),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("bright-data-tiktok-search-url", { report, raw: { run } });
}

const collect = (value: string, previous: string[] = []) => [...previous, value];

async function main() {
  const program = new Command()
    .name(SCRIPT)
    .description("Probe Bright Data TikTok dataset behavior.");

  program
    .command("profile-posts")
    .description("Posts of a profile URL, compared across datasets")
    .requiredOption("--url <url>", "TikTok profile URL (https://www.tiktok.com/@user)")
    .requiredOption("--dataset <id>", "Bright Data dataset id (repeatable, 1-3)", collect)
    .option("--num <n>", "num_of_posts (omit to let start_date bound the job)")
    .option("--since-hours <n>", "start_date = now minus this many hours (ISO)")
    .option("--cap <n>", "limit_multiple_results per dataset (safety cap)", "30")
    .option("--yes", "Trigger the Bright Data jobs (costs records)", false)
    .action(profilePosts);

  program
    .command("post-by-url")
    .description("Videos by URL, compared across datasets")
    .requiredOption("--post-url <url>", "TikTok video URL (repeatable)", collect)
    .requiredOption("--dataset <id>", "Bright Data dataset id (repeatable, 1-3)", collect)
    .option("--yes", "Trigger the Bright Data jobs (costs records)", false)
    .action(postByUrl);

  program
    .command("comments")
    .description("Comments dataset on video URLs, compared with embedded comments")
    .requiredOption("--post-url <url>", "TikTok video URL (repeatable, 1-5)", collect)
    .requiredOption("--dataset <id>", "Bright Data comments dataset id")
    .option("--field <key=value>", "Extra input field, e.g. comment_limit=20 (repeatable)", collect)
    .option("--cap <n>", "limit_multiple_results (hard cost cap)", "30")
    .option("--baseline <file>", "post-by-url report to compare embedded comments with")
    .option("--yes", "Trigger the Bright Data job (costs records)", false)
    .action(comments);

  program
    .command("keyword")
    .description("Discover posts by keyword or hashtag (same dataset id, discover query)")
    .requiredOption("--keyword <text>", "search_keyword, e.g. vinhomes or #vinhomes (repeatable, 1-5)", collect)
    .requiredOption("--dataset <id>", "Bright Data posts dataset id")
    .option("--num <n>", "num_of_posts per keyword", "10")
    .option("--country <code>", "country input field", "")
    .option("--cap <n>", "limit_multiple_results (hard cost cap)", "30")
    .option("--previous <file>", "earlier keyword report: count posts already seen")
    .option("--exclude", "send the --previous post ids as posts_to_not_include", false)
    .option("--yes", "Trigger the Bright Data job (costs records)", false)
    .action(keyword);

  program
    .command("search-url")
    .description("Posts by Search URL Fast API with start_date / end_date")
    .requiredOption("--query <text>", "search keyword (goes in the search URL q param)")
    .requiredOption("--dataset <id>", "Bright Data Search URL Fast API dataset id")
    .option("--num <n>", "num_of_posts (omit to let start_date bound the job)")
    .option("--start-date <date>", "start_date, passed through as typed")
    .option("--end-date <date>", "end_date, passed through as typed")
    .option("--country <code>", "country input field", "")
    .option("--cap <n>", "limit_multiple_results (hard cost cap)", "20")
    .option("--t <epoch-ms>", "append &t=<epoch ms> to the search URL")
    .option("--yes", "Trigger the Bright Data job (costs records)", false)
    .action(searchUrl);

  program
    .command("discover-url")
    .description("Discover posts from a TikTok hashtag / search URL (discover_by=url)")
    .requiredOption("--url <url>", "TikTok hashtag or search URL (repeatable, 1-3)", collect)
    .requiredOption("--dataset <id>", "Bright Data posts dataset id")
    .option("--cap <n>", "limit_multiple_results (hard cost cap)", "20")
    .option("--yes", "Trigger the Bright Data job (costs records)", false)
    .action(discoverUrl);

  await program.parseAsync(commandArgv());
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
