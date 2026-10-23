// Manual test of the LLM transcript correction (D22) with the real model.
// Read-only: nothing is written to the DB. Run it after changing the prompt,
// the model or the similarity threshold.
//
//   --cases       built-in cases from real videos (misheard names to fix, and
//                 look-alike names that must stay); prints PASS / FAIL
//   --text/--file one transcript, against --name terms or a --project's entities
//   --video-id    a stored TikTok video: corrects its recognized text again
//                 against its source's names and shows the stored correction
//
// Example:
//   npm run test:transcript-correction -- -- --cases
//   npm run test:transcript-correction -- -- --cases --model gpt-5.5
//   npx tsx scripts/test-transcript-correction.ts --text "mở bán chelia vita giá 68 triệu" --name "Trellia Vista"
//   npx tsx scripts/test-transcript-correction.ts --file ./transcript.txt --name "TT Genesis|T&T Genesis" --name "Trellia Vista"
//   npx tsx scripts/test-transcript-correction.ts --file ./transcript.txt --project <uuid>
//   npx tsx scripts/test-transcript-correction.ts --video-id 7689790613901823250

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { type ContentItemMedia, contentItems, projectEntities } from "@/db/schema";
import { db } from "@/lib/db";
import { type ChatModelId, chatModelIdSchema } from "@/lib/langchain";
import { TRANSCRIPT_CORRECTION_CONFIG } from "@/lib/transcripts/config";
import { correctTranscript } from "@/lib/transcripts/services/correct-transcript";
import { loadSourceGlossaries } from "@/lib/transcripts/services/load-source-glossaries";
import type { TranscriptGlossaryTerm } from "@/lib/transcripts/types";
import { nameSimilarity } from "@/lib/transcripts/utils/name-similarity";

import { commandArgv } from "./script-argv";

const SCRIPT = "test-transcript-correction";
const CONTEXT_CHARS = 60;

/** Glossary of the built-in cases: the entities of the TT Genesis / Trellia Vista project. */
const CASE_GLOSSARY: TranscriptGlossaryTerm[] = [
  { name: "TT Genesis", aliases: ["T&T Genesis"] },
  { name: "Trellia Vista", aliases: [] },
];

type Case = {
  title: string;
  transcript: string;
  mustContain?: string[];
  mustNotContain?: string[];
  unchanged?: boolean;
};

/** Excerpts of real transcripts (probes of 2026-10-22), shortened. */
const CASES: Case[] = [
  {
    title: "misheard project name is fixed",
    transcript: "hôm nay mình đi xem chelia vita giá chỉ từ 68.000.000 trên mét vuông thanh toán 30% là nhận nhà",
    mustContain: ["Trellia Vista", "68.000.000", "30%"],
    mustNotContain: ["chelia vita"],
  },
  {
    title: "several spellings in one transcript",
    transcript: "Celia VITA là tòa tháp đẹp nhất, anh chị quan tâm chelia Vista thì inbox em nha, Chela Vista đang nhận booking",
    mustContain: ["Trellia Vista"],
    mustNotContain: ["Celia VITA", "chelia Vista", "Chela Vista"],
  },
  {
    title: "Trellia Cove (another subdivision) stays",
    transcript: "phân khu treleco đã cất nóc cả BA tòa tháp và anh chị mua treleco thời điểm này thì nhận nhà sớm",
    mustContain: ["treleco"],
    mustNotContain: ["Trellia Vista"],
  },
  {
    title: "a different project with a similar name stays",
    transcript: "đây là dự án the Park Vista dự án này là do chủ đầu tư đông mê công làm chủ đầu tư",
    mustContain: ["the Park Vista"],
    mustNotContain: ["Trellia Vista"],
  },
  {
    title: "an unrelated word is not turned into a name",
    transcript: "à đây là thực tế cái sảnh của Australia đây anh chị sảnh thang máy rất là rộng",
    mustNotContain: ["TT Genesis", "T&T Genesis"],
  },
  {
    title: "only the misheard name changes in a mixed passage",
    transcript: "chalea khâu là một phân khu compound của khu đô thị Mizuki Park hiện tại thì đang nhận booking cho tòa tháp Chela Vista",
    mustContain: ["chalea khâu", "Mizuki Park", "Trellia Vista"],
    mustNotContain: ["Chela Vista"],
  },
  {
    title: "a misheard name of the other entity is fixed",
    transcript: "căn hộ Titi Genesis ở Nhà Bè có 2 phòng ngủ giá từ 4,3 tỷ",
    mustContain: ["Genesis", "4,3 tỷ"],
    mustNotContain: ["Titi Genesis"],
  },
  {
    title: "names outside the glossary are left alone",
    transcript: "bên trái này là sinh Ra Riverside còn bên phải là Sài Gòn SAO cả 2 dự án đều nằm trên Nguyễn Hữu Thọ",
    unchanged: true,
  },
];

