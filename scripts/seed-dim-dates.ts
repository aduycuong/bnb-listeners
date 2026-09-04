// Seed the dim_dates calendar dimension table.
//
// Example:
//   npx tsx scripts/seed-dim-dates.ts --dry-run
//   npx tsx scripts/seed-dim-dates.ts --yes
//   npx tsx scripts/seed-dim-dates.ts --start-year 2020 --end-year 2040 --yes

import "dotenv/config";
import { z } from "zod";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { dimDates, type NewDimDate } from "@/db/schema";

const SCRIPT = "seed-dim-dates";
const BATCH_SIZE = 500;
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_START_YEAR = CURRENT_YEAR - 3;
const DEFAULT_END_YEAR = CURRENT_YEAR + 15;

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

const optionsSchema = z
  .object({
    startYear: z.coerce.number().int().min(2000).max(2100),
    endYear: z.coerce.number().int().min(2000).max(2100),
    dryRun: z.boolean(),
    yes: z.boolean(),
  })
  .refine((o) => o.startYear <= o.endYear, {
    message: "--start-year must be <= --end-year",
  })
  .refine((o) => !(o.dryRun && o.yes), {
    message: "Choose one: --dry-run or --yes",
  });

type Options = z.infer<typeof optionsSchema>;

function parseArgs(): Options {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npx tsx scripts/seed-dim-dates.ts [options]

Options:
  --start-year <year>   First year to seed (default: ${DEFAULT_START_YEAR})
  --end-year <year>     Last year to seed, inclusive (default: ${DEFAULT_END_YEAR})
  --dry-run             Preview row count without writing (default when neither flag given)
  --yes                 Apply the seed
  --help                Show this help

Examples:
  npx tsx scripts/seed-dim-dates.ts --dry-run
  npx tsx scripts/seed-dim-dates.ts --yes
  npx tsx scripts/seed-dim-dates.ts --start-year 2020 --end-year 2040 --yes
`);
    process.exit(0);
  }

  const raw: Record<string, string | boolean> = {
    startYear: String(DEFAULT_START_YEAR),
    endYear: String(DEFAULT_END_YEAR),
    dryRun: false,
    yes: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      raw.dryRun = true;
    } else if (arg === "--yes") {
      raw.yes = true;
    } else if (arg === "--start-year" && args[i + 1]) {
      raw.startYear = args[++i]!;
    } else if (arg === "--end-year" && args[i + 1]) {
      raw.endYear = args[++i]!;
    } else {
      console.error(`[${SCRIPT}] Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  // Default to dry-run when neither flag given
  if (!raw.dryRun && !raw.yes) {
    raw.dryRun = true;
  }

  const result = optionsSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      console.error(`[${SCRIPT}] ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Date math helpers — pure ISO 8601 calendar, no external dependencies
// ---------------------------------------------------------------------------

function toDateKey(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** ISO day of week: 1 = Monday … 7 = Sunday */
function isoDayOfWeek(d: Date): number {
  return ((d.getUTCDay() + 6) % 7) + 1;
}

/** ISO week number (1–53) — nearest-Thursday algorithm, no recursion */
function isoWeek(d: Date): number {
  // Work on a copy normalised to midnight UTC
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // Shift to the nearest Thursday (ISO weeks are defined by their Thursday)
  const dow = date.getUTCDay() || 7; // Sunday → 7
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  // Week number = ceil( (dayOfYear of that Thursday) / 7 )
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
}

/** Monday of the ISO week containing d */
function isoWeekStart(d: Date): Date {
  const dow = d.getUTCDay() || 7; // Sunday → 7; Mon=1 … Sat=6
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - (dow - 1));
  return start;
}

/** Day of year (1–366) */
function dayOfYear(d: Date): number {
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000) + 1;
}

function buildRow(d: Date): NewDimDate {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1–12
  const quarter = Math.ceil(month / 3); // 1–4
  const dow = isoDayOfWeek(d);
  const weekStart = isoWeekStart(d);
  const quarterStartMonth = (quarter - 1) * 3 + 1;

  return {
    dateKey: toDateKey(d),
    year,
    quarter,
    month,
    week: isoWeek(d),
    dayOfWeek: dow,
    dayOfYear: dayOfYear(d),
    isWeekend: dow >= 6,
    weekStart: toDateKey(weekStart),
    monthStart: `${year}-${String(month).padStart(2, "0")}-01`,
    quarterStart: `${year}-${String(quarterStartMonth).padStart(2, "0")}-01`,
    yearStart: `${year}-01-01`,
  };
}

function generateRows(startYear: number, endYear: number): NewDimDate[] {
  const rows: NewDimDate[] = [];
  const cursor = new Date(Date.UTC(startYear, 0, 1));
  const limit = new Date(Date.UTC(endYear + 1, 0, 1));

  while (cursor < limit) {
    rows.push(buildRow(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seedBatch(batch: NewDimDate[]): Promise<number> {
  const result = await db
    .insert(dimDates)
    .values(batch)
    .onConflictDoNothing({ target: dimDates.dateKey })
    .returning({ dateKey: dimDates.dateKey });
  return result.length;
}

async function main() {
  const options = parseArgs();
  const mode = options.yes ? "apply" : "dry-run";

  console.log(`[${SCRIPT}] Starting`, {
    startYear: options.startYear,
    endYear: options.endYear,
    mode,
  });

  const rows = generateRows(options.startYear, options.endYear);
  console.log(`[${SCRIPT}] Rows to seed: ${rows.length}`);

  if (options.dryRun) {
    console.log(
      `[${SCRIPT}] Dry-run — no changes written. Run with --yes to apply.`,
    );
    console.log(`[${SCRIPT}] Sample (first 3 rows):`, rows.slice(0, 3));
    return;
  }

  // Check existing count
  const [{ count: existing }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dimDates);
  console.log(`[${SCRIPT}] Existing rows in dim_dates: ${existing}`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const n = await seedBatch(batch);
    inserted += n;
    process.stdout.write(
      `\r[${SCRIPT}] Inserted ${inserted} / ${rows.length}`,
    );
  }

  console.log(`\n[${SCRIPT}] Done. Inserted: ${inserted} new rows (skipped ${rows.length - inserted} existing).`);
}

main().catch((error) => {
  console.error(`[${SCRIPT}] Failed`, { error });
  process.exit(1);
});
