// Probe the TikHub TikTok API before choosing it over Bright Data. Calls TikHub
// directly (no workflow, no DB writes). TikHub bills per request, so the request
// counts printed in each plan are what a run costs. Results go to .local/experiments/.
//
// search      app/v3/fetch_video_search_result: keyword + publish_time window,
//             paged by offset. Reports the date spread, how many posts fall inside
//             the window, row order, how deep offset pages and duplicates.
// user-posts  app/v3/fetch_user_post_videos_v3 (sort_type 0 = latest), paged by
//             max_cursor: row order, pinned posts, where the --since cut-off falls.
// comments    app/v3/fetch_video_comments for one video, then
//             fetch_video_comment_replies for the first comments that have replies.
// video       app/v3/fetch_multi_video: engagement refresh of known video ids.
//
// The API key is read from TIKHUB_API_KEY in .env and never printed.
//
// Example:
//   npx tsx scripts/probe-tikhub-tiktok.ts search --keyword vinhomes --publish-time 1 --region VN --pages 3 --yes
//   npx tsx scripts/probe-tikhub-tiktok.ts user-posts --unique-id cochikimvn --pages 2 --since-hours 96 --yes
//   npx tsx scripts/probe-tikhub-tiktok.ts comments --video-id 7698377048829496583 --pages 1 --reply-comments 2 --yes
//   npx tsx scripts/probe-tikhub-tiktok.ts video --video-id 7698377048829496583 --video-id 7699042880379260168 --yes

import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { z } from "zod";

import { commandArgv } from "./script-argv";

const SCRIPT = "probe-tikhub-tiktok";
const API = "https://api.tikhub.io/api/v1/tiktok/app/v3";
const REQUEST_GAP_MS = 150;

type Row = Record<string, unknown>;

type Call = {
  label: string;
  path: string;
  method: "GET" | "POST";
  query: Record<string, string>;
  status: number;
  durationMs: number;
  body: unknown;
};

function getApiKey(): string {
  const key = process.env.TIKHUB_API_KEY?.trim();
  if (!key) throw new Error("TIKHUB_API_KEY is not set in .env.");
  return key;
}

async function call(
  label: string,
  endpoint: string,
  query: Record<string, string>,
  init?: { method: "POST"; body: unknown },
): Promise<Call> {
  const url = new URL(`${API}/${endpoint}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

  const startedAt = Date.now();
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: init ? JSON.stringify(init.body) : undefined,
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 500);
  }

  const result: Call = {
    label,
    path: endpoint,
    method: init?.method ?? "GET",
    query,
    status: response.status,
    durationMs: Date.now() - startedAt,
    body,
  };
  console.log(`[${SCRIPT}] ${label}`, { status: result.status, ms: result.durationMs });
  await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS));
  return result;
}

function asRow(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null;
}

const KNOWN_LIST_KEYS = [
  "itemList",
  "search_item_list",
  "aweme_list",
  "comments",
  "aweme_details",
  "replies",
];

/**
 * The response shape is not documented: use the known list key of `data` when
 * there is one, else the longest array of objects under it.
 */
function findItems(body: unknown): Row[] {
  const rawData = asRow(body)?.data;
  if (Array.isArray(rawData)) {
    return rawData.map(asRow).filter((row): row is Row => row !== null);
  }

  const data = asRow(rawData);
  for (const key of KNOWN_LIST_KEYS) {
    const list = data?.[key];
    if (Array.isArray(list) && list.length > 0) {
      return list.map(asRow).filter((row): row is Row => row !== null);
    }
  }

  let best: Row[] = [];
  const visit = (value: unknown, depth: number) => {
    if (depth > 4) return;
    if (Array.isArray(value)) {
      const rows = value.map(asRow).filter((row): row is Row => row !== null);
      if (rows.length > best.length) best = rows;
      for (const row of rows.slice(0, 3)) visit(row, depth + 1);
      return;
    }
    const row = asRow(value);
    if (row) for (const child of Object.values(row)) visit(child, depth + 1);
  };
  visit(asRow(body)?.data, 0);
  return best;
}

/** Search results wrap each video in `aweme_info`. */
function unwrap(item: Row): Row {
  return asRow(item.aweme_info) ?? item;
}

function readId(item: Row): string | null {
  const row = unwrap(item);
  const id = row.aweme_id ?? row.id ?? row.item_id;
  return id == null ? null : String(id);
}

function readCreatedAt(item: Row): string | null {
  const row = unwrap(item);
  const raw = row.create_time ?? row.createTime;
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return new Date(value < 1e12 ? value * 1000 : value).toISOString();
}

function envelope(body: unknown) {
  const row = asRow(body) ?? {};
  const data = asRow(row.data);
  return {
    topLevelKeys: Object.keys(row),
    code: row.code ?? null,
    dataKeys: data ? Object.keys(data) : Array.isArray(row.data) ? "array" : typeof row.data,
    hasMore: data ? (data.has_more ?? data.hasMore ?? null) : null,
    cursor: data ? (data.cursor ?? data.max_cursor ?? data.offset ?? null) : null,
    searchId: data ? (data.search_id ?? null) : null,
  };
}

function keyShape(items: Row[]): Record<string, number> {
  const shape: Record<string, number> = {};
  for (const item of items) {
    for (const key of Object.keys(unwrap(item))) shape[key] = (shape[key] ?? 0) + 1;
  }
  return shape;
}

function truncateStrings(value: unknown, max = 140): unknown {
  if (typeof value === "string") return value.length > max ? `${value.slice(0, max)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 3).map((item) => truncateStrings(item, max));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, truncateStrings(item, max)]),
    );
  }
  return value;
}

