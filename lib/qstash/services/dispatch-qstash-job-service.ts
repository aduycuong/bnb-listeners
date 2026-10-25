import { APIError } from "@/lib/exposers/api-error";

import { qstashJobHandlers } from "../job-config";
import type {
  DispatchQstashJobParams,
  DispatchQstashJobResult,
} from "../types";

export async function dispatchQstashJobService(
  params: DispatchQstashJobParams,
): Promise<DispatchQstashJobResult> {
  const handler = qstashJobHandlers[params.jobName];

  if (!handler) {
    throw new APIError(
      "QSTASH_UNKNOWN_JOB",
      `Unknown QStash job: ${params.jobName}`,
      400,
    );
  }

  await handler(params.payload, { userId: params.userId });

  return { ok: true };
}