const optionsSchema = z
  .object({
    cases: z.boolean(),
    text: z.string().min(1).optional(),
    file: z.string().min(1).optional(),
    videoId: z.string().min(1).optional(),
    name: z.array(z.string().min(1)),
    project: z.uuid().optional(),
    model: chatModelIdSchema.optional(),
    showText: z.boolean(),
  })
  .refine(
    (value) => [value.cases, value.text, value.file, value.videoId].filter(Boolean).length === 1,
    { message: "Choose one: --cases, --text, --file or --video-id." },
  )
  .refine((value) => !(value.name.length && value.project), {
    message: "Choose one: --name or --project.",
  })
  .refine((value) => !(value.text || value.file) || value.name.length > 0 || value.project, {
    message: "--text and --file need --name or --project.",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const program = new Command()
    .name(SCRIPT)
    .description("Try the LLM transcript correction with the real model (read-only).")
    .option("--cases", "Run the built-in cases", false)
    .option("--text <transcript>", "Transcript text")
    .option("--file <path>", "File with the transcript text")
    .option("--video-id <id>", "Stored TikTok video id")
    .option(
      "--name <name>",
      'Glossary term, aliases after "|" ("TT Genesis|T&T Genesis"); repeat for several',
      (value: string, previous: string[]) => [...previous, value],
      [] as string[],
    )
    .option("--project <uuid>", "Use this project's entities as the glossary")
    .option("--model <id>", `Model (default ${TRANSCRIPT_CORRECTION_CONFIG.model})`)
    .option("--show-text", "Print the whole corrected transcript", false);

  program.parse(commandArgv());
  return optionsSchema.parse(program.opts());
}

function parseNames(values: string[]): TranscriptGlossaryTerm[] {
  return values.map((value) => {
    const [name, ...aliases] = value.split("|").map((part) => part.trim());
    return { name, aliases: aliases.filter(Boolean) };
  });
}

async function loadProjectGlossary(projectId: string): Promise<TranscriptGlossaryTerm[]> {
  const rows = await db
    .select({ name: projectEntities.name, aliases: projectEntities.aliases })
    .from(projectEntities)
    .where(eq(projectEntities.projectId, projectId))
    .orderBy(asc(projectEntities.sortOrder));
  return rows.map((row) => ({ name: row.name, aliases: row.aliases }));
}

function around(text: string, phrase: string): string {
  const index = text.indexOf(phrase);
  if (index < 0) return "";
  const start = Math.max(0, index - CONTEXT_CHARS);
  const end = Math.min(text.length, index + phrase.length + CONTEXT_CHARS);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

async function runOne(params: {
  transcript: string;
  glossary: TranscriptGlossaryTerm[];
  language?: string | null;
  model?: ChatModelId;
  showText: boolean;
}) {
  const startedAt = Date.now();
  const result = await correctTranscript(params);
  const seconds = (Date.now() - startedAt) / 1000;

  console.log(`[${SCRIPT}] Result`, {
    model: params.model ?? TRANSCRIPT_CORRECTION_CONFIG.model,
    seconds,
    suggested: result.suggested,
    applied: result.applied.length,
    dropped: result.dropped.length,
  });
  for (const entry of result.applied) {
    console.log(`  ✓ ${entry.from} → ${entry.to} (${nameSimilarity(entry.from, entry.to).toFixed(2)})`);
    console.log(`      ${around(params.transcript, entry.from)}`);
  }
  for (const entry of result.dropped) {
    console.log(`  ✗ ${entry.from} → ${entry.to} (${nameSimilarity(entry.from, entry.to).toFixed(2)}, ${entry.reason})`);
    const context = around(params.transcript, entry.from);
    if (context) console.log(`      ${context}`);
  }
  if (params.showText) console.log(`[${SCRIPT}] Corrected text\n${result.text}`);
  return result;
}

async function runCases(model: ChatModelId | undefined) {
  console.log(`[${SCRIPT}] Glossary`, CASE_GLOSSARY);
  let failed = 0;

  for (const [index, testCase] of CASES.entries()) {
    console.log(`\n[${SCRIPT}] Case ${index + 1}/${CASES.length}: ${testCase.title}`);
    const result = await runOne({ transcript: testCase.transcript, glossary: CASE_GLOSSARY, model, showText: true });

    const problems = [
      ...(testCase.mustContain ?? []).filter((phrase) => !result.text.includes(phrase)).map((phrase) => `missing "${phrase}"`),
      ...(testCase.mustNotContain ?? []).filter((phrase) => result.text.includes(phrase)).map((phrase) => `still has "${phrase}"`),
      ...(testCase.unchanged && result.text !== testCase.transcript ? ["text changed"] : []),
    ];
    if (problems.length > 0) failed++;
    console.log(problems.length === 0 ? "  PASS" : `  FAIL: ${problems.join("; ")}`);
  }

  console.log(`\n[${SCRIPT}] ${CASES.length - failed}/${CASES.length} cases passed`);
  if (failed > 0) process.exitCode = 1;
}

async function runVideo(options: Options) {
  const [item] = await db
    .select({ id: contentItems.id, sourceId: contentItems.sourceId, text: contentItems.text, media: contentItems.media })
    .from(contentItems)
    .where(and(eq(contentItems.platform, "tiktok"), eq(contentItems.externalId, options.videoId!)))
    .limit(1);
  if (!item) throw new Error(`No stored TikTok video ${options.videoId}.`);

  const entry = item.media.find(
    (media): media is Extract<ContentItemMedia, { type: "transcript" }> => media.type === "transcript",
  );
  if (!entry) throw new Error(`Video ${options.videoId} has no transcript.`);

  const glossary = options.name.length
    ? parseNames(options.name)
    : options.project
      ? await loadProjectGlossary(options.project)
      : ((item.sourceId ? (await loadSourceGlossaries([item.sourceId])).get(item.sourceId) : undefined) ?? []);
  if (glossary.length === 0) throw new Error("No glossary: no project follows the video's source; pass --name or --project.");

  console.log(`[${SCRIPT}] Video`, {
    itemId: item.id,
    caption: item.text.slice(0, 120),
    language: entry.language,
    storedCorrection: entry.correction ?? null,
  });
  console.log(`[${SCRIPT}] Glossary`, glossary);
  await runOne({
    transcript: entry.rawText ?? entry.text,
    glossary,
    language: entry.language,
    model: options.model,
    showText: options.showText,
  });
}

async function main() {
  const options = parseArgs();

  if (options.cases) return runCases(options.model);
  if (options.videoId) return runVideo(options);

  const transcript = options.text ?? (await readFile(options.file!, "utf8"));
  const glossary = options.project ? await loadProjectGlossary(options.project) : parseNames(options.name);
  console.log(`[${SCRIPT}] Glossary`, glossary);
  await runOne({ transcript, glossary, model: options.model, showText: options.showText });
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(`[${SCRIPT}] Failed`, error instanceof Error ? error.message : error);
    process.exit(1);
  });
