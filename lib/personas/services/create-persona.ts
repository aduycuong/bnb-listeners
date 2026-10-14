import { personas } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { PersonaBody } from "../schema";
import type { PersonaRow } from "../types";
import { toPersonaRow } from "../utils/to-persona-row";

/** A hand-made persona; template personas come from the seed script. */
export async function createPersona(params: PersonaBody): Promise<PersonaRow> {
  const [persona] = await db
    .insert(personas)
    .values({
      name: params.name,
      kind: params.kind,
      description: params.description,
      tone: params.tone,
      concerns: params.concerns,
      reviewStatus: params.reviewStatus,
      source: "manual",
    })
    .returning();

  if (!persona) throw new CreateFailedError("persona");

  return toPersonaRow(persona, { panelCount: 0, authorCount: 0 });
}
