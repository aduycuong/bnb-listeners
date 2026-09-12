import { z } from "zod";

import { APIError } from "@/lib/exposers/api-error";

import type { ExaAnswerParams, ExaAnswerResult } from "../types";

const exaAnswerEndpoint = "https://api.exa.ai/answer";

const exaAnswerCitationSchema = z.object({
  id: z.string().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  author: z.union([z.string(), z.null()]).optional(),
  publishedDate: z.union([z.string(), z.null()]).optional(),
  text: z.string().optional(),
  image: z.string().optional(),
  favicon: z.string().optional(),
});

const exaAnswerResponseSchema = z.object({
  answer: z.union([z.string(), z.record(z.string(), z.unknown())]),
  citations: z.array(exaAnswerCitationSchema).optional(),
});

function normalizeAnswerText(
  answer: string | Record<string, unknown>,
): string {
  if (typeof answer === "string") {
    return answer.trim();
  }

  return JSON.stringify(answer, null, 2).trim();
}

export function isExaConfigured(): boolean {
  return Boolean(process.env.EXA_API_KEY?.trim());
}

export async function exaAnswer(
  params: ExaAnswerParams,
): Promise<ExaAnswerResult> {
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

  const systemPrompt = params.systemPrompt?.trim();
  const body: Record<string, unknown> = {
    query,
    text: params.text ?? true,
  };

  if (systemPrompt) {
    body.system_prompt = systemPrompt;
  }

  const response = await fetch(exaAnswerEndpoint, {
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
      `Exa answer request failed: ${response.status} ${message}`,
      response.status >= 500 ? 502 : 400,
    );
  }

  const parsed = exaAnswerResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new APIError(
      "ERR_EXA_INVALID_RESPONSE",
      "Exa returned an unexpected answer payload.",
      502,
    );
  }

  const answer = normalizeAnswerText(parsed.data.answer);
  if (!answer) {
    throw new APIError(
      "ERR_EXA_EMPTY_ANSWER",
      "Exa returned an empty answer.",
      502,
    );
  }

  return {
    answer,
    citations: parsed.data.citations ?? [],
  };
}
