import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { z } from "zod";

import { dispatchQstashJobService } from "@/lib/qstash/services/dispatch-qstash-job-service";
import { qstashJobEnvelopeSchema } from "@/lib/qstash/schema";

const callbackBodySchema = qstashJobEnvelopeSchema.or(
  z.object({
    jobName: z.string().min(1, "jobName is required"),
    payload: z.unknown().optional(),
    userId: z.string().optional(),
  }),
);

async function handler(req: Request): Promise<Response> {
  const json = await req.json();
  const envelope = callbackBodySchema.parse(json);

  await dispatchQstashJobService(envelope);

  return new Response("OK");
}

function isQstashSigningConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() &&
      process.env.QSTASH_NEXT_SIGNING_KEY?.trim(),
  );
}

let verifiedHandler: ((req: Request) => Promise<Response>) | null = null;

function getVerifiedHandler() {
  if (!verifiedHandler) {
    verifiedHandler = verifySignatureAppRouter(handler);
  }
  return verifiedHandler;
}

export async function POST(req: Request): Promise<Response> {
  if (isQstashSigningConfigured()) {
    return getVerifiedHandler()(req);
  }

  if (process.env.NODE_ENV === "production") {
    return new Response("QStash signing keys are not configured", {
      status: 503,
    });
  }

  return handler(req);
}
