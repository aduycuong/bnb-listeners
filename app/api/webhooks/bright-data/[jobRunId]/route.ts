import { verifyBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/verify-webhook-authorization";
import { APIError } from "@/lib/exposers/api-error";
import { toAPIError } from "@/lib/exposers/to-api-error";
import { handleBrightDataJobWebhook } from "@/lib/jobs/services/handle-bright-data-webhook";
import { z } from "zod";

type RouteContext = {
  params: Promise<{
    jobRunId: string;
  }>;
};

const routeParamsSchema = z.object({
  jobRunId: z.uuid(),
});

function toErrorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    const message =
      first && "message" in first ? String(first.message) : "Invalid input";
    return Response.json({ error: message }, { status: 400 });
  }

  const apiError = error instanceof APIError ? error : toAPIError(error);
  if (apiError) {
    return Response.json(
      { error: apiError.code, message: apiError.message },
      { status: apiError.statusCode },
    );
  }

  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    if (
      !verifyBrightDataWebhookAuthorization(
        request.headers.get("authorization"),
      )
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobRunId } = routeParamsSchema.parse(await context.params);
    const payload = await request.json();

    await handleBrightDataJobWebhook({ jobRunId, payload });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
