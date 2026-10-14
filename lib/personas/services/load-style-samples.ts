import { and, eq, inArray, sql } from "drizzle-orm";

import { contentItems } from "@/db/schema";
import { db } from "@/lib/db";

import { SYNTHETIC_CONFIG } from "../config";
import type { SourceStyleSample } from "../types";

/**
 * A few real short comments of a source, picked at random, to show the model
 * how people in that group actually write.
 */
export async function loadStyleSamples(
  sourceId: string,
): Promise<SourceStyleSample[]> {
  const { fewShotCount, fewShotMinChars, fewShotMaxChars } = SYNTHETIC_CONFIG;

  const rows = await db
    .select({ text: contentItems.text })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.sourceId, sourceId),
        inArray(contentItems.kind, ["comment", "reply"]),
        sql`${contentItems.origin} <> 'synthetic'`,
        sql`char_length(${contentItems.text}) between ${fewShotMinChars} and ${fewShotMaxChars}`,
      ),
    )
    .orderBy(sql`random()`)
    .limit(fewShotCount);

  return rows;
}