function summarizePage(call: Call) {
  const items = findItems(call.body);
  const dates = items.map(readCreatedAt).filter((iso): iso is string => !!iso);
  return {
    label: call.label,
    status: call.status,
    ms: call.durationMs,
    items: items.length,
    ids: items.map(readId),
    dates: dates.map((iso) => iso.slice(0, 16)),
    envelope: envelope(call.body),
    ...(call.status >= 400 && { error: truncateStrings(call.body) }),
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

const searchOptionsSchema = z.object({
  keyword: z.string().trim().min(1),
  publishTime: z.coerce.number().int().refine((value) => [0, 1, 7, 30, 90, 180].includes(value)),
  sortType: z.coerce.number().int().min(0).max(1),
  region: z.string().trim().min(2).max(2),
  count: z.coerce.number().int().min(1).max(30),
  pages: z.coerce.number().int().min(1).max(10),
  yes: z.boolean(),
});

async function search(rawOptions: unknown) {
  const options = searchOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] search plan`, { ...options, requests: options.pages, mode: options.yes ? "apply" : "dry-run" });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to send the requests.`);
    return;
  }

  const calls: Call[] = [];
  for (let page = 0; page < options.pages; page++) {
    calls.push(
      await call(`search-page-${page + 1}`, "fetch_video_search_result", {
        keyword: options.keyword,
        offset: String(page * options.count),
        count: String(options.count),
        sort_type: String(options.sortType),
        publish_time: String(options.publishTime),
        region: options.region.toUpperCase(),
      }),
    );
  }

  const items = calls.flatMap((entry) => findItems(entry.body));
  const ids = items.map(readId);
  const dates = items.map(readCreatedAt).filter((iso): iso is string => !!iso).sort();
  const now = Date.now();
  const ageDays = dates.map((iso) => (now - Date.parse(iso)) / 864e5);
  const keyword = options.keyword.toLowerCase();

  const report = {
    request: { ...options, yes: undefined },
    pages: calls.map(summarizePage),
    totals: {
      items: items.length,
      distinctIds: new Set(ids).size,
      oldest: dates[0] ?? null,
      newest: dates.at(-1) ?? null,
      within1d: ageDays.filter((age) => age <= 1).length,
      within7d: ageDays.filter((age) => age <= 7).length,
      within30d: ageDays.filter((age) => age <= 30).length,
      newestFirst: items
        .map(readCreatedAt)
        .filter((iso): iso is string => !!iso)
        .every((iso, index, all) => index === 0 || iso <= all[index - 1]),
      descriptionHasKeyword: items.filter((item) =>
        String(unwrap(item).desc ?? "").toLowerCase().includes(keyword),
      ).length,
    },
    keyShape: keyShape(items),
    sample: truncateStrings(items.slice(0, 1).map(unwrap)),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("tikhub-search", { report, raw: calls });
}

