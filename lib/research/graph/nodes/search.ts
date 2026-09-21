import { exaSearch } from "@/lib/exa/services/exa-search";
import { searchChunks } from "@/lib/retrieval/services/search-chunks";

import {
  RESEARCH_INTERNAL_LIMIT,
  RESEARCH_WEB_NUM_RESULTS,
} from "../../config";
import { enrichInternalFindings } from "../../services/enrich-internal-findings";
import type { Finding } from "../../types";
import type { ResearchGraphContext, ResearchStateType } from "../state";

async function searchInternal(
  workspaceId: string,
  query: string,
): Promise<Finding[]> {
  const chunks = await searchChunks({
    workspaceId,
    query,
    limit: RESEARCH_INTERNAL_LIMIT,
  });

  return enrichInternalFindings(chunks);
}

async function searchWeb(query: string): Promise<Finding[]> {
  try {
    const { results } = await exaSearch({
      query,
      numResults: RESEARCH_WEB_NUM_RESULTS,
    });

    return results
      .filter((result) => result.url && result.text?.trim())
      .map((result) => ({
        kind: "web" as const,
        ref: result.url as string,
        title: result.title?.trim() || (result.url as string),
        content: result.text!.trim(),
        publishedAt: result.publishedDate ?? null,
      }));
  } catch (error) {
    // Web research is best-effort; a failure must not abort the run.
    console.warn("[research] Exa search failed", error);
    return [];
  }
}

export function createSearchNode(ctx: ResearchGraphContext) {
  return async (
    state: ResearchStateType,
  ): Promise<Partial<ResearchStateType>> => {
    const pending = state.subQueries.filter(
      (query) => !state.searchedQueries.includes(query),
    );

    if (pending.length === 0) {
      return { searchedQueries: [] };
    }

    const findingLists = await Promise.all(
      pending.map(async (query) => {
        const tasks: Promise<Finding[]>[] = [
          searchInternal(ctx.workspaceId, query),
        ];
        if (ctx.webEnabled) {
          tasks.push(searchWeb(query));
        }
        const results = await Promise.all(tasks);
        return results.flat();
      }),
    );

    return {
      findings: findingLists.flat(),
      searchedQueries: pending,
    };
  };
}
