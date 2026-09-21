import { z } from "zod";

import { APIError } from "@/lib/exposers/api-error";

import {
  exaDefaultImageLinks,
  type ExaSearchParams,
  type ExaSearchResult,
} from "../types";

const exaSearchEndpoint = "https://api.exa.ai/search";

const exaSearchExtrasSchema = z
  .object({
    links: z.array(z.string()).optional(),
    imageLinks: z.array(z.string()).optional(),
  })
  .optional();

const exaSearchResultSchema = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  author: z.union([z.string(), z.null()]).optional(),
  publishedDate: z.union([z.string(), z.null()]).optional(),
  text: z.string().optional(),
  image: z.string().optional(),
  favicon: z.string().optional(),
  extras: exaSearchExtrasSchema,
});

const exaSearchResponseSchema = z.object({
  results: z.array(exaSearchResultSchema).optional(),
});

/**
 * Web search via Exa `/search` with page contents. Returns raw ranked
 * sources (URL + text snippet) so the research graph can evaluate, dedupe,
 * and cite them uniformly alongside internal chunks — unlike `/answer`,
 * which returns a pre-synthesized answer.
 */
export async function exaSearch(
  params: ExaSearchParams,
): Promise<ExaSearchResult> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    throw new APIError(
      "ERR_EXA_NOT_CONFIGURED",
      "Exa is not configured. Set EXA_API_KEY.",
      500,
    );
  }

  const query = params.query.trim();
  if (!query) {
    throw new APIError(
      "ERR_EXA_QUERY_REQUIRED",
      "A non-empty query is required.",
      400,
    );
  }

  const body: Record<string, unknown> = {
    query,
    type: "auto",
    numResults: params.numResults ?? 5,
    contents: {
      text: { maxCharacters: 2000 },
      extras: {
        imageLinks: exaDefaultImageLinks,
      },
    },
  };

  const excludeDomains = params.excludeDomains?.filter(Boolean);
  if (excludeDomains && excludeDomains.length > 0) {
    body.excludeDomains = excludeDomains;
  }

  const response = await fetch(exaSearchEndpoint, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let json: unknown;

  try {
    json = JSON.parse(responseText);
  } catch {
    throw new APIError(
      "ERR_EXA_INVALID_RESPONSE",
      `Exa returned non-JSON response (${response.status} ${response.statusText}).`,
      502,
    );
  }

  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof (json as { error?: unknown }).error === "string"
        ? (json as { error: string }).error
        : responseText.slice(0, 500);

    throw new APIError(
      "ERR_EXA_REQUEST_FAILED",
      `Exa search request failed: ${response.status} ${message}`,
      response.status >= 500 ? 502 : 400,
    );
  }

  const parsed = exaSearchResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new APIError(
      "ERR_EXA_INVALID_RESPONSE",
      "Exa returned an unexpected search payload.",
      502,
    );
  }

  return {
    results: parsed.data.results ?? [],
  };
}
