import { getQstashClient } from "../utils/get-qstash-client";
import { getCallbackUrl } from "../utils/get-callback-url";
import type { AddJobParams, AddJobResult } from "../types";

export async function addJob(params: AddJobParams): Promise<AddJobResult> {
  const client = getQstashClient();
  const callbackUrl = getCallbackUrl();

  const res = await client.publishJSON({
    url: callbackUrl,
    body: {
      jobName: params.jobName,
      payload: params.payload,
      userId: params.userId,
    },
    delay: params.delay,
    ...(params.flowControl && { flowControl: params.flowControl }),
  });

  return {
    messageId: res.messageId,
  };
}
