import { eq } from "drizzle-orm";

import { workspaces } from "@/db/schema";
import { db } from "@/lib/db";

export async function resolveUniqueWorkspaceSlug(
  baseSlug: string,
  excludeWorkspaceId?: string,
): Promise<string> {
  const normalized = baseSlug.trim() || "workspace";
  let candidate = normalized;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1);

    if (!existing || existing.id === excludeWorkspaceId) {
      return candidate;
    }

    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }
}
