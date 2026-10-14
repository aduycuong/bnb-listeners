import { randomUUID } from "node:crypto";

import { personaPanelMembers, personaPanels } from "@/db/schema";
import { db } from "@/lib/db";

import type { PanelBody } from "../schema";
import type { PanelDetail } from "../types";
import { assertPersonasExist } from "./assert-personas-exist";
import { getPersonaPanel } from "./get-persona-panel";

/** Creates a panel and its members in one batch, so a panel never exists half-filled. */
export async function createPersonaPanel(params: PanelBody): Promise<PanelDetail> {
  await assertPersonasExist(params.members.map((member) => member.personaId));

  const id = randomUUID();

  await db.batch([
    db.insert(personaPanels).values({
      id,
      name: params.name,
      description: params.description,
    }),
    db.insert(personaPanelMembers).values(
      params.members.map((member) => ({
        panelId: id,
        personaId: member.personaId,
        weight: member.weight,
      })),
    ),
  ]);

  return getPersonaPanel({ id });
}
