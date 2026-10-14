import { eq, sql } from "drizzle-orm";

import { personas } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { PersonaBody } from "../schema";
import type { PersonaRow } from "../types";
import { getPersona } from "./get-persona";

/**
 * Updates a persona and bumps its `version`, so runs made before the edit can
 * be told apart from runs made after it. Authors already created keep their
 * persona; only future text follows the new description and tone.
 */
export async function updatePersona(
  params: PersonaBody & { id: string },
): Promise<PersonaRow> {
  const updated = await db
    .update(personas)
    .set({
      name: params.name,
      kind: params.kind,
      description: params.description,
      tone: params.tone,
      concerns: params.concerns,
      reviewStatus: params.reviewStatus,
      version: sql`${personas.version} + 1`,
    })
    .where(eq(personas.id, params.id))
    .returning({ id: personas.id });

  if (updated.length === 0) throw new NotFoundError("persona", params.id);

  return getPersona({ id: params.id });
}
