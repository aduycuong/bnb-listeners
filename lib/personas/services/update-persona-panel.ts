import { eq } from "drizzle-orm";

import { personaPanelMembers, personaPanels } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { PanelBody } from "../schema";
import type { PanelDetail } from "../types";
import { assertPersonasExist } from "./assert-personas-exist";
import { getPersonaPanel } from "./get-persona-panel";

/** Updates a panel and replaces its members in one batch. */
export async function updatePersonaPanel(
  params: PanelBody & { id: string },
): Promise<PanelDetail> {
  const [existing] = await db
    .select({ id: personaPanels.id })
    .from(personaPanels)
    .where(eq(personaPanels.id, params.id))
    .limit(1);

  if (!existing) throw new NotFoundError("persona panel", params.id);

  await assertPersonasExist(params.members.map((member) => member.personaId));

  await db.batch([
    db
      .update(personaPanels)
      .set({ name: params.name, description: params.description })
      .where(eq(personaPanels.id, params.id)),
    db
      .delete(personaPanelMembers)
      .where(eq(personaPanelMembers.panelId, params.id)),
    db.insert(personaPanelMembers).values(
      params.members.map((member) => ({
        panelId: params.id,
        personaId: member.personaId,
        weight: member.weight,
      })),
    ),
  ]);

  return getPersonaPanel({ id: params.id });
}