const userPostsOptionsSchema = z.object({
  uniqueId: z.string().trim().min(1),
  sortType: z.coerce.number().int().min(0).max(1),
  count: z.coerce.number().int().min(1).max(30),
  pages: z.coerce.number().int().min(1).max(10),
  sinceHours: z.coerce.number().min(1).max(24 * 60).optional(),
  yes: z.boolean(),
});

async function userPosts(rawOptions: unknown) {
  const options = userPostsOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] user-posts plan`, { ...options, requests: options.pages, mode: options.yes ? "apply" : "dry-run" });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to send the requests.`);
    return;
  }

  const calls: Call[] = [];
  let cursor = "0";
  for (let page = 0; page < options.pages; page++) {
    const entry = await call(`user-posts-page-${page + 1}`, "fetch_user_post_videos_v3", {
      unique_id: options.uniqueId,
      max_cursor: cursor,
      count: String(options.count),
      sort_type: String(options.sortType),
    });
    calls.push(entry);

    const nextCursor = asRow(asRow(entry.body)?.data)?.max_cursor;
    if (nextCursor == null) break;
    cursor = String(nextCursor);
  }

  const items = calls.flatMap((entry) => findItems(entry.body));
  const dates = items.map(readCreatedAt);
  const since = options.sinceHours
    ? new Date(Date.now() - options.sinceHours * 3600_000).toISOString()
    : null;
  const pinned = items.filter((item) => {
    const row = unwrap(item);
    return row.is_top === 1 || row.is_top === true;
  });

  const report = {
    request: { ...options, yes: undefined },
    pages: calls.map(summarizePage),
    totals: {
      items: items.length,
      distinctIds: new Set(items.map(readId)).size,
      pinnedByIsTop: pinned.length,
      pinnedAtIndex: items.flatMap((item, index) =>
        unwrap(item).is_top === 1 || unwrap(item).is_top === true ? [index] : [],
      ),
      newestFirstIgnoringPinned: items
        .filter((item) => !(unwrap(item).is_top === 1 || unwrap(item).is_top === true))
        .map(readCreatedAt)
        .filter((iso): iso is string => !!iso)
        .every((iso, index, all) => index === 0 || iso <= all[index - 1]),
      since,
      afterSince: since ? dates.filter((iso) => iso && iso >= since).length : null,
      firstIndexBeforeSince: since ? dates.findIndex((iso) => iso && iso < since) : null,
    },
    keyShape: keyShape(items),
    sample: truncateStrings(items.slice(0, 1).map(unwrap)),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("tikhub-user-posts", { report, raw: calls });
}

const webUserPostsOptionsSchema = z.object({
  uniqueId: z.string().trim().min(1),
  count: z.coerce.number().int().min(1).max(30),
  maxPages: z.coerce.number().int().min(1).max(10),
  sinceHours: z.coerce.number().min(1).max(24 * 60),
  yes: z.boolean(),
});

/**
 * Channel scan the way a connector would run it: resolve the secUid once, then
 * page `web/fetch_user_post` newest-first and stop at the first post older than
 * the cut-off. Reports where the cut-off falls, pinned posts, and whether the
 * cursor behaves like a timestamp.
 */
