import type { Term } from "@/db/schema";

import type { TermListItem } from "../types";

export function toTermListItem(term: Term): TermListItem {
  return {
    id: term.id,
    name: term.name,
    description: term.description,
    createdBy: term.createdBy,
    sourceDocumentId: term.sourceDocumentId,
    listeningStartedAt: term.listeningStartedAt.toISOString(),
    activeBackfillRunId: term.activeBackfillRunId,
    createdAt: term.createdAt.toISOString(),
    updatedAt: term.updatedAt.toISOString(),
  };
}
