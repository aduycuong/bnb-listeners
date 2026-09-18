/**
 * Text that gets embedded for a term. Name first so it dominates the vector;
 * the description adds disambiguating context when present.
 *
 * Used for both stored term embeddings and LLM-proposed terms so the two
 * sides of the similarity comparison are built the same way.
 */
export function buildTermEmbeddingText(term: {
  name: string;
  description: string | null | undefined;
}): string {
  const name = term.name.trim();
  const description = term.description?.trim();

  return description ? `${name}: ${description}` : name;
}