async function webUserPosts(rawOptions: unknown) {
  const options = webUserPostsOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] web-user-posts plan`, {
    ...options,
    maxRequests: 1 + options.maxPages,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to send the requests.`);
    return;
  }

  const base = "https://api.tikhub.io/api/v1/tiktok/web";
  const profile = await fetch(`${base}/fetch_user_profile?uniqueId=${encodeURIComponent(options.uniqueId)}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  const profileBody = (await profile.json()) as unknown;
  const secUid = asRow(asRow(asRow(asRow(profileBody)?.data)?.userInfo)?.user)?.secUid;
  if (typeof secUid !== "string") {
    throw new Error(`secUid not found (status ${profile.status}).`);
  }

  const since = new Date(Date.now() - options.sinceHours * 3600_000);
  const calls: Call[] = [];
  const posts: Row[] = [];
  let cursor = "0";
  let stoppedBy = "maxPages";

  for (let page = 0; page < options.maxPages; page++) {
    const entry = await call(`web-user-posts-page-${page + 1}`, "../../web/fetch_user_post", {
      secUid,
      cursor,
      count: String(options.count),
    });
    calls.push(entry);

    const items = findItems(entry.body);
    posts.push(...items);

    const data = asRow(asRow(entry.body)?.data);
    const oldest = items.map(readCreatedAt).filter((iso): iso is string => !!iso).sort()[0];
    if (oldest && new Date(oldest) < since) {
      stoppedBy = "reachedSince";
      break;
    }
    if (!data || data.hasMore === false || data.hasMore === 0 || data.cursor == null) {
      stoppedBy = "noMore";
      break;
    }
    cursor = String(data.cursor);
  }

  const dates = posts.map(readCreatedAt);
  const inWindow = dates.filter((iso) => iso && new Date(iso) >= since).length;
  const ids = posts.map(readId);
  const pinKeys = [
    ...new Set(
      posts.flatMap((post) => Object.keys(post).filter((key) => /pin|top/i.test(key))),
    ),
  ];

  const report = {
    request: { ...options, yes: undefined },
    secUidResolved: true,
    since: since.toISOString(),
    stoppedBy,
    requests: 1 + calls.length,
    pages: calls.map((entry) => ({
      ...summarizePage(entry),
      cursorSent: entry.query.cursor,
      nextCursor: asRow(asRow(entry.body)?.data)?.cursor ?? null,
      hasMore: asRow(asRow(entry.body)?.data)?.hasMore ?? null,
    })),
    totals: {
      posts: posts.length,
      distinctIds: new Set(ids).size,
      inWindow,
      beforeSince: dates.filter((iso) => iso && new Date(iso) < since).length,
      firstIndexBeforeSince: dates.findIndex((iso) => iso && new Date(iso) < since),
      newestFirst: dates
        .filter((iso): iso is string => !!iso)
        .every((iso, index, all) => index === 0 || iso <= all[index - 1]),
      pinKeysSeen: pinKeys,
      pinnedValues: posts
        .filter((post) => pinKeys.some((key) => post[key] === true || post[key] === 1))
        .map((post) => ({ id: readId(post), createdAt: readCreatedAt(post) })),
    },
    keyShape: Object.fromEntries(
      Object.entries(
        posts.reduce<Record<string, number>>((shape, post) => {
          for (const key of Object.keys(post)) shape[key] = (shape[key] ?? 0) + 1;
          return shape;
        }, {}),
      ).slice(0, 80),
    ),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("tikhub-web-user-posts", { report, raw: calls });
}

const commentsOptionsSchema = z.object({
  videoId: z.string().regex(/^\d+$/),
  pages: z.coerce.number().int().min(1).max(5),
  count: z.coerce.number().int().min(1).max(50),
  replyComments: z.coerce.number().int().min(0).max(5),
  yes: z.boolean(),
});

async function comments(rawOptions: unknown) {
  const options = commentsOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] comments plan`, {
    ...options,
    maxRequests: options.pages + options.replyComments,
    mode: options.yes ? "apply" : "dry-run",
  });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to send the requests.`);
    return;
  }

  const pages: Call[] = [];
  let cursor = "0";
  for (let page = 0; page < options.pages; page++) {
    const entry = await call(`comments-page-${page + 1}`, "fetch_video_comments", {
      aweme_id: options.videoId,
      cursor,
      count: String(options.count),
    });
    pages.push(entry);

    const data = asRow(asRow(entry.body)?.data);
    if (!data || data.has_more === 0 || data.has_more === false || data.cursor == null) break;
    cursor = String(data.cursor);
  }

  const comments = pages.flatMap((entry) => findItems(entry.body));
  const withReplies = comments.filter((comment) => Number(comment.reply_comment_total ?? 0) > 0);
  const replyCalls: Call[] = [];
  for (const comment of withReplies.slice(0, options.replyComments)) {
    replyCalls.push(
      await call(`replies-${String(comment.cid)}`, "fetch_video_comment_replies", {
        item_id: options.videoId,
        comment_id: String(comment.cid),
        cursor: "0",
        count: String(options.count),
      }),
    );
  }

  const report = {
    request: { ...options, yes: undefined },
    pages: pages.map(summarizePage),
    totals: {
      comments: comments.length,
      distinctCommentIds: new Set(comments.map((comment) => String(comment.cid))).size,
      withReplyCount: withReplies.length,
      sumReplyCommentTotal: comments.reduce(
        (sum, comment) => sum + Number(comment.reply_comment_total ?? 0),
        0,
      ),
    },
    replies: replyCalls.map((entry) => ({
      ...summarizePage(entry),
      expected: withReplies.find((comment) => String(comment.cid) === entry.label.slice(8))
        ?.reply_comment_total,
    })),
    commentKeyShape: keyShape(comments),
    commentSample: truncateStrings(comments.slice(0, 1)),
    replySample: truncateStrings(replyCalls.flatMap((entry) => findItems(entry.body)).slice(0, 1)),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("tikhub-comments", { report, raw: { pages, replyCalls } });
}

const videoOptionsSchema = z.object({
  videoId: z.array(z.string().regex(/^\d+$/)).min(1).max(20),
  yes: z.boolean(),
});

async function video(rawOptions: unknown) {
  const options = videoOptionsSchema.parse(rawOptions);

  console.log(`[${SCRIPT}] video plan`, { videos: options.videoId.length, requests: 1, mode: options.yes ? "apply" : "dry-run" });
  if (!options.yes) {
    console.log(`[${SCRIPT}] Dry run; pass --yes to send the request.`);
    return;
  }

  const entry = await call("multi-video", "fetch_multi_video", {}, {
    method: "POST",
    body: options.videoId,
  });
  const items = findItems(entry.body);

  const report = {
    request: { videoIds: options.videoId },
    page: summarizePage(entry),
    returnedIds: items.map(readId),
    missing: options.videoId.filter((id) => !items.some((item) => readId(item) === id)),
    keyShape: keyShape(items),
    sample: truncateStrings(items.slice(0, 1).map(unwrap)),
  };

  console.log(`[${SCRIPT}] Report`, JSON.stringify(report, null, 2));
  await saveReport("tikhub-video", { report, raw: entry });
}

const collect = (value: string, previous: string[] = []) => [...previous, value];

async function main() {
  const program = new Command().name(SCRIPT).description("Probe TikHub TikTok API behavior.");

  program
    .command("search")
    .description("Video search with a publish_time window, paged by offset")
    .requiredOption("--keyword <text>", "search keyword")
    .option("--publish-time <days>", "0 unlimited, 1, 7, 30, 90 or 180 days", "1")
    .option("--sort-type <n>", "0 relevance, 1 most likes", "0")
    .option("--region <code>", "ISO country code, e.g. VN or US", "VN")
    .option("--count <n>", "items per page", "20")
    .option("--pages <n>", "pages to request (one request each)", "3")
    .option("--yes", "Send the requests (billed per request)", false)
    .action(search);

  program
    .command("user-posts")
    .description("User posts, latest first, paged by max_cursor")
    .requiredOption("--unique-id <username>", "TikTok username without @")
    .option("--sort-type <n>", "0 latest, 1 hot", "0")
    .option("--count <n>", "items per page", "20")
    .option("--pages <n>", "pages to request (one request each)", "2")
    .option("--since-hours <n>", "report where posts older than now minus this many hours begin")
    .option("--yes", "Send the requests (billed per request)", false)
    .action(userPosts);

  program
    .command("web-user-posts")
    .description("Channel scan: secUid, then web/fetch_user_post newest-first until --since-hours")
    .requiredOption("--unique-id <username>", "TikTok username without @")
    .option("--since-hours <n>", "stop at the first post older than now minus this", "240")
    .option("--count <n>", "items per page requested", "20")
    .option("--max-pages <n>", "page limit (one request each, plus one for the profile)", "5")
    .option("--yes", "Send the requests (billed per request)", false)
    .action(webUserPosts);

  program
    .command("comments")
    .description("Video comments, then replies of the first comments that have replies")
    .requiredOption("--video-id <id>", "TikTok video id (aweme_id)")
    .option("--pages <n>", "comment pages to request", "1")
    .option("--count <n>", "items per page", "20")
    .option("--reply-comments <n>", "how many comments to fetch replies for", "2")
    .option("--yes", "Send the requests (billed per request)", false)
    .action(comments);

  program
    .command("video")
    .description("Batch video details by id (engagement refresh)")
    .requiredOption("--video-id <id>", "TikTok video id (repeatable)", collect)
    .option("--yes", "Send the request (billed per request)", false)
    .action(video);

  await program.parseAsync(commandArgv());
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error: error instanceof Error ? error.message : error });
  process.exit(1);
});
