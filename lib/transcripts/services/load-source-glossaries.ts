import { asc, eq, inArray } from "drizzle-orm";

import { projectEntities, projectSources } from "@/db/schema";
import { db } from "@/lib/db";

import type { TranscriptGlossaryTerm } from "../types";

/**
 * The names transcripts of each source are corrected against: the entities
 * (name and aliases) of every project following the source. A source no
 * project follows gets no entry.
 */
export async function loadSourceGlossaries(
  sourceIds: string[],
): Promise<Map<string, TranscriptGlossaryTerm[]>> {
  if (sourceIds.length === 0) return new Map();

  const rows = await db
    .select({
      sourceId: projectSources.sourceId,
      name: projectEntities.name,
      aliases: projectEntities.aliases,
    })
    .from(projectSources)
    .innerJoin(projectEntities, eq(projectEntities.projectId, projectSources.projectId))
    .where(inArray(projectSources.sourceId, [...new Set(sourceIds)]))
    .orderBy(asc(projectEntities.name));

  const glossaries = new Map<string, Map<string, Set<string>>>();
  for (const row of rows) {
    const terms = glossaries.get(row.sourceId) ?? new Map<string, Set<string>>();
    const aliases = terms.get(row.name) ?? new Set<string>();
    for (const alias of row.aliases) if (alias.trim() && alias !== row.name) aliases.add(alias.trim());
    terms.set(row.name, aliases);
    glossaries.set(row.sourceId, terms);
  }

  return new Map(
    [...glossaries].map(([sourceId, terms]) => [
      sourceId,
      [...terms].map(([name, aliases]) => ({ name, aliases: [...aliases].sort() })),
    ]),
  );
}
