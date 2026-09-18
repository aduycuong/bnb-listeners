import { documentTerms, terms } from "@/db/schema";
import { EMBEDDING_MODEL } from "@/lib/chunking/config";
import { CreateFailedError } from "@/lib/common/service-errors";
import { db } from "@/lib/db";

import type { CreatedTerm, ProposedTerm } from "../types";

const LLM_ASSIGNED_BY = "llm_classifier";

/**
 * Creates a term from an LLM proposal and assigns the source document.
 *
 * The proposal's embedding is stored with the term so it is immediately a
 * candidate for later documents without a second embedding request.
 */
export async function createAutoTerm(
  workspaceId: string,
  documentId: string,
  proposed: ProposedTerm,
  embedding: number[] | null,
): Promise<CreatedTerm> {
  const [term] = await db
    .insert(terms)
    .values({
      workspaceId,
      name: proposed.name.trim(),
      description: proposed.description.trim(),
      createdBy: LLM_ASSIGNED_BY,
      sourceDocumentId: documentId,
      embedding,
      embeddingModel: embedding ? EMBEDDING_MODEL : null,
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
