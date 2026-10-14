/** Query `include` terms for an entity: name, aliases and ambiguous aliases, deduped case-insensitively. */
export function toQueryInclude(entity: {
  name: string;
  aliases: string[];
  ambiguousAliases?: string[];
}): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const raw of [entity.name, ...entity.aliases, ...(entity.ambiguousAliases ?? [])]) {
    const term = raw.trim();
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }

  return terms;
}
