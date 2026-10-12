import type { RouteFunction, WorkflowServeOptions } from "@upstash/workflow";
import { serve } from "@upstash/workflow/nextjs";

import { getWorkflowBaseUrl } from "./get-workflow-base-url";

function isQstashSigningConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() &&
      process.env.QSTASH_NEXT_SIGNING_KEY?.trim(),
  );
}

function readWorkflowBaseUrl(): string | undefined {
  try {
    return getWorkflowBaseUrl();
  } catch {
    return undefined;
  }
}

/** The SDK puts the server stack trace in error responses; keep only the message. */
async function stripErrorStack(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);

  if (!body || typeof body !== "object" || !("stack" in body)) {
    return response;
  }

  const rest = { ...(body as Record<string, unknown>) };
  delete rest.stack;
  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return Response.json(rest, { status: response.status, headers });
}

/**
 * Serves a workflow route. The SDK only verifies QStash signatures when the
 * signing keys are set, so production refuses requests without them instead
 * of running unverified.
 */
export function serveWorkflow<TInitialPayload, TResult = unknown>(
  name: string,
  routeFunction: RouteFunction<TInitialPayload, TResult>,
  options?: WorkflowServeOptions<TInitialPayload, TResult>,
): { POST: (request: Request) => Promise<Response> } {
  const { POST: handler } = serve(routeFunction, {
    // Read at module load; left undefined (SDK infers it) when unset so a
    // build without env vars can still import the route.
    baseUrl: readWorkflowBaseUrl(),
    failureFunction: ({ context, failStatus, failResponse }) => {
      console.error(`[workflow:${name}] failed`, {
        workflowRunId: context.workflowRunId,
        failStatus,
        failResponse,
      });
    },
    ...options,
  });

  return {
    POST: async (request) => {
      if (
        process.env.NODE_ENV === "production" &&
        !isQstashSigningConfigured()
      ) {
        return new Response("QStash signing keys are not configured", {
          status: 503,
        });
      }

      const response = await handler(request);

      return process.env.NODE_ENV === "production"
        ? stripErrorStack(response)
        : response;
    },
  };
}
