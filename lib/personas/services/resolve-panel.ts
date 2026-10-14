import { eq, or } from "drizzle-orm";
import { z } from "zod";

import { personaPanels } from "@/db/schema";
import { NotFoundError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

/** Finds a panel by id, `template_key` or exact name. */
export async function resolvePanel(
  ref: string,
): Promise<{ id: string; name: string }> {
  const conditions = [
    eq(personaPanels.templateKey, ref),
    eq(personaPanels.name, ref),
  ];
  if (z.uuid().safeParse(ref).success) {
    conditions.push(eq(personaPanels.id, ref));
  }

  const [panel] = await db
    .select({ id: personaPanels.id, name: personaPanels.name })
    .from(personaPanels)
    .where(or(...conditions))
    .limit(1);

  if (!panel) throw new NotFoundError("persona panel", ref);

  return panel;
}
