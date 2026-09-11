import { documentTerms, terms } from "@/db/schema";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { CreatedTerm, ProposedTerm } from "../types";

const LLM_ASSIGNED_BY = "llm_classifier";

/**
 * Creates a term from an LLM proposal and assigns the source document.
 */
export async function createAutoTerm(
  workspaceId: string,
  documentId: string,
  proposed: ProposedTerm,
): Promise<CreatedTerm> {
  const [term] = await db
    .insert(terms)
    .values({
      workspaceId,
      name: proposed.name.trim(),
      description: proposed.description.trim(),
      createdBy: LLM_ASSIGNED_BY,
      sourceDocumentId: documentId,
    })
    .returning({
      id: terms.id,
      name: terms.name,
    });

  if (!term) {
    throw new CreateFailedError("term");
  }

  await db
    .insert(documentTerms)
    .values({
      documentId,
      termId: term.id,
      confidence: 1,
      assignedBy: LLM_ASSIGNED_BY,
    })
    .onConflictDoNothing();

  return term;
}
