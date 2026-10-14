import type { ProjectQuery } from "@/db/schema";

import { compileTerm, type CompiledTerm } from "./compile-term";

export type CompiledQuery = {
  id: string;
  entityId: string | null;
  include: CompiledTerm[];
  withTerms: CompiledTerm[];
  exclude: CompiledTerm[];
  proximity: number | null;
  /** Include terms whose match alone needs tier 2 confirmation. */
  ambiguous: Set<string>;
};

function compileAll(terms: string[]): CompiledTerm[] {
  return terms.map(compileTerm).filter((term) => term !== null);
}

export function compileQuery(
  query: Pick<
    ProjectQuery,
    "id" | "entityId" | "include" | "withTerms" | "exclude" | "proximity" | "ambiguous"
  >,
): CompiledQuery {
  return {
    id: query.id,
    entityId: query.entityId,
    include: compileAll(query.include),
    withTerms: compileAll(query.withTerms),
    exclude: compileAll(query.exclude),
    proximity: query.proximity,
    ambiguous: new Set(query.ambiguous.map((term) => term.toLocaleLowerCase("vi"))),
  };
}
