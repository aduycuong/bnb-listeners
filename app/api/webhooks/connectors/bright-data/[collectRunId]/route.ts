import { z } from "zod";

import { verifyBrightDataWebhookAuthorization } from "@/lib/bright-data/utils/verify-webhook-authorization";
import { NotFoundError } from "@/lib/common/service-errors";
import { handleBrightDataCollectWebhook } from "@/lib/connectors/services/handle-bright-data-collect-webhook";

type RouteContext = {
  params: Promise<{
    collectRunId: string;
  }>;
};

const routeParamsSchema = z.object({
  collectRunId: z.uuid(),
});

/** Bright Data result delivery for a `collect_runs` row. */
export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  if (!verifyBrightDataWebhookAuthorization(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = routeParamsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return Response.json({ error: "Invalid collect run id" }, { status: 400 });
  }

  try {
    await handleBrightDataCollectWebhook({
      collectRunId: parsedParams.data.collectRunId,
      body: await request.text(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    console.error("[webhooks:bright-data:collect] failed", {
      collectRunId: parsedParams.data.collectRunId,
      error,
    });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
