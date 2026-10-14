import { count, eq } from "drizzle-orm";

import { authors, personaPanelMembers, personas } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { PersonaRow } from "../types";
import { toPersonaRow } from "../utils/to-persona-row";

export async function getPersona(params: { id: string }): Promise<PersonaRow> {
  const [persona] = await db
    .select()
    .from(personas)
    .where(eq(personas.id, params.id))
    .limit(1);

  if (!persona) throw new NotFoundError("persona", params.id);

  const [[panels], [authorRows]] = await Promise.all([
    db
      .select({ value: count() })
      .from(personaPanelMembers)
      .where(eq(personaPanelMembers.personaId, persona.id)),
    db
      .select({ value: count() })
      .from(authors)
      .where(eq(authors.personaId, persona.id)),
  ]);

  return toPersonaRow(persona, {
    panelCount: panels?.value ?? 0,
    authorCount: authorRows?.value ?? 0,
  });
}
