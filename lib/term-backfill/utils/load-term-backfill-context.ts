import { and, eq } from "drizzle-orm";

import { terms } from "@/db/schema";
import { NotFoundError, UnknownServiceError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

export type TermBackfillContext = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  listeningStartedAt: Date;
  activeBackfillRunId: string | null;
};

export async function loadTermBackfillContext(
  termId: string,
  workspaceId: string,
): Promise<TermBackfillContext> {
  const [term] = await db
    .select({
      id: terms.id,
      workspaceId: terms.workspaceId,
      name: terms.name,
      description: terms.description,
      createdAt: terms.createdAt,
      listeningStartedAt: terms.listeningStartedAt,
      activeBackfillRunId: terms.activeBackfillRunId,
    })
    .from(terms)
    .where(and(eq(terms.id, termId), eq(terms.workspaceId, workspaceId)))
    .limit(1);

  if (!term) {
    throw new NotFoundError("term", termId);
  }

  return term;
}

export function assertValidBackfillListeningDate(
  newListeningStartedAt: Date,
  termCreatedAt: Date,
): void {
  if (newListeningStartedAt.getTime() > termCreatedAt.getTime()) {
    throw new UnknownServiceError(
      "Listening start date cannot be after the term created date.",
    );
  }
}
