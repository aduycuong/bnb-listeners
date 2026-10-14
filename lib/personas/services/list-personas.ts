import { asc, count, eq } from "drizzle-orm";

import { authors, personaPanelMembers, personas } from "@/db/schema";
import { db } from "@/lib/db";

import type { PersonaRow } from "../types";
import { toPersonaRow } from "../utils/to-persona-row";

/** Every persona with the number of panels using it and of synthetic authors it produced. */
export async function listPersonas(): Promise<{ items: PersonaRow[] }> {
  const [rows, panelCounts, authorCounts] = await Promise.all([
    db.select().from(personas).orderBy(asc(personas.name)),
    db
      .select({ personaId: personaPanelMembers.personaId, value: count() })
      .from(personaPanelMembers)
      .groupBy(personaPanelMembers.personaId),
    db
      .select({ personaId: authors.personaId, value: count() })
      .from(authors)
      .where(eq(authors.origin, "synthetic"))
      .groupBy(authors.personaId),
  ]);

  const panelsBy = new Map(panelCounts.map((row) => [row.personaId, row.value]));
  const authorsBy = new Map(authorCounts.map((row) => [row.personaId, row.value]));

  return {
    items: rows.map((persona) =>
      toPersonaRow(persona, {
        panelCount: panelsBy.get(persona.id) ?? 0,
        authorCount: authorsBy.get(persona.id) ?? 0,
      }),
    ),
  };
}
